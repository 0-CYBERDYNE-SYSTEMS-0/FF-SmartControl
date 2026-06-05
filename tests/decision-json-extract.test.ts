import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractDecisionJson } from '../src/agent/decision-loop.js';

test('parses plain JSON', () => {
  const o = extractDecisionJson('{"decision":"turn_on","device_id":"exhaust_fan"}');
  assert.equal(o?.decision, 'turn_on');
  assert.equal(o?.device_id, 'exhaust_fan');
});

test('parses JSON inside a markdown code fence', () => {
  const o = extractDecisionJson('Here:\n```json\n{"decision":"turn_off","device_id":"heater_plug"}\n```\n');
  assert.equal(o?.decision, 'turn_off');
});

test('parses JSON after reasoning-model prose (the bug that degraded to noop)', () => {
  const txt =
    'Let me think. Both tents are warm, so I should ventilate.\n' +
    '{"reasoning":"too hot","decision":"turn_on","device_id":"exhaust_fan","confidence":0.92}';
  const o = extractDecisionJson(txt);
  assert.equal(o?.decision, 'turn_on');
  assert.equal(o?.confidence, 0.92);
});

test('prefers the object that carries a decision field', () => {
  const txt =
    '{"note":"context only"} then the real one {"decision":"turn_off","device_id":"humidifier"}';
  const o = extractDecisionJson(txt);
  assert.equal(o?.decision, 'turn_off');
  assert.equal(o?.device_id, 'humidifier');
});

test('handles braces inside string values', () => {
  const o = extractDecisionJson('{"decision":"alert","reasoning":"value like {x} stays inside"}');
  assert.equal(o?.decision, 'alert');
  assert.match(o?.reasoning, /\{x\}/);
});

test('handles nested objects', () => {
  const o = extractDecisionJson('{"decision":"turn_on","args":{"device_id":"fan_1","speed":100}}');
  assert.equal(o?.decision, 'turn_on');
  assert.equal(o?.args.device_id, 'fan_1');
});

test('returns null on non-JSON text', () => {
  assert.equal(extractDecisionJson('no json here at all'), null);
  assert.equal(extractDecisionJson(''), null);
});
