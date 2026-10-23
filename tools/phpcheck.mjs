import engine from 'php-parser';
import fs from 'node:fs';
import path from 'node:path';
const parser = new engine({ parser: { extractDoc: true, suppressErrors: false }, ast: { withPositions: true } });
const files = process.argv.slice(2);
let bad = 0;
for (const f of files) {
  try {
    parser.parseCode(fs.readFileSync(f, 'utf8'), f);
  } catch (e) {
    bad++;
    console.log(`PHP  ${f}: ${e.message.split('\n')[0]}`);
  }
}
console.log(`${files.length} arquivos PHP verificados | erros: ${bad}`);
process.exit(bad ? 1 : 0);
