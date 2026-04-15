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

function parseDate(s) { if (!s) return null; const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); }
function fmtBRL(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml, fmtBRL, parseDate };
}
