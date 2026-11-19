/**
 * Cliente de conexión a MySQL (Aiven) para armariovirtual.
 * - Usa DATABASE_URL de .env.local (never secrets in code).
 * - Todas las consultas son parametrizadas (protección contra SQL injection).
 * - Diseñado para usarse desde Server Components (Next.js App Router).
 */

import mysql, {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

type DbParams = Array<string | number | bigint | Date | Buffer | null>;

import type {
  Usuario,
  Categoria,
  Prenda,
  Look,
  PrendaDeLook,
  RegistroUso,
  Favorito,
  UsuarioInput,
  PrendaInput,
  LookInput,
  LookPrendaInput,
  CategoriaInput,
  Temporada,
  Ocasion,
  Patron,
  EstadoPrenda,
} from './types';

function parseDatabaseUrl(url: string): mysql.ConnectionOptions {
  // mysql://user:password@host:port/database?ssl-mode=REQUIRED
  const u = new URL(url);
  if (u.protocol !== 'mysql:') {
    throw new Error('DATABASE_URL debe usar el protocolo mysql://');
  }
  const sslMode = u.searchParams.get('ssl-mode');
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    database: u.pathname.replace(/^\//, ''),
    ssl: sslMode === 'REQUIRED' ? { rejectUnauthorized: false } : undefined,
  } as mysql.ConnectionOptions;
}

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL no está definido en el entorno');
    }
    const config = parseDatabaseUrl(databaseUrl);
    pool = mysql.createPool(config);
  }
  return pool;
}

export async function getConnection(): Promise<PoolConnection> {
  return getPool().getConnection();
}

/** Ejecuta una consulta parametrizada de lectura y devuelve filas tipadas. */
export async function query<T extends RowDataPacket[]>(
  sql: string,
  params: DbParams = []
): Promise<T> {
  const [rows] = await getPool().query(sql, params);
  return rows as unknown as T;
}

/** Ejecuta una consulta parametrizada de escritura (INSERT/UPDATE/DELETE). */
export async function execute(
  sql: string,
  params: DbParams = []
): Promise<ResultSetHeader> {
  const [result] = await getPool().execute(sql, params);
  return result as ResultSetHeader;
}

