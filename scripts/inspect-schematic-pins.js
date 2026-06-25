import { withBridge } from './lib/bridge-client.js';

await withBridge(async (bridge) => {
  const context = await bridge.currentContext('inspect-schematic-pins');
  const pageUuid = process.env.SCHEMATIC_PAGE_UUID
    || context?.currentBoardInfo?.schematic?.page?.[0]?.uuid
    || context?.currentSchematicPageInfo?.uuid;
  const pcbUuid = context?.currentPcbInfo?.uuid || context?.currentBoardInfo?.pcb?.uuid || '';
  if (!pageUuid) throw new Error('No schematic page UUID found. Open a board-linked schematic or set SCHEMATIC_PAGE_UUID.');

  await bridge.request('open_document', { uuid: pageUuid });
  const state = await bridge.request('read_schematic');
  const rows = [];
  for (const component of state.components || []) {
    const ref = component.designator || component.name || '';
    if (!ref) continue;
    const pins = await bridge.request('get_schematic_component_pins', { primitiveId: component.primitiveId });
    rows.push({
      ref,
      primitiveId: component.primitiveId,
      pins: (pins.pins || []).map((pin) => ({
        pinName: pin.pinName,
        pinNumber: pin.pinNumber,
        x: pin.x,
        y: pin.y,
      })),
    });
  }
  if (pcbUuid) await bridge.request('open_document', { uuid: pcbUuid });
  console.log(JSON.stringify(rows, null, 2));
}, { prefix: 'inspect-schematic-pins' }).catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
