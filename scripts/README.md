# Reusable Scripts

This directory is for reusable project tooling. Keep board-specific drawing scripts, pin maps, layout experiments, generated Gerber extracts, and other one-off design assets under `designs/<project>/`; `designs/` is ignored by git.

## Bridge Helpers

These scripts talk to the running `jlc-bridge` relay through `GATEWAY_WS_URL`:

```powershell
node scripts/inspect-eda-project.js
node scripts/inspect-pcb-pads.js
node scripts/inspect-schematic-pins.js
node scripts/sync-pcb-from-schematic.js
```

The shared WebSocket client lives in `scripts/lib/bridge-client.js`.

## Gerber Helpers

Parse board outline and drill dimensions from an extracted Gerber directory:

```powershell
node scripts/parse-gerber-dimensions.js --input designs/reference-gerber/v1.2 --output designs/reference-gerber/dimensions.json --source Gerber.zip
```

The parser is intentionally generic and lives in `scripts/lib/gerber-dimensions.js`.

## Project Script Convention

Use this layout for board-specific automation:

```text
designs/
  my-board/
    scripts/
      draw-my-board.js
      assign-my-board-nets.js
```

If a project script starts becoming reusable, move only the reusable part into `scripts/lib/` and keep the project-specific configuration in `designs/<project>/scripts/`.
