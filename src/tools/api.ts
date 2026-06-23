import { z } from 'zod';
import { BridgeClient } from '../bridge-client.js';

const API_INDEX = [
  {
    fullName: 'eda.dmt_Project.getCurrentProjectInfo',
    owner: 'dmt',
    summary: 'Get current project metadata.',
    signatureText: 'getCurrentProjectInfo(): Promise<IDMT_ProjectItem | null>',
  },
  {
    fullName: 'eda.dmt_SelectControl.getCurrentDocumentInfo',
    owner: 'dmt',
    summary: 'Get active document context and document type.',
    signatureText: 'getCurrentDocumentInfo(): Promise<IDMT_EditorDocumentInfo | null>',
  },
  {
    fullName: 'eda.dmt_EditorControl.openDocument',
    owner: 'dmt',
    summary: 'Open a project document by UUID.',
    signatureText: 'openDocument(uuid: string): Promise<string | undefined>',
  },
  {
    fullName: 'eda.dmt_Schematic.getAllSchematicsInfo',
    owner: 'dmt sch schematic',
    summary: 'List schematic documents in the current project.',
    signatureText: 'getAllSchematicsInfo(): Promise<Array<IDMT_SchematicItem>>',
  },
  {
    fullName: 'eda.dmt_Schematic.getAllSchematicPagesInfo',
    owner: 'dmt sch schematic',
    summary: 'List schematic pages in the current project.',
    signatureText: 'getAllSchematicPagesInfo(): Promise<Array<IDMT_SchematicPageItem>>',
  },
  {
    fullName: 'eda.sch_PrimitiveComponent.create',
    owner: 'sch schematic',
    summary: 'Place a schematic component from an EasyEDA device reference.',
    signatureText: 'create(component: {libraryUuid: string; uuid: string}, x: number, y: number, subPartName?: string, rotation?: number, mirror?: boolean, addIntoBom?: boolean, addIntoPcb?: boolean): Promise<ISCH_PrimitiveComponent | undefined>',
  },
  {
    fullName: 'eda.sch_PrimitiveComponent.getAll',
    owner: 'sch schematic',
    summary: 'Read schematic components from the active page or all pages.',
    signatureText: 'getAll(componentType?: ESCH_PrimitiveComponentType, allSchematicPages?: boolean): Promise<Array<ISCH_PrimitiveComponent>>',
  },
  {
    fullName: 'eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId',
    owner: 'sch schematic',
    summary: 'Read all pins associated with a schematic component primitive.',
    signatureText: 'getAllPinsByPrimitiveId(primitiveId: string): Promise<Array<ISCH_PrimitiveComponentPin> | undefined>',
  },
  {
    fullName: 'eda.sch_PrimitiveComponent.delete',
    owner: 'sch schematic',
    summary: 'Delete schematic components by primitive id.',
    signatureText: 'delete(primitiveIds: string | Array<string>): Promise<boolean>',
  },
  {
    fullName: 'eda.sch_PrimitiveWire.create',
    owner: 'sch schematic',
    summary: 'Create schematic wires with an optional net name.',
    signatureText: 'create(line: Array<number> | Array<Array<number>>, net?: string, color?: string | null, lineWidth?: number | null, lineType?: ESCH_PrimitiveLineType | null): Promise<ISCH_PrimitiveWire | undefined>',
  },
  {
    fullName: 'eda.sch_PrimitiveWire.getAll',
    owner: 'sch schematic',
    summary: 'Read all schematic wires, optionally filtered by net.',
    signatureText: 'getAll(net?: string | Array<string>): Promise<Array<ISCH_PrimitiveWire>>',
  },
  {
    fullName: 'eda.sch_PrimitiveWire.delete',
    owner: 'sch schematic',
    summary: 'Delete schematic wires by primitive id.',
    signatureText: 'delete(primitiveIds: string | Array<string>): Promise<boolean>',
  },
  {
    fullName: 'eda.sch_PrimitiveComponent.createNetFlag',
    owner: 'sch schematic',
    summary: 'Create schematic power or ground net flags.',
    signatureText: "createNetFlag(identification: 'Power' | 'Ground' | 'AnalogGround' | 'ProtectGround', net: string, x: number, y: number, rotation?: number, mirror?: boolean): Promise<ISCH_PrimitiveComponent | undefined>",
  },
  {
    fullName: 'eda.sch_PrimitiveComponent.createNetPort',
    owner: 'sch schematic',
    summary: 'Create schematic net ports.',
    signatureText: "createNetPort(direction: 'IN' | 'OUT' | 'BI', net: string, x: number, y: number, rotation?: number, mirror?: boolean): Promise<ISCH_PrimitiveComponent | undefined>",
  },
  {
    fullName: 'eda.sch_PrimitiveText.create',
    owner: 'sch schematic',
    summary: 'Create schematic text.',
    signatureText: 'create(x: number, y: number, content: string, rotation?: number, textColor?: string | null, fontName?: string | null, fontSize?: number | null, bold?: boolean, italic?: boolean, underLine?: boolean, alignMode?: number): Promise<ISCH_PrimitiveText | undefined>',
  },
  {
    fullName: 'eda.sch_Drc.check',
    owner: 'sch schematic',
    summary: 'Run schematic electrical rule check.',
    signatureText: 'check(strict?: boolean, showDialog?: boolean): Promise<boolean>',
  },
  {
    fullName: 'eda.sch_Document.save',
    owner: 'sch schematic',
    summary: 'Save the active schematic document.',
    signatureText: 'save(): Promise<boolean>',
  },
  {
    fullName: 'eda.lib_Device.search',
    owner: 'lib library',
    summary: 'Search EasyEDA devices by keyword.',
    signatureText: 'search(keyword: string, libraryUuid?: string, ...): Promise<Array<ILIB_DeviceSearchItem>>',
  },
  {
    fullName: 'eda.lib_Device.getByLcscIds',
    owner: 'lib library',
    summary: 'Find devices by LCSC part number.',
    signatureText: 'getByLcscIds(lcscIds: string | Array<string>, libraryUuid?: string, allowMultiMatch?: boolean): Promise<ILIB_DeviceItem | Array<ILIB_DeviceItem>>',
  },
  {
    fullName: 'eda.pcb_PrimitiveComponent.create',
    owner: 'pcb',
    summary: 'Place a PCB component from an EasyEDA device reference.',
    signatureText: 'create(component: {libraryUuid: string; uuid: string}, layer: number, x: number, y: number, rotation?: number, mirror?: boolean): Promise<IPCB_PrimitiveComponent | undefined>',
  },
  {
    fullName: 'eda.pcb_Drc.check',
    owner: 'pcb',
    summary: 'Run PCB DRC.',
    signatureText: 'check(...args: unknown[]): Promise<boolean>',
  },
];

