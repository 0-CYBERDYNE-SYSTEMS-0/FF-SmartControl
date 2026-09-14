import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
// @ts-expect-error - JS rig module, no types
import { createMockDevice } from '../scripts/mock-http-device.js';
import { createHttpClient } from '../src/hal/http-devices.js';

// Rung-1 proof: the controller's REAL HTTP driver code talks to a faithful
// software emulator of a Tasmota plug and a Shelly relay (Gen1+Gen2). A pass
// means the driver works against the real protocol — no hardware required.

let server: any;
let host: string;

before(async () => {
  const dev = createMockDevice({ wattsWhenOn: 60, startOn: true });
  server = dev.server;
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const port = (server.address() as AddressInfo).port;
  host = `127.0.0.1:${port}`;
});

after(() => server?.close());

test('Tasmota: real driver turns the plug off, on, and reads watts', async () => {
  const c = await createHttpClient(host, 'tasmota');
  await c.setPower(false);
  let s = await c.getPower();
  assert.equal(s.state, 'off');

  await c.setPower(true);
  s = await c.getPower();
  assert.equal(s.state, 'on');
  assert.equal(s.watts, 60); // from Status 8 -> StatusSNS.ENERGY.Power
});

test('Shelly Gen2: real driver controls + reads via RPC', async () => {
  const c = await createHttpClient(host, 'shelly');
  await c.setPower(false);
  let s = await c.getPower();
  assert.equal(s.state, 'off');
  assert.equal(s.watts, 0);

  await c.setPower(true);
  s = await c.getPower();
  assert.equal(s.state, 'on');
  assert.equal(s.watts, 60); // from /rpc/Switch.GetStatus apower
});
