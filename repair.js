const fs = require('fs');
const path = 'c:/Users/henri/Downloads/calendario/claude/v3/index.html';
let content = fs.readFileSync(path, 'utf8');
let lines = content.split('\n');

// Fix line 2883 (index 2882)
lines[2882] = '    document.querySelectorAll(\'.resp-checkbox\').forEach(cb => { cb.checked = selectedArr.includes(cb.value); });';

// Insert loadEventHistory before openAdminForm (openAdminForm starts at line 2867 -> index 2866)
const historyFunc = `
  async function loadEventHistory(id) {
    const historyList = document.getElementById(\'history-list\');
    if (!historyList) return;
    historyList.innerHTML = \'<div style=\"text-align:center;padding:20px;\"><i data-lucide=\"loader-2\" class=\"spin\"></i> Carregando histórico...</div>\';
    if(window.lucide) window.lucide.createIcons();
    try {
      const snap = await db.collection(\"events\").doc(id).collection(\"history\").orderBy(\"timestamp\", \"desc\").limit(10).get();
      let html = \'\';
      snap.forEach(doc => {
        const h = doc.data();
        const dateStr = h.timestamp?.toDate().toLocaleString(\'pt-BR\') || \'\';
        html += \'<div style=\"padding:8px; border-bottom:1px solid var(--border); font-size:0.8rem;\">\' +
                  \'<div style=\"font-weight:700; color:var(--accent);\">\' + (h.action || \"Ação\") + \' por \' + (h.user || \"Usuário\") + \'</div>\' +
                  \'<div style=\"color:var(--muted);\">\' + dateStr + \'</div>\' +
                \'</div>\';
      });
      historyList.innerHTML = html || \'<div style=\"text-align:center;padding:20px;color:var(--muted);\">Nenhum histórico disponível.</div>\';
    } catch(e) {
      historyList.innerHTML = \'<div style=\"color:var(--red); font-size:0.8rem;\">Erro ao carregar histórico.</div>\';
    }
  }
`;

lines.splice(2866, 0, historyFunc);

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('File repaired successfully.');
