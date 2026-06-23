# jlcmcp

`jlcmcp` is a local MCP toolchain for controlling 嘉立创EDA from Codex or any MCP client.

```text
Codex / MCP client
  -> node dist/index.js
  -> relay.js at ws://127.0.0.1:18800/ws/bridge
  -> jlc-bridge EasyEDA extension
  -> 嘉立创EDA editor
```

The project contains:

- `src/`: the MCP server exposed over stdio.
- `relay.js`: the local WebSocket relay used by both the MCP server and the EasyEDA extension.
- `jlc-bridge/`: the EasyEDA extension packaged as `.eext` / `.lcex`.

## Requirements

- Node.js 18+
- 嘉立创EDA desktop client with extension support
- The `jlc-bridge` extension installed and enabled in 嘉立创EDA

## Build

```bash
npm install
npm run build

cd jlc-bridge
npm install
npm run build
```

The extension package is generated at:

```text
D:\github\jlcmcp\jlc-bridge\build\jlc-bridge.eext
```

Install this file in 嘉立创EDA Extension Manager, then restart or reload the extension.

## Start Relay

Run the relay in a separate terminal before using MCP tools:

```bash
npm run relay
```

Expected log:

```text
relay listening on ws://127.0.0.1:18800/ws/bridge
bridge connected: JLC Bridge 0.1.15
```

Relay environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `RELAY_HOST` | `127.0.0.1` | Relay host |
| `RELAY_PORT` | `18800` | Relay port |
| `RELAY_PATH` | `/ws/bridge` | WebSocket path |
| `RELAY_HEARTBEAT_MS` | `30000` | Bridge heartbeat interval |

## Codex MCP Config

Add this to your Codex MCP configuration:

```json
{
  "mcpServers": {
    "jlceda": {
      "command": "node",
      "args": ["<path-to>/jlcmcp/dist/index.js"],
      "env": {
        "GATEWAY_WS_URL": "ws://127.0.0.1:18800/ws/bridge"
      }
    }
  }
}
```

After changing the config, restart Codex or reload the MCP server.

## Useful Checks

List tools without needing 嘉立创EDA:

```powershell
$inputJson = @'
{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"check","version":"1.0"}},"id":0}
{"jsonrpc":"2.0","method":"tools/list","id":1}
'@; $inputJson | node dist/index.js
```

Check the live bridge:

```powershell
$inputJson = @'
{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"check","version":"1.0"}},"id":0}
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"pcb_ping","arguments":{}},"id":1}
{"jsonrpc":"2.0","method":"tools/call","params":{"name":"eda_context","arguments":{}},"id":2}
'@; $inputJson | node dist/index.js
```

## Tool Groups

### General EDA/API Tools

These tools are inspired by the workflow in [sengbin/JLCEDA-MCP](https://github.com/sengbin/JLCEDA-MCP) and adapted to this repo's relay/bridge protocol.

| Tool | Purpose |
| --- | --- |
| `eda_context` | Read current project, active document, current schematic/PCB page, and selected primitive ids |
| `api_index` | List curated EasyEDA API entries useful for planning |
| `api_search` | Search curated API signatures before using raw invocation |
| `api_invoke` | Invoke a verified `eda.*` API path through the bridge |

Use `api_search` before `api_invoke`; do not guess method signatures.

### Schematic Tools

| Tool | Purpose |
| --- | --- |
| `schematic_read` | Read a semantic snapshot of the current schematic page |
| `schematic_review` | Read project-wide schematic/page metadata plus current-page snapshot |
| `sch_get_state` | Read schematic components, pins, and wires |
| `sch_get_component_pins` | Read all pins for a component primitive id |
| `sch_get_netlist` | Export schematic netlist when supported by the current EasyEDA build |
| `sch_run_drc` | Run schematic DRC |
| `sch_save` | Save the active schematic document |
| `sch_clear_page` | Delete schematic primitives from the current page |
| `sch_create_component` | Place a schematic component by library UUID and device UUID |
| `sch_create_wire` | Create schematic wires |
| `sch_create_net_flag` | Create power or ground net flags |
| `sch_create_net_port` | Create IN/OUT/BI net ports |
| `sch_create_text` | Add schematic text |
| `lib_search_devices` | Search EasyEDA/LCSC devices |
| `lib_get_devices_by_lcsc` | Resolve devices by LCSC C number |
| `pcb_open_document` | Open a document by UUID |

Schematic coordinates use EasyEDA schematic units: `1 unit = 0.01 inch`.

### PCB Tools

| Group | Tools |
| --- | --- |
| State | `pcb_get_state`, `pcb_screenshot`, `pcb_run_drc`, `pcb_get_tracks`, `pcb_get_pads`, `pcb_get_net_primitives`, `pcb_get_board_info`, `pcb_get_feature_support`, `pcb_ping` |
| Components | `pcb_move_component`, `pcb_relocate_component`, `pcb_batch_move`, `pcb_select_component`, `pcb_delete_selected`, `pcb_create_component` |
| Routing | `pcb_route_track`, `pcb_create_via`, `pcb_delete_tracks`, `pcb_delete_via` |
| Copper/keepout | `pcb_create_copper_pour`, `pcb_delete_pour`, `pcb_create_keepout`, `pcb_delete_keepout` |
| Silkscreen | `pcb_get_silkscreens`, `pcb_move_silkscreen`, `pcb_auto_silkscreen` |
| Constraints | `pcb_create_diff_pair`, `pcb_list_diff_pairs`, `pcb_delete_diff_pair`, `pcb_create_equal_length`, `pcb_list_equal_lengths`, `pcb_delete_equal_length` |
| Calculators | `calc_impedance`, `calc_trace_width` |

PCB coordinates use mil units.

## Extension Notes

`jlc-bridge` version `0.1.15` supports:

- WebSocket-first transport through `sys_WebSocket` or native WebSocket.
- File polling fallback when WebSocket is unavailable.
- Auto-start on extension activation.
- Menu registration on schematic and PCB pages.
- EasyEDA v3-compatible `engines.eda` range.

## Troubleshooting

If `pcb_ping` times out:

1. Confirm `npm run relay` is running.
2. Confirm relay logs show `bridge connected`.
3. In 嘉立创EDA, open the extension manager and make sure `JLC Bridge` is installed and enabled.
4. If port `18800` is occupied by a stale relay, close the old Node process and start `npm run relay` again.
5. Reinstall `jlc-bridge/build/jlc-bridge.eext` after bridge source changes.

If schematic creation succeeds but DRC fails:

- Use `sch_get_component_pins` after placing components.
- Wire to actual pin coordinates with `sch_create_wire`.
- Use net ports/flags only as labels for the intended net.

## Development

Main files:

```text
src/index.ts                  MCP server entry
src/bridge-client.ts          WebSocket client for relay.js
src/tools/*.ts                MCP tool registrations
relay.js                      WebSocket relay
jlc-bridge/src/index.ts       EasyEDA extension runtime
jlc-bridge/extension.json     EasyEDA extension manifest
```

Build both sides before reinstalling the extension:

```bash
npm run build
cd jlc-bridge
npm run build
```

## License

MIT