/** Ejecuta varias operaciones dentro de una transacción. */
export async function withTransaction<T>(
  fn: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** Cierra el pool de conexiones (útil en tests o cierre de proceso). */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ---------------------------------------------------------------------------
// Mapeadores: MySQL devuelve DECIMAL/TINYINT como string/número.
// ---------------------------------------------------------------------------

const PRENDA_COLUMNS = `p.id, p.usuario_id, p.categoria_id, p.nombre, p.descripcion,
  p.color, p.temporada, p.ocasion, p.patron, p.estado, p.veces_usada, p.precio,
  p.imagen_url, p.imagen_sin_fondo_url, p.created_at, p.updated_at`;

const LOOK_COLUMNS = `id, usuario_id, nombre, montaje_url, collage_url, ocasion,
  descripcion, es_favorito, created_at, updated_at`;

const REGISTRO_COLUMNS = `id, usuario_id, prenda_id, look_id, usado_en, created_at`;

function mapPrenda(row: RowDataPacket): Prenda {
  const r = row as unknown as Record<string, unknown>;
  return {
    id: Number(r.id),
    usuario_id: Number(r.usuario_id),
    categoria_id: Number(r.categoria_id),
    nombre: String(r.nombre),
    descripcion: r.descripcion === null ? null : String(r.descripcion),
    color: r.color === null ? null : String(r.color),
    temporada: r.temporada as Temporada,
    ocasion: r.ocasion as Ocasion,
    patron: r.patron as Patron,
    estado: r.estado as EstadoPrenda,
    veces_usada: Number(r.veces_usada ?? 0),
    precio:
      r.precio === null || r.precio === undefined ? null : Number(r.precio),
    imagen_url: String(r.imagen_url),
    imagen_sin_fondo_url:
      r.imagen_sin_fondo_url === null
        ? null
        : String(r.imagen_sin_fondo_url),
    created_at: r.created_at as Date,
    updated_at: r.updated_at as Date,
  };
}

function mapLook(row: RowDataPacket): Look {
  const r = row as unknown as Record<string, unknown>;
  return {
    id: Number(r.id),
    usuario_id: Number(r.usuario_id),
    nombre: String(r.nombre),
    montaje_url: r.montaje_url === null ? null : String(r.montaje_url),
    collage_url: r.collage_url === null ? null : String(r.collage_url),
    ocasion: r.ocasion as Ocasion,
    descripcion: r.descripcion === null ? null : String(r.descripcion),
    es_favorito: Number(r.es_favorito ?? 0) === 1,
    created_at: r.created_at as Date,
    updated_at: r.updated_at as Date,
  };
}

function mapRegistroUso(row: RowDataPacket): RegistroUso {
  const r = row as unknown as Record<string, unknown>;
  return {
    id: Number(r.id),
    usuario_id: Number(r.usuario_id),
    prenda_id: r.prenda_id === null ? null : Number(r.prenda_id),
    look_id: r.look_id === null ? null : Number(r.look_id),
    usado_en: r.usado_en as Date,
    created_at: r.created_at as Date,
  };
}

function escapeLike(texto: string): string {
  return texto.replace(/[\\%_]/g, '\\$&');
}

export interface FiltrosPrenda {
  categoriaId?: number | null;
  temporada?: Temporada | null;
  ocasion?: Ocasion | null;
  patron?: Patron | null;
  estado?: EstadoPrenda | null;
  color?: string | null;
  q?: string | null;
  soloFavoritos?: boolean;
  limite?: number;
}

function construirFiltros(
  usuarioId: number,
  filtros: FiltrosPrenda
): { where: string; params: DbParams } {
  const condiciones = ['p.usuario_id = ?'];
  const params: DbParams = [usuarioId];

  if (
    typeof filtros.categoriaId === 'number' &&
    Number.isInteger(filtros.categoriaId) &&
    filtros.categoriaId > 0
  ) {
    condiciones.push('p.categoria_id = ?');
    params.push(filtros.categoriaId);
  }

  if (filtros.temporada && filtros.temporada !== 'todas') {
    condiciones.push('p.temporada = ?');
    params.push(filtros.temporada);
  }

  if (filtros.ocasion && filtros.ocasion !== 'todas') {
    condiciones.push('p.ocasion = ?');
    params.push(filtros.ocasion);
  }

  if (filtros.patron && filtros.patron !== 'liso') {
    condiciones.push('p.patron = ?');
    params.push(filtros.patron);
  }

  if (filtros.estado) {
    condiciones.push('p.estado = ?');
    params.push(filtros.estado);
  }

  if (filtros.color && filtros.color.trim()) {
    condiciones.push('p.color LIKE ?');
    params.push(`%${escapeLike(filtros.color.trim())}%`);
  }

  if (filtros.q && filtros.q.trim()) {
    const patron = `%${escapeLike(filtros.q.trim())}%`;
    condiciones.push(
      `(p.nombre LIKE ? OR COALESCE(p.descripcion, '') LIKE ?
        OR COALESCE(p.color, '') LIKE ? OR p.patron LIKE ?)`
    );
    params.push(patron, patron, patron, patron);
  }

  if (filtros.soloFavoritos) {
    // Se liga al usuario de la sesión (p.usuario_id) para no exponer
    // favoritos de otros usuarios.
    condiciones.push(
      'EXISTS (SELECT 1 FROM favoritos f WHERE f.usuario_id = p.usuario_id AND f.prenda_id = p.id)'
    );
  }

  return { where: condiciones.join(' AND '), params };
}

function normalizarLimite(valor: number | undefined, defecto = 100): number {
  if (!Number.isFinite(valor)) return defecto;
  return Math.min(Math.max(Math.trunc(valor as number), 1), 200);
}

// ---------------------------------------------------------------------------
// Modelos
// ---------------------------------------------------------------------------

export const UsuarioModel = {
  async findAll(): Promise<Usuario[]> {
    return query<RowDataPacket[]>(
      'SELECT id, nombre, email, foto_base_url, created_at, updated_at FROM usuarios ORDER BY created_at DESC'
    ) as unknown as Usuario[];
  },

  async findByEmail(email: string): Promise<Usuario | null> {
    const rows = await query<RowDataPacket[]>(
      'SELECT id, nombre, email, foto_base_url, created_at, updated_at FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    if (rows.length === 0) return null;
    return rows[0] as unknown as Usuario;
  },

  async findByNombre(nombre: string): Promise<Usuario | null> {
    const rows = await query<RowDataPacket[]>(
      'SELECT id, nombre, email, foto_base_url, created_at, updated_at FROM usuarios WHERE nombre = ? LIMIT 1',
      [nombre]
    );
    if (rows.length === 0) return null;
    return rows[0] as unknown as Usuario;
  },

  /** Solo para el flujo de autenticación: incluye el hash de la contraseña. */
  async findAuthByNombre(
    nombre: string
  ): Promise<(Usuario & { password_hash: string | null }) | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT id, nombre, email, password_hash, foto_base_url, created_at, updated_at
       FROM usuarios WHERE nombre = ? LIMIT 1`,
      [nombre]
    );
    if (rows.length === 0) return null;
    return rows[0] as unknown as Usuario & { password_hash: string | null };
  },

  async create(data: UsuarioInput): Promise<Usuario> {
    const result = await execute(
      'INSERT INTO usuarios (nombre, email, foto_base_url) VALUES (?, ?, ?)',
      [data.nombre, data.email ?? null, data.foto_base_url ?? null]
    );
    const found = await this.findById(result.insertId);
    if (!found) {
      throw new Error('No se pudo recuperar el usuario recién creado');
    }
    return found;
  },

  async createAuthUser(nombre: string, passwordHash: string): Promise<Usuario> {
    const result = await execute(
      'INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, NULL, ?)',
      [nombre, passwordHash]
    );
    const found = await this.findById(result.insertId);
    if (!found) {
      throw new Error('No se pudo recuperar el usuario recién creado');
    }
    return found;
  },

  async findById(id: number): Promise<Usuario | null> {
    const rows = await query<RowDataPacket[]>(
      'SELECT id, nombre, email, foto_base_url, created_at, updated_at FROM usuarios WHERE id = ? LIMIT 1',
      [id]
    );
    if (rows.length === 0) return null;
    return rows[0] as unknown as Usuario;
  },
};

export const CategoriaModel = {
  async findAll(): Promise<Categoria[]> {
    return query<RowDataPacket[]>(
      'SELECT id, nombre, slug, created_at FROM categorias ORDER BY nombre ASC'
    ) as unknown as Categoria[];
  },

  async create(data: CategoriaInput): Promise<Categoria> {
    const result = await execute(
      'INSERT INTO categorias (nombre, slug) VALUES (?, ?)',
      [data.nombre, data.slug]
    );
    const rows = await query<RowDataPacket[]>(
      'SELECT id, nombre, slug, created_at FROM categorias WHERE id = ? LIMIT 1',
      [result.insertId]
    );
    return rows[0] as unknown as Categoria;
  },
};

export const PrendaModel = {
  async findAll(): Promise<Prenda[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT ${PRENDA_COLUMNS} FROM prendas p ORDER BY p.created_at DESC`
    );
    return rows.map(mapPrenda);
  },

  async findByCategoria(categoriaId: number): Promise<Prenda[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT ${PRENDA_COLUMNS} FROM prendas p
       WHERE p.categoria_id = ? ORDER BY p.created_at DESC`,
      [categoriaId]
    );
    return rows.map(mapPrenda);
  },

  async findByUsuario(usuarioId: number): Promise<Prenda[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT ${PRENDA_COLUMNS} FROM prendas p
       WHERE p.usuario_id = ? ORDER BY p.created_at DESC`,
      [usuarioId]
    );
    return rows.map(mapPrenda);
  },

  async findByUsuarioAndCategoria(
    usuarioId: number,
    categoriaId: number
  ): Promise<Prenda[]> {
    return this.findByUsuarioConFiltros(usuarioId, { categoriaId });
  },

  async findByUsuarioConFiltros(
    usuarioId: number,
    filtros: FiltrosPrenda = {}
  ): Promise<Prenda[]> {
    const { where, params } = construirFiltros(usuarioId, filtros);
    const limite = normalizarLimite(filtros.limite);
    const rows = await query<RowDataPacket[]>(
      `SELECT ${PRENDA_COLUMNS} FROM prendas p
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT ${limite}`,
      params
    );
    return rows.map(mapPrenda);
  },

  async buscar(
    usuarioId: number,
    filtros: FiltrosPrenda = {}
  ): Promise<Prenda[]> {
    return this.findByUsuarioConFiltros(usuarioId, filtros);
  },

  async findById(id: number): Promise<Prenda | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT ${PRENDA_COLUMNS} FROM prendas p WHERE p.id = ? LIMIT 1`,
      [id]
    );
    if (rows.length === 0) return null;
    return mapPrenda(rows[0]);
  },

  async findByIdForUsuario(
    id: number,
    usuarioId: number
  ): Promise<Prenda | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT ${PRENDA_COLUMNS} FROM prendas p
       WHERE p.id = ? AND p.usuario_id = ? LIMIT 1`,
      [id, usuarioId]
    );
    if (rows.length === 0) return null;
    return mapPrenda(rows[0]);
  },

  async create(data: PrendaInput): Promise<Prenda> {
    const result = await execute(
      `INSERT INTO prendas
        (usuario_id, categoria_id, nombre, descripcion, color, temporada,
         ocasion, patron, estado, precio, imagen_url, imagen_sin_fondo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.usuario_id,
        data.categoria_id,
        data.nombre,
        data.descripcion ?? null,
        data.color ?? null,
        data.temporada,
        data.ocasion,
        data.patron,
        data.estado,
        data.precio ?? null,
        data.imagen_url,
        data.imagen_sin_fondo_url ?? null,
      ]
    );
    const prenda = await this.findById(result.insertId);
    if (!prenda) {
      throw new Error('No se pudo recuperar la prenda recién creada');
    }
    return prenda;
  },

  async incrementarUso(id: number, usuarioId: number): Promise<Prenda | null> {
    const result = await execute(
      'UPDATE prendas SET veces_usada = veces_usada + 1 WHERE id = ? AND usuario_id = ?',
      [id, usuarioId]
    );
    if (result.affectedRows === 0) return null;
    return this.findByIdForUsuario(id, usuarioId);
  },

  async setEstado(
    id: number,
    usuarioId: number,
    estado: EstadoPrenda
  ): Promise<Prenda | null> {
    const result = await execute(
      'UPDATE prendas SET estado = ? WHERE id = ? AND usuario_id = ?',
      [estado, id, usuarioId]
    );
    if (result.affectedRows === 0) return null;
    return this.findByIdForUsuario(id, usuarioId);
  },

  async countParaLavar(usuarioId: number): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM prendas WHERE usuario_id = ? AND estado = 'para_lavar'",
      [usuarioId]
    );
    return Number(rows[0]?.total ?? 0);
  },

  async countByUsuario(usuarioId: number): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM prendas WHERE usuario_id = ?',
      [usuarioId]
    );
    return Number(rows[0]?.total ?? 0);
  },

  async findTopUsadas(usuarioId: number, limite = 5): Promise<Prenda[]> {
    const filas = Math.min(Math.max(Math.trunc(limite), 1), 20);
    const rows = await query<RowDataPacket[]>(
      `SELECT ${PRENDA_COLUMNS} FROM prendas p
       WHERE p.usuario_id = ?
       ORDER BY p.veces_usada DESC, p.created_at DESC
       LIMIT ${filas}`,
      [usuarioId]
    );
    return rows.map(mapPrenda);
  },

  async findOlvidadas(usuarioId: number, dias = 30): Promise<Prenda[]> {
    const ventana = Math.min(Math.max(Math.trunc(dias), 1), 365);
    const rows = await query<RowDataPacket[]>(
      `SELECT ${PRENDA_COLUMNS}, MAX(ru.usado_en) AS ultimo_uso
       FROM prendas p
       LEFT JOIN registros_uso ru
         ON ru.prenda_id = p.id AND ru.usuario_id = p.usuario_id
       WHERE p.usuario_id = ?
       GROUP BY p.id
       HAVING ultimo_uso IS NULL OR ultimo_uso < DATE_SUB(NOW(), INTERVAL ${ventana} DAY)
       ORDER BY (ultimo_uso IS NULL) DESC, ultimo_uso ASC, p.created_at ASC
       LIMIT 30`,
      [usuarioId]
    );
    return rows.map(mapPrenda);
  },

  async contarPorCategoria(
    usuarioId: number
  ): Promise<Array<{ categoria_id: number; nombre: string; total: number }>> {
    const rows = await query<RowDataPacket[]>(
      `SELECT c.id AS categoria_id, c.nombre, COUNT(p.id) AS total
       FROM categorias c
       LEFT JOIN prendas p ON p.categoria_id = c.id AND p.usuario_id = ?
       GROUP BY c.id, c.nombre
       ORDER BY total DESC, c.nombre ASC`,
      [usuarioId]
    );
    return rows.map((row) => ({
      categoria_id: Number(row.categoria_id),
      nombre: String(row.nombre),
      total: Number(row.total),
    }));
  },

  async contarPorTemporada(
    usuarioId: number
  ): Promise<Array<{ temporada: Temporada; total: number }>> {
    const rows = await query<RowDataPacket[]>(
      `SELECT temporada, COUNT(*) AS total
       FROM prendas WHERE usuario_id = ?
       GROUP BY temporada`,
      [usuarioId]
    );
    return rows.map((row) => ({
      temporada: row.temporada as Temporada,
      total: Number(row.total),
    }));
  },
};

export const LookModel = {
  async findAll(): Promise<Look[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT ${LOOK_COLUMNS} FROM looks ORDER BY created_at DESC`
    );
    return rows.map(mapLook);
  },

  async findByUsuario(usuarioId: number): Promise<Look[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT ${LOOK_COLUMNS} FROM looks
       WHERE usuario_id = ? ORDER BY created_at DESC`,
      [usuarioId]
    );
    return rows.map(mapLook);
  },

  async findByIdForUsuario(
    id: number,
    usuarioId: number
  ): Promise<Look | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT ${LOOK_COLUMNS} FROM looks
       WHERE id = ? AND usuario_id = ? LIMIT 1`,
      [id, usuarioId]
    );
    if (rows.length === 0) return null;
    return mapLook(rows[0]);
  },

  async create(data: LookInput): Promise<Look> {
    const result = await execute(
      `INSERT INTO looks
        (usuario_id, nombre, montaje_url, ocasion, descripcion, es_favorito)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.usuario_id,
        data.nombre,
        data.montaje_url ?? null,
        data.ocasion ?? 'todas',
        data.descripcion ?? null,
        data.es_favorito ? 1 : 0,
      ]
    );
    const look = await this.findByIdForUsuario(result.insertId, data.usuario_id);
    if (!look) {
      throw new Error('No se pudo recuperar el look recién creado');
    }
    return look;
  },

  async createConPrendas(
    data: LookInput,
    prendas: LookPrendaInput[]
  ): Promise<Look> {
    return withTransaction(async (connection) => {
      const [result] = await connection.execute(
        `INSERT INTO looks
          (usuario_id, nombre, montaje_url, ocasion, descripcion, es_favorito)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.usuario_id,
          data.nombre,
          data.montaje_url ?? null,
          data.ocasion ?? 'todas',
          data.descripcion ?? null,
          data.es_favorito ? 1 : 0,
        ]
      );
      const lookId = (result as ResultSetHeader).insertId;

      let posicion = 0;
      for (const prenda of prendas) {
        await connection.execute(
          `INSERT INTO look_prendas (look_id, prenda_id, slot, posicion)
           VALUES (?, ?, ?, ?)`,
          [lookId, prenda.prenda_id, prenda.slot, prenda.posicion ?? posicion]
        );
        posicion += 1;
      }

      return {
        id: lookId,
        usuario_id: data.usuario_id,
        nombre: data.nombre,
        montaje_url: data.montaje_url ?? null,
        collage_url: null,
        ocasion: data.ocasion ?? 'todas',
        descripcion: data.descripcion ?? null,
        es_favorito: Boolean(data.es_favorito),
        created_at: new Date(),
        updated_at: new Date(),
      };
    });
  },

  async reemplazarPrendas(
    lookId: number,
    usuarioId: number,
    prendas: LookPrendaInput[]
  ): Promise<void> {
    await withTransaction(async (connection) => {
      await connection.execute(
        `DELETE lp FROM look_prendas lp
         INNER JOIN looks l ON l.id = lp.look_id
         WHERE lp.look_id = ? AND l.usuario_id = ?`,
        [lookId, usuarioId]
      );
      let posicion = 0;
      for (const prenda of prendas) {
        await connection.execute(
          `INSERT INTO look_prendas (look_id, prenda_id, slot, posicion)
           VALUES (?, ?, ?, ?)`,
          [lookId, prenda.prenda_id, prenda.slot, prenda.posicion ?? posicion]
        );
        posicion += 1;
      }
    });
  },

  async findPrendasDeLook(
    lookId: number,
    usuarioId: number
  ): Promise<PrendaDeLook[]> {
    const rows = await query<RowDataPacket[]>(
      `SELECT ${PRENDA_COLUMNS}, lp.slot, lp.posicion
       FROM look_prendas lp
       INNER JOIN prendas p ON p.id = lp.prenda_id
       INNER JOIN looks l ON l.id = lp.look_id
       WHERE lp.look_id = ? AND l.usuario_id = ? AND p.usuario_id = ?
       ORDER BY lp.posicion ASC, lp.prenda_id ASC`,
      [lookId, usuarioId, usuarioId]
    );
    return rows.map((row) => ({
      ...mapPrenda(row),
      slot: row.slot as PrendaDeLook['slot'],
      posicion: Number(row.posicion),
    }));
  },

  async setCollageUrl(
    lookId: number,
    usuarioId: number,
    collageUrl: string
  ): Promise<Look | null> {
    const result = await execute(
      'UPDATE looks SET collage_url = ? WHERE id = ? AND usuario_id = ?',
      [collageUrl, lookId, usuarioId]
    );
    if (result.affectedRows === 0) return null;
    return this.findByIdForUsuario(lookId, usuarioId);
  },

  async countByUsuario(usuarioId: number): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM looks WHERE usuario_id = ?',
      [usuarioId]
    );
    return Number(rows[0]?.total ?? 0);
  },
};

