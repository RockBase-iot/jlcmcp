import { z } from 'zod';
import { BridgeClient } from '../bridge-client.js';

const coordLineSchema = z.union([
  z.array(z.number()).min(4).describe('Coordinate array, e.g. [x1,y1,x2,y2]'),
  z.array(z.array(z.number()).min(4)).describe('Multiple coordinate arrays'),
]);

function jsonText(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

export function registerSchematicTools(server: any, bridge: BridgeClient) {
  server.tool('sch_get_state', 'Read schematic state', {}, async () => {
    const data = await bridge.command('get_schematic_state');
    return jsonText(data);
  });

  server.tool('schematic_read', 'Read a semantic snapshot of the current schematic page', {}, async () => {
    const data = await bridge.command('read_schematic');
    return jsonText(data);
  });

  server.tool('schematic_review', 'Read a project-wide schematic review snapshot across pages', {}, async () => {
    const data = await bridge.command('review_schematic');
    return jsonText(data);
  });

  server.tool('sch_get_netlist', 'Export schematic netlist', {
    type: z.string().optional().describe('Netlist format'),
  }, async ({ type }: { type?: string }) => {
    const params: Record<string, unknown> = {};
    if (type) params.type = type;
    const data = await bridge.command('get_netlist', params);
    return jsonText(data);
  });

  server.tool('sch_run_drc', 'Run schematic DRC', {
    strict: z.boolean().optional().describe('Strict mode, default true'),
  }, async ({ strict }: { strict?: boolean }) => {
    const params: Record<string, unknown> = {};
    if (strict !== undefined) params.strict = strict;
    const data = await bridge.command('run_sch_drc', params);
    return jsonText(data);
  });

  server.tool('sch_save', 'Save the active schematic document', {}, async () => {
    const data = await bridge.command('save_schematic');
    return jsonText(data);
  });

  server.tool('sch_clear_page', 'Delete schematic primitives from the current page', {
    includeComponents: z.boolean().optional().describe('Delete components and net flags/ports, default true'),
    includeWires: z.boolean().optional().describe('Delete wires, default true'),
    includeText: z.boolean().optional().describe('Delete text, default true'),
  }, async (args: { includeComponents?: boolean; includeWires?: boolean; includeText?: boolean }) => {
    const data = await bridge.command('clear_schematic_page', args as Record<string, unknown>);
    return jsonText(data);
  });

  server.tool('sch_get_component_pins', 'Read pins for a schematic component primitive', {
    primitiveId: z.string().describe('Component primitive id'),
  }, async ({ primitiveId }: { primitiveId: string }) => {
    const data = await bridge.command('get_schematic_component_pins', { primitiveId });
    return jsonText(data);
  });

  server.tool('lib_search_devices', 'Search EasyEDA library devices', {
    keyword: z.string().describe('Search keyword, e.g. PCF8575'),
    libraryUuid: z.string().optional().describe('Optional library UUID'),
    itemsOfPage: z.number().optional().describe('Results per page, default 10'),
    page: z.number().optional().describe('Page number, default 1'),
  }, async (args: { keyword: string; libraryUuid?: string; itemsOfPage?: number; page?: number }) => {
    const data = await bridge.command('search_library_devices', args as Record<string, unknown>);
    return jsonText(data);
  });

  server.tool('lib_get_devices_by_lcsc', 'Get EasyEDA library devices by LCSC C number', {
    lcscIds: z.union([z.string(), z.array(z.string())]).describe('LCSC C number or list of C numbers'),
    libraryUuid: z.string().optional().describe('Optional library UUID'),
    allowMultiMatch: z.boolean().optional().describe('Allow multiple matches'),
  }, async (args: { lcscIds: string | string[]; libraryUuid?: string; allowMultiMatch?: boolean }) => {
    const data = await bridge.command('get_library_devices_by_lcsc', args as Record<string, unknown>);
    return jsonText(data);
  });

  server.tool('sch_create_component', 'Place schematic component', {
    libraryUuid: z.string().describe('Library UUID'),
    componentUuid: z.string().describe('Device UUID'),
    x: z.number().describe('Schematic X coordinate, 0.01 inch units'),
    y: z.number().describe('Schematic Y coordinate, 0.01 inch units'),
    subPartName: z.string().optional().describe('Subpart name for multi-part symbols'),
    rotation: z.number().optional().describe('Rotation degrees, default 0'),
    mirror: z.boolean().optional().describe('Mirror symbol'),
    addIntoBom: z.boolean().optional().describe('Add to BOM'),
    addIntoPcb: z.boolean().optional().describe('Transfer to PCB'),
    designator: z.string().optional().describe('Designator, e.g. U1'),
    name: z.string().optional().describe('Displayed component name'),
  }, async (args: {
    libraryUuid: string;
    componentUuid: string;
    x: number;
    y: number;
    subPartName?: string;
    rotation?: number;
    mirror?: boolean;
    addIntoBom?: boolean;
    addIntoPcb?: boolean;
    designator?: string;
    name?: string;
  }) => {
    const data = await bridge.command('create_schematic_component', {
      component: { libraryUuid: args.libraryUuid, uuid: args.componentUuid },
      x: args.x,
      y: args.y,
      subPartName: args.subPartName,
      rotation: args.rotation,
      mirror: args.mirror,
      addIntoBom: args.addIntoBom,
      addIntoPcb: args.addIntoPcb,
      designator: args.designator,
      name: args.name,
    });
    return jsonText(data);
  });

  server.tool('sch_create_wire', 'Create schematic wire', {
    line: coordLineSchema,
    net: z.string().optional().describe('Optional net name'),
    color: z.string().nullable().optional().describe('Line color; null uses default'),
    lineWidth: z.number().nullable().optional().describe('Line width; null uses default'),
    lineType: z.string().nullable().optional().describe('Line type; null uses default'),
  }, async (args: {
    line: number[] | number[][];
    net?: string;
    color?: string | null;
    lineWidth?: number | null;
    lineType?: string | null;
  }) => {
    const data = await bridge.command('create_schematic_wire', args as Record<string, unknown>);
    return jsonText(data);
  });

  server.tool('sch_create_net_flag', 'Create schematic power or ground net flag', {
    identification: z.enum(['Power', 'Ground', 'AnalogGround', 'ProtectGround']).describe('Flag type'),
    net: z.string().describe('Net name, e.g. +3V3 or GND'),
    x: z.number().describe('X coordinate'),
    y: z.number().describe('Y coordinate'),
    rotation: z.number().optional().describe('Rotation degrees, default 0'),
    mirror: z.boolean().optional().describe('Mirror flag'),
  }, async (args: {
    identification: 'Power' | 'Ground' | 'AnalogGround' | 'ProtectGround';
    net: string;
    x: number;
    y: number;
    rotation?: number;
    mirror?: boolean;
  }) => {
    const data = await bridge.command('create_schematic_net_flag', args);
    return jsonText(data);
  });

  server.tool('sch_create_net_port', 'Create schematic net port', {
    direction: z.enum(['IN', 'OUT', 'BI']).describe('Port direction'),
    net: z.string().describe('Net name'),
    x: z.number().describe('X coordinate'),
    y: z.number().describe('Y coordinate'),
    rotation: z.number().optional().describe('Rotation degrees, default 0'),
    mirror: z.boolean().optional().describe('Mirror port'),
  }, async (args: {
    direction: 'IN' | 'OUT' | 'BI';
    net: string;
    x: number;
    y: number;
    rotation?: number;
    mirror?: boolean;
  }) => {
    const data = await bridge.command('create_schematic_net_port', args);
    return jsonText(data);
  });

  server.tool('sch_create_text', 'Create schematic text', {
    x: z.number().describe('X coordinate'),
    y: z.number().describe('Y coordinate'),
    content: z.string().describe('Text content'),
    rotation: z.number().optional().describe('Rotation degrees, default 0'),
    textColor: z.string().nullable().optional().describe('Text color; null uses default'),
    fontName: z.string().nullable().optional().describe('Font name; null uses default'),
    fontSize: z.number().nullable().optional().describe('Font size; null uses default'),
    bold: z.boolean().optional().describe('Bold'),
    italic: z.boolean().optional().describe('Italic'),
    underLine: z.boolean().optional().describe('Underline'),
    alignMode: z.number().optional().describe('Alignment mode'),
  }, async (args: {
    x: number;
    y: number;
    content: string;
    rotation?: number;
    textColor?: string | null;
    fontName?: string | null;
    fontSize?: number | null;
    bold?: boolean;
    italic?: boolean;
    underLine?: boolean;
    alignMode?: number;
  }) => {
    const data = await bridge.command('create_schematic_text', args as Record<string, unknown>);
    return jsonText(data);
  });

  server.tool('pcb_open_document', 'Open document by UUID', {
    uuid: z.string().describe('Document UUID'),
  }, async ({ uuid }: { uuid: string }) => {
    const data = await bridge.command('open_document', { uuid });
    return jsonText(data ?? { success: true });
  });
}
