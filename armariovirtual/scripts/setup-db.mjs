/**
 * setup-db.mjs
 * Conecta a MySQL (Aiven) usando DATABASE_URL de .env.local, crea el esquema
 * inicial si no existe y ejecuta el seed inicial (categorías + usuario por defecto).
 * NUNCA imprime el valor de DATABASE_URL ni credenciales.
 */

import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

const ENV_PATH = path.resolve('.env.local');

// Claves esperadas
const REQUIRED_KEYS = ['DATABASE_URL'];

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
  // mysql://user:password@host:port/database?ssl-mode=REQUIRED
  const m = url.match(
    /^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)(\?ssl-mode=REQUIRED)?$/
  );
  if (!m) {
    throw new Error('DATABASE_URL tiene un formato inesperado');
  }
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

  for (const key of REQUIRED_KEYS) {
    if (!(key in env) || env[key] === '') {
      console.error(`[ERROR] Falta o está vacía la variable ${key} en .env.local`);
      process.exit(1);
    }
  }

  // Confirmar presencia sin mostrar el secreto
  console.log('DATABASE_URL: **** (presente en .env.local)');

  const config = parseDatabaseUrl(env.DATABASE_URL);
  console.log(`Conectando a ${config.host}:${config.port} / ${config.database} ...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Conexión establecida ✅');

    // 1. Crear tabla usuarios
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(255) NULL UNIQUE,
        password_hash VARCHAR(255) NULL,
        foto_base_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_usuarios_nombre (nombre)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla `usuarios` creada/verificada ✅');

    // 1b. Sesiones (cookie HttpOnly -> token hasheado en MySQL)
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
    console.log('Tabla `sesiones` creada/verificada ✅');

    // 2. Crear tabla categorias
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla `categorias` creada/verificada ✅');

    // 3. Crear tabla prendas
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS prendas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        categoria_id INT NOT NULL,
        nombre VARCHAR(150) NOT NULL,
        descripcion TEXT NULL,
        color VARCHAR(30) NULL,
        temporada ENUM('primavera','verano','otono','invierno','todas') NOT NULL DEFAULT 'todas',
        ocasion ENUM('casual','formal','deporte','salida','trabajo','todas') NOT NULL DEFAULT 'todas',
        patron ENUM('liso','rayas','cuadros','flores','geometrico','otro') NOT NULL DEFAULT 'liso',
        estado ENUM('limpia','para_lavar') NOT NULL DEFAULT 'limpia',
        veces_usada INT UNSIGNED NOT NULL DEFAULT 0,
        precio DECIMAL(8,2) NULL,
        imagen_url VARCHAR(500) NOT NULL,
        imagen_sin_fondo_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
        INDEX idx_prendas_usuario (usuario_id),
        INDEX idx_prendas_categoria (categoria_id),
        INDEX idx_prendas_temporada (temporada),
        INDEX idx_prendas_ocasion (ocasion),
        INDEX idx_prendas_estado (estado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla `prendas` creada/verificada ✅');

    // 4. Crear tabla looks
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS looks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        nombre VARCHAR(150) NOT NULL,
        montaje_url VARCHAR(500) NULL,
        collage_url VARCHAR(500) NULL,
        ocasion ENUM('casual','formal','deporte','salida','trabajo','todas') NOT NULL DEFAULT 'todas',
        descripcion TEXT NULL,
        es_favorito TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        INDEX idx_looks_usuario (usuario_id),
        INDEX idx_looks_favorito (usuario_id, es_favorito)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla `looks` creada/verificada ✅');

    // 5. Crear tabla intermedia look_prendas (muchos a muchos)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS look_prendas (
        look_id INT NOT NULL,
        prenda_id INT NOT NULL,
        slot ENUM('superior','inferior','calzado','complemento','completo') NOT NULL DEFAULT 'completo',
        posicion TINYINT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (look_id, prenda_id),
        FOREIGN KEY (look_id) REFERENCES looks(id) ON DELETE CASCADE,
        FOREIGN KEY (prenda_id) REFERENCES prendas(id) ON DELETE CASCADE,
        INDEX idx_look_prendas_prenda (prenda_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla `look_prendas` creada/verificada ✅');

    // 5b. Registros de uso (wear tracking)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS registros_uso (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        prenda_id INT NULL,
        look_id INT NULL,
        usado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (prenda_id) REFERENCES prendas(id) ON DELETE SET NULL,
        FOREIGN KEY (look_id) REFERENCES looks(id) ON DELETE SET NULL,
        INDEX idx_registros_uso_usuario_fecha (usuario_id, usado_en),
        INDEX idx_registros_uso_prenda (prenda_id),
        INDEX idx_registros_uso_look (look_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla `registros_uso` creada/verificada ✅');

    // 6. Crear tabla favoritos
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS favoritos (
        usuario_id INT NOT NULL,
        prenda_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (usuario_id, prenda_id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (prenda_id) REFERENCES prendas(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Tabla `favoritos` creada/verificada ✅');

    // --- SEED INICIAL ---

    // Seed: categorías de prendas
    const categorias = [
      { nombre: 'Camisetas', slug: 'camisetas' },
      { nombre: 'Pantalones', slug: 'pantalones' },
      { nombre: 'Vestidos', slug: 'vestidos' },
      { nombre: 'Chaquetas', slug: 'chaquetas' },
      { nombre: 'Zapatos', slug: 'zapatos' },
      { nombre: 'Accesorios', slug: 'accesorios' },
    ];
    for (const cat of categorias) {
      await connection.execute(
        'INSERT IGNORE INTO categorias (nombre, slug) VALUES (?, ?)',
        [cat.nombre, cat.slug]
      );
    }
    console.log(`Seed: ${categorias.length} categorías insertadas ✅`);

    // Seed: usuario por defecto
    const [existing] = await connection.execute(
      'SELECT id FROM usuarios WHERE email = ?',
      ['usuario@ejemplo.com']
    );
    if (existing.length === 0) {
      await connection.execute(
        'INSERT INTO usuarios (nombre, email, foto_base_url) VALUES (?, ?, ?)',
        ['Usuario Por Defecto', 'usuario@ejemplo.com', null]
      );
      console.log('Seed: usuario por defecto insertado ✅');
    } else {
      console.log('Seed: usuario por defecto ya existe ✅');
    }

    // --- VERIFICACIÓN ---

    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
      [config.database]
    );
    console.log(`\nTablas en ${config.database}:`);
    for (const t of tables) {
      console.log(`  - ${t.TABLE_NAME}`);
    }

    const [countUsuarios] = await connection.execute('SELECT COUNT(*) AS c FROM usuarios');
    const [countCategorias] = await connection.execute('SELECT COUNT(*) AS c FROM categorias');
    console.log(`\nUsuarios: ${countUsuarios[0].c}`);
    console.log(`Categorías: ${countCategorias[0].c}`);

    console.log('\n✅ Esquema y seed completados exitosamente');
  } catch (err) {
    console.error('❌ Error configurando la base de datos:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main();
