const test = require('node:test');
const assert = require('node:assert');
const { escapeHtml } = require('../js/utils.js');

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
