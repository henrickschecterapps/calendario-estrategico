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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml };
}
