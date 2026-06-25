import { withBridge } from './lib/bridge-client.js';

await withBridge(async (bridge) => {
  const data = {
    context: await bridge.currentContext('inspect-project'),
    boards: await bridge.invoke('eda.dmt_Board.getAllBoardsInfo'),
    currentBoard: await bridge.invoke('eda.dmt_Board.getCurrentBoardInfo'),
    schematics: await bridge.invoke('eda.dmt_Schematic.getAllSchematicsInfo'),
    pages: await bridge.invoke('eda.dmt_Schematic.getAllSchematicPagesInfo'),
    pcbs: await bridge.invoke('eda.dmt_Pcb.getAllPcbsInfo'),
    currentPcb: await bridge.invoke('eda.dmt_Pcb.getCurrentPcbInfo'),
  };
  console.log(JSON.stringify(data, null, 2));
}, { prefix: 'inspect-project' }).catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
