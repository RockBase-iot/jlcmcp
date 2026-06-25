import { WebSocket } from 'ws';

export const DEFAULT_GATEWAY_WS_URL = 'ws://127.0.0.1:18800/ws/bridge';

export function gatewayUrl() {
  return process.env.GATEWAY_WS_URL || DEFAULT_GATEWAY_WS_URL;
}

export async function withBridge(callback, options = {}) {
  const ws = new WebSocket(options.url || gatewayUrl());
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

  const client = new BridgeClient(ws, options.prefix || 'script');
  try {
    return await callback(client);
  } finally {
    ws.close();
  }
}

export class BridgeClient {
  constructor(ws, prefix = 'script') {
    this.ws = ws;
    this.prefix = prefix;
  }

  request(action, params = {}, timeoutMs = 120000) {
    const id = `${this.prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.ws.off('message', onMessage);
        reject(new Error(`${action} timed out`));
      }, timeoutMs);

      const onMessage = (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        if (msg?.type !== 'result') return;
        const resultId = msg?.payload?.commandId || msg?.id;
        if (resultId !== id) return;

        clearTimeout(timer);
        this.ws.off('message', onMessage);
        if (!msg.payload?.success) {
          reject(new Error(msg.payload?.error || `${action} failed`));
          return;
        }
        resolve(msg.payload.data);
      };

      this.ws.on('message', onMessage);
      this.ws.send(JSON.stringify({ type: 'command', id, payload: { action, params } }));
    });
  }

  invoke(apiFullName, args = [], timeoutMs = 120000) {
    return this.request('invoke_eda_api', { apiFullName, args }, timeoutMs);
  }

  async currentContext(scope = 'script') {
    return this.request('get_eda_context', { scope });
  }

  async saveCurrentPcb(scope = 'save-current-pcb') {
    const context = await this.currentContext(scope);
    const uuid = context?.currentDocumentInfo?.uuid || '';
    if (!uuid) return null;
    return this.invoke('eda.pcb_Document.save', [uuid]);
  }
}

export function valueOf(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return '';
}
