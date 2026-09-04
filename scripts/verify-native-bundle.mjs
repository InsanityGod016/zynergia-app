import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const dist = path.resolve('dist');
const forbidden = [
  '/api/billing/checkout',
  '/api/billing/portal',
  'continuar al pago',
  'completa tu pago',
  'crear mi cuenta — 17 usd',
  'stripe',
  '17 usd',
  'precio final',
  'método de pago',
  'tarjeta',
];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  }))).flat();
}

const files = (await filesUnder(dist)).filter(file => /\.(?:html|js|css)$/.test(file));
const failures = [];

for (const file of files) {
  const contents = (await readFile(file, 'utf8')).toLocaleLowerCase('es');
  for (const value of forbidden) {
    if (contents.includes(value)) failures.push({ file: path.relative(dist, file), value });
  }
}

if (failures.length) {
  process.stderr.write(`${JSON.stringify({ nativeBundleSafe: false, failures }, null, 2)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({ nativeBundleSafe: true }, null, 2)}\n`);
}