export const RegistroUsoModel = {
  async registrarPrenda(
    usuarioId: number,
    prendaId: number,
    lookId: number | null
  ): Promise<boolean> {
    return withTransaction(async (connection) => {
      await connection.execute(
        'INSERT INTO registros_uso (usuario_id, prenda_id, look_id) VALUES (?, ?, ?)',
        [usuarioId, prendaId, lookId]
      );
      const [result] = await connection.execute(
        'UPDATE prendas SET veces_usada = veces_usada + 1 WHERE id = ? AND usuario_id = ?',
        [prendaId, usuarioId]
      );
      return (result as ResultSetHeader).affectedRows > 0;
    });
  },

  async registrarLook(usuarioId: number, lookId: number): Promise<number> {
    const prendas = await LookModel.findPrendasDeLook(lookId, usuarioId);

    return withTransaction(async (connection) => {
      if (prendas.length === 0) {
        await connection.execute(
          'INSERT INTO registros_uso (usuario_id, prenda_id, look_id) VALUES (?, NULL, ?)',
          [usuarioId, lookId]
        );
        return 0;
      }

      for (const prenda of prendas) {
        await connection.execute(
          'INSERT INTO registros_uso (usuario_id, prenda_id, look_id) VALUES (?, ?, ?)',
          [usuarioId, prenda.id, lookId]
        );
      }

      const marcadores = prendas.map(() => '?').join(', ');
      await connection.execute(
        `UPDATE prendas SET veces_usada = veces_usada + 1
         WHERE usuario_id = ? AND id IN (${marcadores})`,
        [usuarioId, ...prendas.map((p) => p.id)]
      );

      return prendas.length;
    });
  },

  async listByUsuario(
    usuarioId: number,
    limite = 50
  ): Promise<RegistroUso[]> {
    const filas = Math.min(Math.max(Math.trunc(limite), 1), 200);
    const rows = await query<RowDataPacket[]>(
      `SELECT ${REGISTRO_COLUMNS} FROM registros_uso
       WHERE usuario_id = ?
       ORDER BY usado_en DESC
       LIMIT ${filas}`,
      [usuarioId]
    );
    return rows.map(mapRegistroUso);
  },
};

