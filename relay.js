import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.RELAY_PORT || 18800);
const HOST = process.env.RELAY_HOST || '127.0.0.1';
const PATH = process.env.RELAY_PATH || '/ws/bridge';
const HEARTBEAT_MS = Number(process.env.RELAY_HEARTBEAT_MS || 30000);

let bridgeSocket = null;
let bridgeInfo = null;
let commandCount = 0;
let resultCount = 0;
const pendingClients = new Map();

function now() {
  return new Date().toISOString();
}

function log(message) {
  console.log(`[${now()}] ${message}`);
}

function isOpen(ws) {
  return ws && ws.readyState === WebSocket.OPEN;
}

function sendJson(ws, payload) {
  if (!isOpen(ws)) return false;
  ws.send(JSON.stringify(payload));
  return true;
}

function makeResult(commandId, success, data, error, durationMs = 0) {
  return {
    type: 'result',
    id: commandId,
    timestamp: Date.now(),
    payload: {
      commandId,
      success,
      data,
      error,
      durationMs,
    },
  };
}

function statusPayload() {
  return {
    bridgeConnected: isOpen(bridgeSocket),
    bridge: bridgeInfo,
    pendingCommands: pendingClients.size,
    commandCount,
    resultCount,
    relay: {
      host: HOST,
      port: PORT,
      path: PATH,
      uptimeSec: Math.round(process.uptime()),
    },
  };
}

function getCommandId(message) {
  return typeof message?.id === 'string' ? message.id : '';
}

function getResultCommandId(message) {
  return String(message?.payload?.commandId || message?.commandId || message?.id || '');
}

function registerBridge(ws, message) {
  if (bridgeSocket && bridgeSocket !== ws && isOpen(bridgeSocket)) {
    sendJson(bridgeSocket, {
      type: 'event',
      event: 'bridge_replaced',
      timestamp: Date.now(),
      data: { reason: 'new bridge connected' },
    });
  }

  bridgeSocket = ws;
  bridgeInfo = {
    name: String(message?.name || message?.payload?.name || 'unknown'),
    version: String(message?.version || message?.payload?.version || 'unknown'),
    connectedAt: Date.now(),
  };
  ws.role = 'bridge';
  log(`bridge connected: ${bridgeInfo.name} ${bridgeInfo.version}`);
}

function ensureBridge(ws, reason = 'auto') {
  if (ws === bridgeSocket && isOpen(ws)) return;
  bridgeSocket = ws;
  bridgeInfo = {
    name: reason === 'pong' ? 'jlc-bridge' : 'unknown',
    version: 'unknown',
    connectedAt: Date.now(),
    detectedBy: reason,
  };
  ws.role = 'bridge';
  log(`bridge auto-detected by ${reason}`);
}

function handleCommand(ws, message) {
  const commandId = getCommandId(message);
  if (!commandId) {
    sendJson(ws, makeResult('unknown', false, undefined, 'command id is required'));
    return;
  }

  ws.role = ws.role || 'client';

  if (!isOpen(bridgeSocket)) {
    sendJson(ws, makeResult(
      commandId,
      false,
      undefined,
      `EDA bridge is not connected. Start JLC EDA, install/enable jlc-bridge, and keep this relay running at ws://${HOST}:${PORT}${PATH}.`,
    ));
    return;
  }

  pendingClients.set(commandId, ws);
  commandCount += 1;
  sendJson(bridgeSocket, message);
  log(`command forwarded: ${message.payload?.action || message.action || 'unknown'} (${commandId})`);
}

function handleResult(message) {
  const commandId = getResultCommandId(message);
  const client = pendingClients.get(commandId);
  if (!client) {
    log(`orphan result ignored: ${commandId || 'missing commandId'}`);
    return;
  }

  pendingClients.delete(commandId);
  resultCount += 1;
  sendJson(client, message);
  log(`result returned: ${commandId}`);
}

function rejectPendingForSocket(ws, reason) {
  for (const [commandId, client] of pendingClients.entries()) {
    if (client === ws || ws === bridgeSocket) {
      pendingClients.delete(commandId);
      sendJson(client, makeResult(commandId, false, undefined, reason));
    }
  }
}

const wss = new WebSocketServer({ host: HOST, port: PORT, path: PATH });

wss.on('connection', (ws, req) => {
  const remote = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
  log(`socket connected: ${remote}`);
  let firstMessageSeen = false;

  ws.on('message', (raw) => {
    if (!firstMessageSeen) {
      firstMessageSeen = true;
      const preview = raw.toString().slice(0, 300).replace(/\s+/g, ' ');
      log(`first message from ${remote}: ${preview}`);
    }

    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      sendJson(ws, { type: 'error', error: 'invalid JSON', timestamp: Date.now() });
      return;
    }

    if (message?.type === 'hello') {
      registerBridge(ws, message);
      sendJson(ws, { type: 'hello_ack', timestamp: Date.now(), bridge: bridgeInfo });
      return;
    }

    if (message?.type === 'ping') {
      sendJson(ws, { type: 'pong', id: message.id, timestamp: Date.now(), payload: statusPayload() });
      return;
    }

    if (message?.type === 'status') {
      sendJson(ws, { type: 'status', id: message.id, timestamp: Date.now(), payload: statusPayload() });
      return;
    }

    if (message?.type === 'pong') {
      ensureBridge(ws, 'pong');
      return;
    }

    if (message?.type === 'command') {
      handleCommand(ws, message);
      return;
    }

    if (message?.type === 'result') {
      ensureBridge(ws, 'result');
      handleResult(message);
      return;
    }

    if (message?.type === 'event') {
      log(`bridge event: ${message.event || 'unknown'}`);
      return;
    }

    sendJson(ws, { type: 'error', error: `unknown message type: ${message?.type}`, timestamp: Date.now() });
  });

  ws.on('close', () => {
    if (ws === bridgeSocket) {
      log('bridge disconnected');
      bridgeSocket = null;
      bridgeInfo = null;
      rejectPendingForSocket(ws, 'EDA bridge disconnected');
      return;
    }

    rejectPendingForSocket(ws, 'MCP client disconnected');
    log(`socket disconnected: ${remote}`);
  });

  ws.on('error', (error) => {
    log(`socket error: ${error.message}`);
  });
});

wss.on('listening', () => {
  log(`relay listening on ws://${HOST}:${PORT}${PATH}`);
});

wss.on('error', (error) => {
  console.error(`[${now()}] relay error: ${error.message}`);
  process.exitCode = 1;
});

setInterval(() => {
  if (isOpen(bridgeSocket)) {
    sendJson(bridgeSocket, { type: 'ping', id: `relay-${Date.now()}`, timestamp: Date.now() });
  }
}, HEARTBEAT_MS).unref();
