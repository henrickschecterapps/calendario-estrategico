const test = require('node:test');
const assert = require('node:assert');
const { escapeHtml, fmtBRL, timeAgo } = require('../js/utils.js');

test('escapeHtml utility', async (t) => {
  await t.test('escapes basic HTML entities', () => {
    assert.strictEqual(escapeHtml('&'), '&amp;');
    assert.strictEqual(escapeHtml('<'), '&lt;');
    assert.strictEqual(escapeHtml('>'), '&gt;');
  });

  await t.test('escapes quotes', () => {
    assert.strictEqual(escapeHtml('"'), '&quot;');
    assert.strictEqual(escapeHtml("'"), '&#39;');
  });

  await t.test('escapes forward slash', () => {
    assert.strictEqual(escapeHtml('/'), '&#x2F;');
  });

  await t.test('converts newlines to <br>', () => {
    assert.strictEqual(escapeHtml('hello\nworld'), 'hello<br>world');
    assert.strictEqual(escapeHtml('\n'), '<br>');
  });

  await t.test('handles multiple characters', () => {
    assert.strictEqual(
      escapeHtml('<script>alert("xss")</script>'),
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    );
  });

  await t.test('handles empty, null, or undefined', () => {
    assert.strictEqual(escapeHtml(''), '');
    assert.strictEqual(escapeHtml(null), '');
    assert.strictEqual(escapeHtml(undefined), '');
  });

  await t.test('handles normal text without changes', () => {
    assert.strictEqual(escapeHtml('Hello World 123'), 'Hello World 123');
  });
});

test('fmtBRL utility', async (t) => {
  // Save original language/locale settings if we were to change them,
  // but toLocaleString will run in the Node.js environment's context.
  // We can check strings by normalising non-breaking spaces that toLocaleString uses.
  const normalize = (str) => str.replace(/\s/g, ' ');

  await t.test('formats positive integers correctly', () => {
    assert.strictEqual(normalize(fmtBRL(100)), normalize('R$ 100,00'));
    assert.strictEqual(normalize(fmtBRL(1234)), normalize('R$ 1.234,00'));
  });

  await t.test('formats floats correctly', () => {
    assert.strictEqual(normalize(fmtBRL(100.5)), normalize('R$ 100,50'));
    assert.strictEqual(normalize(fmtBRL(1234.56)), normalize('R$ 1.234,56'));
  });

  await t.test('handles string inputs', () => {
    assert.strictEqual(normalize(fmtBRL('100')), normalize('R$ 100,00'));
    assert.strictEqual(normalize(fmtBRL('100.50')), normalize('R$ 100,50'));
  });

  await t.test('handles zero', () => {
    assert.strictEqual(normalize(fmtBRL(0)), normalize('R$ 0,00'));
    assert.strictEqual(normalize(fmtBRL('0')), normalize('R$ 0,00'));
  });

  await t.test('formats negative numbers correctly', () => {
    // Note: Node.js toLocaleString might format negative currency differently, usually -R$ 100,00 or R$ -100,00.
    // Let's use a dynamic check or exact match based on standard Node.js behavior.
    assert.strictEqual(normalize(fmtBRL(-100)), normalize('-R$ 100,00'));
  });

  await t.test('handles invalid inputs gracefully by treating as zero', () => {
    assert.strictEqual(normalize(fmtBRL(null)), normalize('R$ 0,00'));
    assert.strictEqual(normalize(fmtBRL(undefined)), normalize('R$ 0,00'));
    assert.strictEqual(normalize(fmtBRL('invalid')), normalize('R$ 0,00'));
    assert.strictEqual(normalize(fmtBRL({})), normalize('R$ 0,00'));
    assert.strictEqual(normalize(fmtBRL([])), normalize('R$ 0,00'));
  });
});

test('timeAgo utility', async (t) => {
  // We need to mock Date.now() or just use relative times since timeAgo uses `new Date()` internally for now

  await t.test('returns "agora" for times less than a minute ago', () => {
    const now = new Date();
    assert.strictEqual(timeAgo(now), 'agora');

    const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
    assert.strictEqual(timeAgo(thirtySecondsAgo), 'agora');
  });

  await t.test('returns "Xm atrás" for times minutes ago', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    assert.strictEqual(timeAgo(oneMinuteAgo), '1m atrás');

    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    assert.strictEqual(timeAgo(fiveMinutesAgo), '5m atrás');
  });

  await t.test('returns "Xh atrás" for times hours ago', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    assert.strictEqual(timeAgo(oneHourAgo), '1h atrás');

    const twoHoursAgo = new Date(now.getTime() - 2.5 * 60 * 60 * 1000);
    assert.strictEqual(timeAgo(twoHoursAgo), '2h atrás');
  });

  await t.test('returns "Xd atrás" for times days ago', () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    assert.strictEqual(timeAgo(oneDayAgo), '1d atrás');

    const tenDaysAgo = new Date(now.getTime() - 10.5 * 24 * 60 * 60 * 1000);
    assert.strictEqual(timeAgo(tenDaysAgo), '10d atrás');
  });

  await t.test('handles string inputs correctly', () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    assert.strictEqual(timeAgo(oneDayAgo.toISOString()), '1d atrás');
  });

  await t.test('handles numeric timestamp inputs correctly', () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    assert.strictEqual(timeAgo(oneDayAgo.getTime()), '1d atrás');
  });
});
