import assert from 'node:assert/strict';
import test from 'node:test';
import { getAuthSubmitLabel } from '../src/components/auth/authPortalMeta.ts';

test('auth submit labels describe login and register loading states', () => {
  assert.equal(getAuthSubmitLabel({ mode: 'login', loading: false }), '揭开帷幕');
  assert.equal(getAuthSubmitLabel({ mode: 'login', loading: true }), '连接中...');
  assert.equal(getAuthSubmitLabel({ mode: 'register', loading: false }), '接受召唤');
  assert.equal(getAuthSubmitLabel({ mode: 'register', loading: true }), '缔结契约...');
});
