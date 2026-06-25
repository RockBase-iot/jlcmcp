import { valueOf, withBridge } from './lib/bridge-client.js';

await withBridge(async (bridge) => {
  const components = await bridge.invoke('eda.pcb_PrimitiveComponent.getAll');
  const rows = [];
  for (const component of components.result || []) {
    const primitiveId = valueOf(component, ['PrimitiveId', 'primitiveId']);
    const designator = valueOf(component, ['Designator', 'designator']);
    if (!primitiveId || !designator) continue;
    const pads = await bridge.invoke('eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId', [primitiveId]);
    rows.push({
      designator,
      primitiveId,
      pads: (pads.result || []).map((pad) => ({
        primitiveId: valueOf(pad, ['PrimitiveId', 'primitiveId']),
        number: valueOf(pad, ['Number', 'PinNumber', 'pinNumber', 'padNumber']),
        name: valueOf(pad, ['PinName', 'Name', 'pinName']),
        net: valueOf(pad, ['Net', 'NetName', 'net']),
        x: pad.X || pad.x,
        y: pad.Y || pad.y,
      })),
    });
  }
  console.log(JSON.stringify(rows, null, 2));
}, { prefix: 'inspect-pcb-pads' }).catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
