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

function timeAgo(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d atrás`;
  if (hours > 0) return `${hours}h atrás`;
  if (minutes > 0) return `${minutes}m atrás`;
  return 'agora';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml, fmtBRL, timeAgo };
}
