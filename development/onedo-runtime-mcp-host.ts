/**
 * Native Messaging host for the local 1Do Wallet MCP bridge.
 *
 * Chrome owns stdin/stdout using the Native Messaging framing protocol. A
 * Wallet MCP process talks to this host over loopback HTTP; requests are
 * forwarded to the connected extension and responses are returned unchanged.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { chmodSync, randomBytes, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

type Message = { id?: string; method?: string; params?: Record<string, unknown>; result?: unknown; error?: string };
const portNumber = Number(process.env.ONEDO_WALLET_MCP_PORT ?? 8765);
const tokenPath = process.env.ONEDO_WALLET_MCP_TOKEN_FILE ?? join(tmpdir(), '1do-wallet-mcp.token');
const token = randomBytes(32).toString('hex');
writeFileSync(tokenPath, `${token}\n`, { mode: 0o600 });
chmodSync(tokenPath, 0o600);

const pending = new Map<string, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>();
let sequence = 0;
const readNativeMessage = (message: Message) => {
  if (!message.id) return;
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error));
  else request.resolve(message.result);
};

let input = Buffer.alloc(0);
process.stdin.on('data', (chunk: Buffer) => {
  input = Buffer.concat([input, chunk]);
  while (input.length >= 4) {
    const length = input.readUInt32LE(0);
    if (input.length < length + 4) break;
    const body = input.subarray(4, length + 4).toString('utf8');
    input = input.subarray(length + 4);
    try { readNativeMessage(JSON.parse(body) as Message); } catch { /* malformed host input is ignored */ }
  }
});

const sendNativeMessage = (message: Message) => {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  process.stdout.write(Buffer.concat([header, body]));
};

const forward = (method: string, params: Record<string, unknown>) => new Promise<unknown>((resolve, reject) => {
  const id = `http-${process.pid}-${sequence++}`;
  pending.set(id, { resolve, reject });
  sendNativeMessage({ id, method, params });
  setTimeout(() => {
    if (pending.delete(id)) reject(new Error('wallet_bridge_timeout'));
  }, 120_000).unref();
});

const body = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as { method?: string; params?: Record<string, unknown>; token?: string };
};

const respond = (response: ServerResponse, status: number, value: unknown) => {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(value));
};

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/healthz') return respond(response, 200, { status: 'ok' });
  if (request.method !== 'POST' || request.url !== '/rpc') return respond(response, 404, { error: 'not_found' });
  try {
    const input = await body(request);
    if (input.token !== token) return respond(response, 401, { error: 'unauthorized' });
    if (typeof input.method !== 'string' || !input.method.startsWith('wallet.')) return respond(response, 400, { error: 'wallet_method_required' });
    return respond(response, 200, { result: await forward(input.method, input.params ?? {}) });
  } catch (error) {
    return respond(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(portNumber, '127.0.0.1', () => {
  process.stderr.write(JSON.stringify({ port: portNumber, tokenFile: tokenPath }) + '\n');
});