function jsonText(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function filterApiIndex(owner?: string) {
  const needle = String(owner || '').trim().toLowerCase();
  if (!needle) return API_INDEX;
  return API_INDEX.filter((entry) =>
    `${entry.fullName} ${entry.owner} ${entry.summary}`.toLowerCase().includes(needle),
  );
}

function searchApi(query: string, owner?: string, limit = 10) {
  const terms = query.toLowerCase().split(/[\s,./:_-]+/).filter(Boolean);
  const rows = filterApiIndex(owner)
    .map((entry) => {
      const haystack = `${entry.fullName} ${entry.owner} ${entry.summary} ${entry.signatureText}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.fullName.localeCompare(b.fullName));
  return rows.slice(0, Math.max(1, Math.min(50, limit)));
}

export function registerApiTools(server: any, bridge: BridgeClient) {
  server.tool('eda_context', 'Read current EasyEDA project/document/page context.', {
    scope: z.string().optional().describe('Optional caller-provided context label'),
  }, async ({ scope }: { scope?: string }) => {
    const data = await bridge.command('get_eda_context', { scope });
    return jsonText(data);
  });

  server.tool('api_index', 'List curated EasyEDA API entries useful for Codex tool planning.', {
    owner: z.string().optional().describe('Optional namespace filter, e.g. sch, pcb, lib, dmt'),
  }, async ({ owner }: { owner?: string }) => {
    const index = filterApiIndex(owner);
    return jsonText({ ok: true, total: index.length, index });
  });

  server.tool('api_search', 'Search curated EasyEDA API signatures before using api_invoke.', {
    query: z.string().describe('Search terms such as create wire, get pins, lib search'),
    owner: z.string().optional().describe('Optional namespace filter, e.g. sch, pcb, lib, dmt'),
    limit: z.number().optional().describe('Maximum results, 1-50'),
  }, async ({ query, owner, limit }: { query: string; owner?: string; limit?: number }) => {
    const items = searchApi(query, owner, limit ?? 10);
    return jsonText({ query, owner: owner || '', returnedCount: items.length, items });
  });

  server.tool('api_invoke', 'Invoke a verified EasyEDA API path. Use api_search first to confirm the signature.', {
    apiFullName: z.string().describe('Full API path, e.g. eda.sch_Document.save'),
    args: z.array(z.any()).optional().describe('Arguments in signature order'),
  }, async ({ apiFullName, args }: { apiFullName: string; args?: unknown[] }) => {
    const data = await bridge.command('invoke_eda_api', { apiFullName, args: args ?? [] });
    return jsonText(data);
  });
}
