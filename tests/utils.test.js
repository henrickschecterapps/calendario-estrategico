const test = require('node:test');
const assert = require('node:assert');
const { escapeHtml, fmtBRL, getRespArray } = require('../js/utils.js');

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

test('getRespArray utility', async (t) => {
  await t.test('handles empty, null, or undefined strings', () => {
    assert.deepStrictEqual(getRespArray(''), []);
    assert.deepStrictEqual(getRespArray(null), []);
    assert.deepStrictEqual(getRespArray(undefined), []);
  });

  await t.test('parses basic comma-separated strings', () => {
    assert.deepStrictEqual(getRespArray('Alice, Bob, Charlie'), ['Alice', 'Bob', 'Charlie']);
  });

  await t.test('trims spaces around names', () => {
    assert.deepStrictEqual(getRespArray('  Alice  ,   Bob ,Charlie   '), ['Alice', 'Bob', 'Charlie']);
  });

  await t.test('ignores empty values between commas', () => {
    assert.deepStrictEqual(getRespArray('Alice,,Bob, ,Charlie,'), ['Alice', 'Bob', 'Charlie']);
  });
});