export const FavoritoModel = {
  async add(usuarioId: number, prendaId: number): Promise<void> {
    await execute(
      'INSERT IGNORE INTO favoritos (usuario_id, prenda_id) VALUES (?, ?)',
      [usuarioId, prendaId]
    );
  },

  async remove(usuarioId: number, prendaId: number): Promise<void> {
    await execute(
      'DELETE FROM favoritos WHERE usuario_id = ? AND prenda_id = ?',
      [usuarioId, prendaId]
    );
  },

  async listByUsuario(usuarioId: number): Promise<Favorito[]> {
    return query<RowDataPacket[]>(
      'SELECT usuario_id, prenda_id, created_at FROM favoritos WHERE usuario_id = ?',
      [usuarioId]
    ) as unknown as Favorito[];
  },
};

/**
 * Sesiones de autenticación.
 * El token aleatorio vive en una cookie HttpOnly; en MySQL solo se guarda su
 * hash SHA-256, de modo que una filtración de la BD no permite reutilizarlo.
 */
export const SesionModel = {
  async create(
    tokenHash: string,
    usuarioId: number,
    expiresAt: Date
  ): Promise<void> {
    await execute('DELETE FROM sesiones WHERE expires_at < NOW()');
    await execute(
      'INSERT INTO sesiones (token_hash, usuario_id, expires_at) VALUES (?, ?, ?)',
      [tokenHash, usuarioId, expiresAt]
    );
  },

  async findUsuarioByTokenHash(tokenHash: string): Promise<Usuario | null> {
    const rows = await query<RowDataPacket[]>(
      `SELECT u.id, u.nombre, u.email, u.foto_base_url, u.created_at, u.updated_at
       FROM sesiones s
       INNER JOIN usuarios u ON u.id = s.usuario_id
       WHERE s.token_hash = ? AND s.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    if (rows.length === 0) return null;
    return rows[0] as unknown as Usuario;
  },

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await execute('DELETE FROM sesiones WHERE token_hash = ?', [tokenHash]);
  },

  async deleteByUsuarioId(usuarioId: number): Promise<void> {
    await execute('DELETE FROM sesiones WHERE usuario_id = ?', [usuarioId]);
  },
};
