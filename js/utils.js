function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"'/]/g, function (s) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    }[s];
  }).replace(/\n/g, '<br>');
}

function fmtBRL(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getRespArray(str) {
  return !str ? [] : str.split(',').map(s=>s.trim()).filter(s=>s);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml, fmtBRL, getRespArray };
}
