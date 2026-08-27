// RF-9: no colour value appears outside the token files. The primitives live in
// tokens/palette.css and the semantic layer in app/src/styles/, and components
// read that layer and never a raw value. ESLint does not read CSS, so this does.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scanRoot = join(root, 'app', 'src');
const allowed = [join('app', 'src', 'styles')];

const COLOUR = /(#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|lab|color-mix)\s*\()/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (['.css', '.html'].includes(extname(full))) out.push(full);
  }
  return out;
}

const findings = [];
for (const file of walk(scanRoot)) {
  const rel = relative(root, file);
  if (allowed.some((prefix) => rel.startsWith(prefix))) continue;
  for (const [index, line] of readFileSync(file, 'utf8').split('\n').entries()) {
    for (const match of line.matchAll(COLOUR)) {
      findings.push(`${rel}:${index + 1}  ${match[0]}  ${line.trim()}`);
    }
  }
}

if (findings.length > 0) {
  console.error('Colour values found outside the token layer:\n');
  for (const finding of findings) console.error(`  ${finding}`);
  console.error(`\n${findings.length} violation(s). Components read semantic tokens, never values.`);
  process.exit(1);
}
console.log('Token guard: no colour values outside app/src/styles. ✓');
