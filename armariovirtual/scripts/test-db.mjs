/**
 * test-db.mjs
 * Prueba rápida de conexión y consultas parametrizadas a MySQL (Aiven).
 * Usa directamente mysql2/promise (sin TypeScript) para evitar problemas de transpilación.
 * NUNCA imprime secretos.
 */

import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

const ENV_PATH = path.resolve('.env.local');

function parseEnvFile(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    vars[key] = value;
  }
  return vars;
}

function parseDatabaseUrl(url) {
  const m = url.match(
    /^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)(\?ssl-mode=REQUIRED)?$/
  );
  if (!m) throw new Error('DATABASE_URL tiene un formato inesperado');
  return {
    user: m[1],
    password: m[2],
    host: m[3],
    port: Number(m[4]),
    database: m[5],
    ssl: m[6] ? { rejectUnauthorized: false } : undefined,
  };
}

async function main() {
  const env = parseEnvFile(ENV_PATH);
  if (!env.DATABASE_URL) {
    console.error('[ERROR] DATABASE_URL no definido');
    process.exit(1);
  }

  console.log('DATABASE_URL: **** (presente)');
  const config = parseDatabaseUrl(env.DATABASE_URL);
  console.log(`Conectando a ${config.host}:${config.port} / ${config.database} ...\n`);

  const connection = await mysql.createConnection(config);

  try {
    // 1. Listar categorías (consulta parametrizada)
    const [categorias] = await connection.execute(
      'SELECT id, nombre, slug FROM categorias ORDER BY nombre ASC'
    );
    console.log(`Categorías (${categorias.length}):`);
    for (const c of categorias) {
      console.log(`  - ${c.id}: ${c.nombre} (${c.slug})`);
    }

    // 2. Buscar usuario por email (consulta parametrizada)
    const [usuarios] = await connection.execute(
      'SELECT id, nombre, email, foto_base_url FROM usuarios WHERE email = ? LIMIT 1',
      ['usuario@ejemplo.com']
    );
    const usuario = usuarios[0];
    console.log(
      `\nUsuario: ${usuario ? `${usuario.nombre} (${usuario.email})` : 'no encontrado'}`
    );

    if (usuario) {
      // 3. Prendas del usuario (consulta parametrizada)
      const [prendas] = await connection.execute(
        'SELECT id, nombre FROM prendas WHERE usuario_id = ? ORDER BY created_at DESC',
        [usuario.id]
      );
      console.log(`Prendas del usuario: ${prendas.length}`);

      // 4. Looks del usuario (consulta parametrizada)
      const [looks] = await connection.execute(
        'SELECT id, nombre FROM looks WHERE usuario_id = ? ORDER BY created_at DESC',
        [usuario.id]
      );
      console.log(`Looks del usuario: ${looks.length}`);

      // 5. Favoritos del usuario (consulta parametrizada)
      const [favoritos] = await connection.execute(
        'SELECT prenda_id FROM favoritos WHERE usuario_id = ?',
        [usuario.id]
      );
      console.log(`Favoritos del usuario: ${favoritos.length}`);
    }

    console.log('\n✅ Todas las consultas parametrizadas funcionan correctamente');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ Error en prueba de BD:', err.message);
  process.exit(1);
});
