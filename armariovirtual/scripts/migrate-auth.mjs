/**
 * migrate-auth.mjs
 * Migración idempotente para el sistema multi-usuario:
 *  - usuarios.password_hash VARCHAR(255) NULL
 *  - usuarios.email nullable (el registro solo pide nombre + contraseña)
 *  - índice UNIQUE en usuarios.nombre (identificador de login)
 *  - prendas.color VARCHAR(30) NULL
 *  - tabla sesiones (token hasheado, expiración y FK a usuarios)
 *
 * No elimina datos existentes. Puede ejecutarse varias veces sin efectos
 * secundarios. Nunca imprime DATABASE_URL ni credenciales.
 */

import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";

const ENV_PATH = path.resolve(".env.local");

function parseEnvFile(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function parseDatabaseUrl(url) {
  const u = new URL(url);
  if (u.protocol !== "mysql:") {
    throw new Error("DATABASE_URL debe usar el protocolo mysql://");
  }
  const sslMode = u.searchParams.get("ssl-mode");
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    database: u.pathname.replace(/^\//, ""),
    ssl: sslMode === "REQUIRED" ? { rejectUnauthorized: false } : undefined,
  };
}

async function columnInfo(connection, table, column) {
  const [rows] = await connection.execute(
    `SELECT COLUMN_NAME, IS_NULLABLE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0] ?? null;
}

async function indexExists(connection, table, indexName) {
  const [rows] = await connection.execute(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
     LIMIT 1`,
    [table, indexName]
  );
  return rows.length > 0;
}

async function main() {
  const env = parseEnvFile(ENV_PATH);
  if (!env.DATABASE_URL) {
    console.error("[ERROR] Falta DATABASE_URL en .env.local");
    process.exit(1);
  }

  const config = parseDatabaseUrl(env.DATABASE_URL);
  console.log(`Conectando a ${config.host}:${config.port} / ${config.database} ...`);

  const connection = await mysql.createConnection(config);
  try {
    console.log("Conexión establecida ✅");

    // 1) usuarios.password_hash
    const passwordCol = await columnInfo(connection, "usuarios", "password_hash");
    if (!passwordCol) {
      await connection.execute(
        "ALTER TABLE usuarios ADD COLUMN password_hash VARCHAR(255) NULL AFTER email"
      );
      console.log("usuarios.password_hash añadida ✅");
    } else {
      console.log("usuarios.password_hash ya existe ✅");
    }

    // 2) usuarios.email nullable
    const emailCol = await columnInfo(connection, "usuarios", "email");
    if (emailCol && emailCol.IS_NULLABLE === "NO") {
      await connection.execute(
        "ALTER TABLE usuarios MODIFY COLUMN email VARCHAR(255) NULL"
      );
      console.log("usuarios.email ahora es nullable ✅");
    } else {
      console.log("usuarios.email ya es nullable ✅");
    }

    // 3) Índice UNIQUE en usuarios.nombre
    if (!(await indexExists(connection, "usuarios", "uq_usuarios_nombre"))) {
      const [duplicados] = await connection.execute(
        `SELECT nombre, COUNT(*) AS total
         FROM usuarios
         GROUP BY nombre
         HAVING total > 1`
      );
      if (duplicados.length > 0) {
        throw new Error(
          "Hay nombres de usuario duplicados. Renómbralos antes de aplicar el índice UNIQUE."
        );
      }
      await connection.execute(
        "ALTER TABLE usuarios ADD UNIQUE INDEX uq_usuarios_nombre (nombre)"
      );
      console.log("Índice UNIQUE usuarios.nombre creado ✅");
    } else {
      console.log("Índice UNIQUE usuarios.nombre ya existe ✅");
    }

    // 4) prendas.color
    const colorCol = await columnInfo(connection, "prendas", "color");
    if (!colorCol) {
      await connection.execute(
        "ALTER TABLE prendas ADD COLUMN color VARCHAR(30) NULL AFTER descripcion"
      );
      console.log("prendas.color añadida ✅");
    } else {
      console.log("prendas.color ya existe ✅");
    }

    // 5) tabla sesiones
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sesiones (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
        usuario_id INT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_sesiones_usuario (usuario_id),
        INDEX idx_sesiones_expira (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("Tabla `sesiones` creada/verificada ✅");

    // Resumen final
    const [cols] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' ORDER BY ORDINAL_POSITION`
    );
    console.log(`usuarios: ${cols.map((c) => c.COLUMN_NAME).join(", ")}`);

    const [counts] = await connection.execute(
      "SELECT (SELECT COUNT(*) FROM usuarios) AS usuarios, (SELECT COUNT(*) FROM prendas) AS prendas"
    );
    console.log(`Datos conservados: ${counts[0].usuarios} usuarios, ${counts[0].prendas} prendas`);

    console.log("\n✅ Migración completada sin borrar datos");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("❌ Error en la migración:", error.message);
  process.exit(1);
});
