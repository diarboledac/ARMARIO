/**
 * migrate-wardrowbe-fase-d.mjs
 * Fase D — Constructor visual de looks / collage.
 *
 * Añade:
 *  - look_prendas.slot ENUM(...) NOT NULL DEFAULT 'completo'
 *  - look_prendas.posicion TINYINT UNSIGNED NOT NULL DEFAULT 0
 *  - looks.collage_url VARCHAR(500) NULL
 *  - looks.ocasion ENUM(...) NOT NULL DEFAULT 'todas'
 *  - looks.descripcion TEXT NULL
 *  - looks.es_favorito TINYINT(1) NOT NULL DEFAULT 0
 *
 * Es idempotente y no borra datos.
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
    `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0] ?? null;
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

const COLUMNAS = {
  look_prendas: [
    {
      nombre: "slot",
      definicion:
        "ENUM('superior','inferior','calzado','complemento','completo') NOT NULL DEFAULT 'completo'",
    },
    {
      nombre: "posicion",
      definicion: "TINYINT UNSIGNED NOT NULL DEFAULT 0",
    },
  ],
  looks: [
    { nombre: "collage_url", definicion: "VARCHAR(500) NULL" },
    {
      nombre: "ocasion",
      definicion:
        "ENUM('casual','formal','deporte','salida','trabajo','todas') NOT NULL DEFAULT 'todas'",
    },
    { nombre: "descripcion", definicion: "TEXT NULL" },
    { nombre: "es_favorito", definicion: "TINYINT(1) NOT NULL DEFAULT 0" },
  ],
};

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

    for (const [tabla, columnas] of Object.entries(COLUMNAS)) {
      console.log(`\n${tabla}:`);
      for (const col of columnas) {
        const existe = await columnInfo(connection, tabla, col.nombre);
        if (existe) {
          console.log(`  ${col.nombre} ya existe ✅`);
          continue;
        }
        await connection.execute(
          `ALTER TABLE ${tabla} ADD COLUMN ${col.nombre} ${col.definicion}`
        );
        console.log(`  ${col.nombre} añadida ✅`);
      }
    }

    if (await indexExists(connection, "looks", "idx_looks_favorito")) {
      console.log("\nÍndice idx_looks_favorito ya existe ✅");
    } else {
      await connection.execute(
        "ALTER TABLE looks ADD INDEX idx_looks_favorito (usuario_id, es_favorito)"
      );
      console.log("Índice idx_looks_favorito creado ✅");
    }

    for (const tabla of ["look_prendas", "looks"]) {
      const [cols] = await connection.execute(
        `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [tabla]
      );
      console.log(`\n${tabla}:`);
      for (const c of cols) {
        console.log(
          `  - ${c.COLUMN_NAME} ${c.COLUMN_TYPE} null=${c.IS_NULLABLE} default=${c.COLUMN_DEFAULT}`
        );
      }
    }

    const [counts] = await connection.execute(
      "SELECT (SELECT COUNT(*) FROM looks) AS looks, (SELECT COUNT(*) FROM look_prendas) AS look_prendas"
    );
    console.log(
      `\nDatos conservados: ${counts[0].looks} looks, ${counts[0].look_prendas} look_prendas`
    );

    console.log("\n✅ Fase D completada sin borrar datos");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("❌ Error en la migración Fase D:", error.message);
  process.exit(1);
});
