import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function parseGerberCoord(raw) {
  const sign = raw.startsWith('-') ? -1 : 1;
  const digits = raw.replace('-', '');
  return sign * (Number.parseInt(digits, 10) / 100000);
}

export function parseOutline(file) {
  const text = readFileSync(file, 'utf8');
  const points = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/X(-?\d+)Y(-?\d+)/);
    if (!match) continue;
    points.push({ x: parseGerberCoord(match[1]), y: parseGerberCoord(match[2]), raw: line.trim() });
  }
  if (points.length === 0) throw new Error(`No outline points found in ${file}`);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    units: 'mm',
    points,
    bounds: {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    },
  };
}

export function parseDrill(file, plated) {
  const text = readFileSync(file, 'utf8');
  const tools = {};
  let currentTool = null;
  const holes = [];
  for (const line of text.split(/\r?\n/)) {
    const toolDef = line.match(/^T(\d+)C([0-9.]+)/);
    if (toolDef) {
      tools[`T${toolDef[1]}`] = Number(toolDef[2]);
      continue;
    }
    const toolSelect = line.match(/^T(\d+)$/);
    if (toolSelect) {
      currentTool = `T${toolSelect[1]}`;
      continue;
    }
    const coord = line.match(/X(-?[0-9.]+)Y(-?[0-9.]+)/);
    if (!coord || !currentTool) continue;
    holes.push({
      x: Number(coord[1]),
      y: Number(coord[2]),
      drillMm: tools[currentTool],
      plated,
      slot: line.includes('G85'),
      raw: line.trim(),
    });
  }
  return { tools, holes };
}

export function parseGerberDimensions(inputDir, options = {}) {
  const outlineFile = options.outlineFile || 'Gerber_BoardOutlineLayer.GKO';
  const pthFile = options.pthFile || 'Drill_PTH_Through.DRL';
  const npthFile = options.npthFile || 'Drill_NPTH_Through.DRL';
  const outline = parseOutline(join(inputDir, outlineFile));
  const pth = parseDrill(join(inputDir, pthFile), true);
  const npth = parseDrill(join(inputDir, npthFile), false);
  const bounds = outline.bounds;
  return {
    source: options.source || inputDir,
    units: 'mm',
    board: {
      widthMm: Number((bounds.maxX - bounds.minX).toFixed(5)),
      heightMm: Number((bounds.maxY - bounds.minY).toFixed(5)),
      bounds,
    },
    npthHoles: npth.holes,
    pthHoles: pth.holes,
    outlinePoints: outline.points,
  };
}
