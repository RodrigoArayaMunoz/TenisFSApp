import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';

const source = await readFile(new URL('../utils/whatsapp.js', import.meta.url), 'utf8');
const makeShare = (dependencies) => vm.runInNewContext(
  source.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '') + '\n({openWhatsAppShare,buildWhatsAppLinks});',
  dependencies,
);

test('native WhatsApp opens the app first and falls back to the share URL', async () => {
  const urls = [];
  const share = makeShare({ Platform: { OS: 'ios' }, Linking: { openURL: async (url) => { urls.push(url); if (urls.length === 1) throw new Error('App unavailable'); } } });
  const message = '🎾 Álex vs Rodrigo\n18:30 hrs.';
  await share.openWhatsAppShare(message);
  assert.equal(urls[0], `whatsapp://send?text=${encodeURIComponent(message)}`);
  assert.equal(urls[1], `https://wa.me/?text=${encodeURIComponent(message)}`);
});

test('Android web uses an intent and the same encoded message in its fallback', async () => {
  const urls = [];
  let fallback;
  const share = makeShare({
    Platform: { OS: 'web' }, navigator: { userAgent: 'Android' },
    window: {
      addEventListener: () => {}, removeEventListener: () => {},
      setTimeout: (callback, delay) => { assert.equal(delay, 1600); fallback = callback; return 1; },
      clearTimeout: () => {}, location: { assign: (url) => urls.push(url) },
    },
  });
  await share.openWhatsAppShare('Liga B\nJugador A vs Jugador B');
  assert.ok(urls[0].startsWith('intent://send?text='));
  assert.ok(urls[0].endsWith('#Intent;scheme=whatsapp;end'));
  fallback();
  assert.equal(new URL(urls[1]).searchParams.get('text'), 'Liga B\nJugador A vs Jugador B');
});

test('opening the external app cancels web fallback and cleans up listeners', async () => {
  const events = new Map();
  const urls = [];
  let cleared = false;
  const share = makeShare({
    Platform: { OS: 'web' }, navigator: { userAgent: 'iPhone' },
    window: {
      addEventListener: (name, callback) => events.set(name, callback),
      removeEventListener: (name) => events.delete(name),
      setTimeout: () => 1, clearTimeout: () => { cleared = true; },
      location: { assign: (url) => urls.push(url) },
    },
  });
  await share.openWhatsAppShare('Partido guardado');
  events.get('blur')();
  assert.equal(cleared, true);
  assert.equal(events.size, 0);
  assert.equal(urls.length, 1);
  assert.ok(urls[0].startsWith('whatsapp://'));
});
