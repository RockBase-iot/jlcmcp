import { withBridge } from './lib/bridge-client.js';

await withBridge(async (bridge) => {
  const context = await bridge.currentContext('sync-pcb');
  const schematicUuid = process.env.SCHEMATIC_UUID
    || context?.currentBoardInfo?.schematic?.uuid
    || context?.currentSchematicInfo?.uuid;
  if (!schematicUuid) throw new Error('No schematic UUID found. Open a board-linked PCB or set SCHEMATIC_UUID.');

  const before = await bridge.request('get_state');
  const imported = await bridge.invoke('eda.pcb_Document.importChanges', [schematicUuid]);
  const after = await bridge.request('get_state');
  const drc = await bridge.request('run_drc');
  const saved = await bridge.saveCurrentPcb('sync-pcb-save');
  console.log(JSON.stringify({
    schematicUuid,
    imported,
    componentsBefore: before?.components?.length ?? null,
    componentsAfter: after?.components?.length ?? null,
    netsAfter: after?.nets?.length ?? null,
    drc,
    saved,
  }, null, 2));
}, { prefix: 'sync-pcb' }).catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
