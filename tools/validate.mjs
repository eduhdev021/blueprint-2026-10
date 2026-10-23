import { transformSync } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.BP_ROOT || process.cwd();
const SCRIPTS = path.join(ROOT, 'resources/scripts');

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

const files = walk(SCRIPTS).filter((f) => /\.(tsx?|jsx?)$/.test(f));
let syntaxErrors = 0, importErrors = 0;

// 1. sintaxe (esbuild transform)
for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  const loader = f.endsWith('.tsx') ? 'tsx' : f.endsWith('.ts') ? 'ts' : 'jsx';
  try {
    transformSync(code, { loader, jsx: 'transform', target: 'es2015' });
  } catch (e) {
    syntaxErrors++;
    console.log(`SINTAXE  ${path.relative(ROOT, f)}: ${e.errors?.[0]?.text ?? e.message}`);
  }
}

// 2. resolução dos imports internos (@/ e @blueprint/)
// o overlay só contém os arquivos alterados; o resto vem do painel (BP_PANEL_ROOT)
const PANEL = process.env.BP_PANEL_ROOT ? path.join(process.env.BP_PANEL_ROOT, 'resources/scripts') : null;
const ROOTS = PANEL ? [SCRIPTS, PANEL] : [SCRIPTS];
const ALIASES = [
  ['@blueprint/', 'blueprint'],
  ['@definitions/', 'api/definitions'],
  ['@feature/', 'components/server/features'],
  ['@/', ''],
];
const EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.d.ts', '/index.ts', '/index.tsx', '/index.js'];

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  const specs = [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  for (const spec of specs) {
    const alias = ALIASES.find(([a]) => spec.startsWith(a));
    if (!alias) continue;
    const rel = path.join(alias[1], spec.slice(alias[0].length));
    const found = ROOTS.some((root) => EXTS.some((e) => fs.existsSync(path.join(root, rel) + e)));
    if (!found) {
      importErrors++;
      console.log(`IMPORT   ${path.relative(ROOT, f)} -> ${spec}`);
    }
  }
}

console.log(`\n${files.length} arquivos TS/TSX verificados | erros de sintaxe: ${syntaxErrors} | imports não resolvidos: ${importErrors}`);
process.exit(syntaxErrors + importErrors ? 1 : 0);
