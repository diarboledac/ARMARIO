/**
 * migrate-wardrowbe-fase-a.mjs
 * Fase A — Metadatos de prendas y filtros avanzados.
 *
 * Añade a `prendas`:
 *  - temporada ENUM(...) NOT NULL DEFAULT 'todas'
 *  - ocasion  ENUM(...) NOT NULL DEFAULT 'todas'
 *  - patron   ENUM(...) NOT NULL DEFAULT 'liso'
 *  - estado   ENUM(...) NOT NULL DEFAULT 'limpia'
 *  - veces_usada INT UNSIGNED NOT NULL DEFAULT 0
 *  - precio DECIMAL(8,2) NULL
 * e índices en temporada, ocasion y estado.
 *
 * Es idempotente: consulta INFORMATION_SCHEMA antes de cada ALTER TABLE.
 * No borra datos ni imprime credenciales.
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

  const connection = await mysql.createConnection(
    parseDatabaseUrl(env.DATABASE_URL)
  );

  try {
    console.log("Conexión establecida ✅");

    const columnas = [
      {
        nombre: "temporada",
        definicion:
          "ENUM('primavera','verano','otono','invierno','todas') NOT NULL DEFAULT 'todas'",
      },
      {
        nombre: "ocasion",
        definicion:
          "ENUM('casual','formal','deporte','salida','trabajo','todas') NOT NULL DEFAULT 'todas'",
      },
      {
        nombre: "patron",
        definicion:
          "ENUM('liso','rayas','cuadros','flores','geometrico','otro') NOT NULL DEFAULT 'liso'",
      },
      {
        nombre: "estado",
        definicion: "ENUM('limpia','para_lavar') NOT NULL DEFAULT 'limpia'",
      },
      {
        nombre: "veces_usada",
        definicion: "INT UNSIGNED NOT NULL DEFAULT 0",
      },
      {
        nombre: "precio",
        definicion: "DECIMAL(8,2) NULL",
      },
    ];

    for (const col of columnas) {
      const existe = await columnInfo(connection, "prendas", col.nombre);
      if (existe) {
        console.log(`prendas.${col.nombre} ya existe ✅`);
        continue;
      }
      await connection.execute(
        `ALTER TABLE prendas ADD COLUMN ${col.nombre} ${col.definicion}`
      );
      console.log(`prendas.${col.nombre} añadida ✅`);
    }

    for (const indice of [
      "idx_prendas_temporada",
      "idx_prendas_ocasion",
      "idx_prendas_estado",
    ]) {
      if (await indexExists(connection, "prendas", indice)) {
        console.log(`Índice ${indice} ya existe ✅`);
        continue;
      }
      const columna = indice.replace("idx_prendas_", "");
      await connection.execute(
        `ALTER TABLE prendas ADD INDEX ${indice} (${columna})`
      );
      console.log(`Índice ${indice} creado ✅`);
    }

    const [cols] = await connection.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prendas'
       ORDER BY ORDINAL_POSITION`
    );
    console.log("\nprendas:");
    for (const c of cols) {
      console.log(`  - ${c.COLUMN_NAME} ${c.COLUMN_TYPE} default=${c.COLUMN_DEFAULT}`);
    }

    const [counts] = await connection.execute(
      "SELECT COUNT(*) AS prendas FROM prendas"
    );
    console.log(`Datos conservados: ${counts[0].prendas} prendas`);

    console.log("\n✅ Fase A completada sin borrar datos");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("❌ Error en la migración Fase A:", error.message);
  process.exit(1);
});
