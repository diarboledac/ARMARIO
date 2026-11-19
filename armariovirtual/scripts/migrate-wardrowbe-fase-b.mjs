/**
 * migrate-wardrowbe-fase-b.mjs
 * Fase B — Seguimiento de uso (wear tracking).
 *
 * Crea la tabla `registros_uso` con FKs a usuarios, prendas y looks.
 * Es idempotente: no falla si la tabla ya existe y no borra datos.
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

async function tableExists(connection, table) {
  const [rows] = await connection.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function columnExists(connection, table, column) {
  const [rows] = await connection.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function indexExists(connection, table, indexName) {
  const [rows] = await connection.execute(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
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

  const connection = await mysql.createConnection(
    parseDatabaseUrl(env.DATABASE_URL)
  );

  try {
    console.log("Conexión establecida ✅");

    if (await tableExists(connection, "registros_uso")) {
      console.log("Tabla registros_uso ya existe ✅");
    } else {
      await connection.execute(`
        CREATE TABLE registros_uso (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          usuario_id INT NOT NULL,
          prenda_id INT NULL,
          look_id INT NULL,
          usado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_registros_uso_usuario_fecha (usuario_id, usado_en),
          KEY idx_registros_uso_prenda (prenda_id),
          KEY idx_registros_uso_look (look_id),
          CONSTRAINT fk_registros_uso_usuario
            FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
          CONSTRAINT fk_registros_uso_prenda
            FOREIGN KEY (prenda_id) REFERENCES prendas (id) ON DELETE SET NULL,
          CONSTRAINT fk_registros_uso_look
            FOREIGN KEY (look_id) REFERENCES looks (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("Tabla registros_uso creada ✅");
    }

    // Refuerzo idempotente por si la tabla existía con un esquema parcial.
    for (const [columna, definicion] of [
      ["usuario_id", "INT NOT NULL"],
      ["prenda_id", "INT NULL"],
      ["look_id", "INT NULL"],
      ["usado_en", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"],
      ["created_at", "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ]) {
      if (await columnExists(connection, "registros_uso", columna)) {
        console.log(`registros_uso.${columna} ya existe ✅`);
        continue;
      }
      await connection.execute(
        `ALTER TABLE registros_uso ADD COLUMN ${columna} ${definicion}`
      );
      console.log(`registros_uso.${columna} añadida ✅`);
    }

    for (const [indice, definicion] of [
      ["idx_registros_uso_usuario_fecha", "(usuario_id, usado_en)"],
      ["idx_registros_uso_prenda", "(prenda_id)"],
      ["idx_registros_uso_look", "(look_id)"],
    ]) {
      if (await indexExists(connection, "registros_uso", indice)) {
        console.log(`Índice ${indice} ya existe ✅`);
        continue;
      }
      await connection.execute(
        `ALTER TABLE registros_uso ADD INDEX ${indice} ${definicion}`
      );
      console.log(`Índice ${indice} creado ✅`);
    }

    const [cols] = await connection.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'registros_uso'
       ORDER BY ORDINAL_POSITION`
    );
    console.log("\nregistros_uso:");
    for (const c of cols) {
      console.log(
        `  - ${c.COLUMN_NAME} ${c.COLUMN_TYPE} null=${c.IS_NULLABLE} default=${c.COLUMN_DEFAULT}`
      );
    }

    const [counts] = await connection.execute(
      "SELECT COUNT(*) AS registros FROM registros_uso"
    );
    console.log(`Registros actuales: ${counts[0].registros}`);

    console.log("\n✅ Fase B completada sin borrar datos");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("❌ Error en la migración Fase B:", error.message);
  process.exit(1);
});
