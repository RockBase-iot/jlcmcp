import { writeFileSync } from 'node:fs';
import { parseGerberDimensions } from './lib/gerber-dimensions.js';

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  return process.argv[index + 1] || fallback;
}

const hasNamedInput = process.argv.includes('--input');
const input = readArg('--input', hasNamedInput ? 'designs/reference-gerber/v1.2' : (process.argv[2] || 'designs/reference-gerber/v1.2'));
const output = readArg('--output', '');
const source = readArg('--source', '');

const dimensions = parseGerberDimensions(input, { source: source || input });
if (output) {
  writeFileSync(output, `${JSON.stringify(dimensions, null, 2)}\n`);
}

console.log(JSON.stringify({
  board: dimensions.board,
  npthHoleCount: dimensions.npthHoles.length,
  pthHoleCount: dimensions.pthHoles.length,
  output: output || null,
}, null, 2));
