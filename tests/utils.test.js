const test = require('node:test');
const assert = require('node:assert');
const { escapeHtml, fmtBRL, parseDate } = require('../js/utils.js');

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

test('parseDate utility', async (t) => {
  await t.test('parses standard YYYY-MM-DD date strings', () => {
    const date = parseDate('2023-10-15');
    assert.strictEqual(date.getFullYear(), 2023);
    assert.strictEqual(date.getMonth(), 9); // October is month 9 (0-indexed)
    assert.strictEqual(date.getDate(), 15);
  });

  await t.test('handles empty, null, or undefined strings by returning null', () => {
    assert.strictEqual(parseDate(''), null);
    assert.strictEqual(parseDate(null), null);
    assert.strictEqual(parseDate(undefined), null);
  });

  await t.test('handles single digit month and day', () => {
    const date = parseDate('2024-05-08');
    assert.strictEqual(date.getFullYear(), 2024);
    assert.strictEqual(date.getMonth(), 4);
    assert.strictEqual(date.getDate(), 8);
  });

  await t.test('handles invalid date strings gracefully', () => {
    // Note: new Date with invalid parts will result in an Invalid Date object
    // Depending on split('-') implementation it may be parsed differently,
    // e.g. "not-a-date".split('-') => ["not", "a", "date"] => [NaN, NaN, NaN]
    const date = parseDate('not-a-date');
    assert.strictEqual(isNaN(date.getTime()), true);
  });
});
