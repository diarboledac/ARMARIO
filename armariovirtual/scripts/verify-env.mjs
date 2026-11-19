/**
 * verify-env.mjs
 * Verifica que las variables de entorno esperadas en .env.local estén definidas
 * y no vacías. SOLO imprime nombres de clave y estado (cargada / falta / vacía).
 * NUNCA imprime los valores secretos.
 */

import fs from 'node:fs';

const ENV_PATH = '.env.local';

// Claves que la aplicación espera tener cargadas (según AGENTS.md y .env.local)
const EXPECTED_KEYS = [
  'HUGGINGFACE_API_KEY',
  'DATABASE_URL',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

function parseEnvFile(path) {
  const vars = {};
  if (!fs.existsSync(path)) {
    return vars;
  }
  const content = fs.readFileSync(path, 'utf8');
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

const env = parseEnvFile(ENV_PATH);

let allOk = true;
console.log(`Verificando variables de entorno en ${ENV_PATH}:\n`);

for (const key of EXPECTED_KEYS) {
  if (!(key in env)) {
    console.log(`  [FALTA]  ${key}`);
    allOk = false;
  } else if (env[key] === '') {
    console.log(`  [VACÍA]  ${key}`);
    allOk = false;
  } else {
    // Valor censurado: solo se confirma presencia, nunca el secreto
    console.log(`  [OK]     ${key} = ****`);
  }
}

console.log(`\nResultado: ${allOk ? 'Todas las variables están cargadas ✅' : 'Faltan variables o están vacías ❌'}`);
process.exit(allOk ? 0 : 1);
