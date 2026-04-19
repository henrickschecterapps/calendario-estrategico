const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// We will mock the necessary environment to run `renderCalendar` performance test.
const jsCode = html.match(/<script>([\s\S]*?)<\/script>/)[1];

const script = `
  let document = {
    getElementById: (id) => ({ textContent: '', innerHTML: '' }),
  };
  let calMonth = 5;
  let calYear = 2023;
  let today = new Date(2023, 5, 15);
  const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let filterType = 'all';
  let filterStatus = 'all';
  let filterFormato = 'all';
  let filterRespMulti = new Set();
  let filterDateFrom = null;
  let filterDateTo = null;
  let searchQ = '';

  function escapeHtml(str) { return str; }

  const EVENTS = [];
  for (let i = 0; i < 5000; i++) {
    EVENTS.push({
      id: 'mock_' + i,
      data_ini: '2023-06-' + (Math.floor(Math.random() * 28) + 1).toString().padStart(2, '0'),
      data_fim: '2023-06-' + (Math.floor(Math.random() * 28) + 1).toString().padStart(2, '0'),
      evento: 'Evento ' + i,
      tipo: 'Reunião',
    });
  }

  // extract necessary functions
  function parseDate(s) { if (!s) return null; const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
  function getRespArray(str) { return !str ? [] : str.split(',').map(s=>s.trim()).filter(s=>s); }

  function getFilteredEvents() {
    return EVENTS.filter(e => {
      if (filterType !== 'all' && e.tipo !== filterType) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      if (filterFormato !== 'all' && (e.formato||'').toLowerCase() !== filterFormato.toLowerCase()) return false;
      // Multi-responsável
      if (filterRespMulti.size > 0) {
        const respArr = getRespArray(e.responsavel, e);
        if (!respArr.some(r => filterRespMulti.has(r))) return false;
      }
      // Date range
      if (filterDateFrom || filterDateTo) {
        const ini = parseDate(e.data_ini), fim = parseDate(e.data_fim) || ini;
        if (!ini) return false;
        if (filterDateFrom && fim < filterDateFrom) return false;
        if (filterDateTo   && ini > filterDateTo)   return false;
      }
      if (searchQ) {
        const q = searchQ.toLowerCase();
        const fields = [e.evento, e.responsavel, e.participantes, e.publico, e.formato, e.status, e.tipo, e.obs, e.beneficios, e.localidade, e.links].map(f => (f||'').toLowerCase());
        if (!fields.some(f => f.includes(q))) return false;
      }
      return true;
    });
  }

  function renderCalendarOriginal() {
    document.getElementById('cal-month-label').textContent = \`\${MONTHS_PT[calMonth]} \${calYear}\`;
    const fd = new Date(calYear, calMonth, 1).getDay(), dim = new Date(calYear, calMonth+1, 0).getDate(), cells = Math.ceil((fd + dim) / 7) * 7, evMap = {};
    getFilteredEvents().forEach(e => { const ini = parseDate(e.data_ini), fim = parseDate(e.data_fim) || ini; if (!ini) return; let d = new Date(ini); while (d <= fim) { if(d.getFullYear()===calYear && d.getMonth()===calMonth){ if(!evMap[d.getDate()]) evMap[d.getDate()]=[]; evMap[d.getDate()].push(e); } d.setDate(d.getDate()+1); } });
    let html = DAYS_PT.map(d => \`<div class="cal-dow">\${d}</div>\`).join('');
    for (let i = 0; i < cells; i++) {
      const dNum = i - fd + 1, isOther = dNum<1||dNum>dim, isToday = !isOther&&dNum===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear(), evs = !isOther&&evMap[dNum] ? evMap[dNum] : [];
      html += \`<div class="cal-day \${isOther?'other-month':''} \${isToday?'today':''}"><div class="cal-day-num">\${isOther?'':dNum}</div>\${evs.slice(0,3).map(e => \`<div class="cal-event-pill \${(e.tipo||'').toLowerCase()}" onclick="event.stopPropagation(); window.openEventView('\${e.id}')">\${escapeHtml(e.evento)}</div>\`).join('')}\${evs.length>3 ? \`<div style="font-size:0.6rem;font-weight:700;color:var(--muted)">+\${evs.length-3}</div>\` : ''}</div>\`;
    } document.getElementById('cal-grid').innerHTML = html;
  }

  function renderCalendarOptimized() {
    document.getElementById('cal-month-label').textContent = \`\${MONTHS_PT[calMonth]} \${calYear}\`;
    const fd = new Date(calYear, calMonth, 1).getDay(), dim = new Date(calYear, calMonth+1, 0).getDate(), cells = Math.ceil((fd + dim) / 7) * 7, evMap = {};
    getFilteredEvents().forEach(e => {
      if (e._parsed_ini === undefined) { e._parsed_ini = parseDate(e.data_ini); e._parsed_fim = parseDate(e.data_fim) || e._parsed_ini; }
      const ini = e._parsed_ini, fim = e._parsed_fim;
      if (!ini) return; let d = new Date(ini); while (d <= fim) { if(d.getFullYear()===calYear && d.getMonth()===calMonth){ if(!evMap[d.getDate()]) evMap[d.getDate()]=[]; evMap[d.getDate()].push(e); } d.setDate(d.getDate()+1); }
    });
    let html = DAYS_PT.map(d => \`<div class="cal-dow">\${d}</div>\`).join('');
    for (let i = 0; i < cells; i++) {
      const dNum = i - fd + 1, isOther = dNum<1||dNum>dim, isToday = !isOther&&dNum===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear(), evs = !isOther&&evMap[dNum] ? evMap[dNum] : [];
      html += \`<div class="cal-day \${isOther?'other-month':''} \${isToday?'today':''}"><div class="cal-day-num">\${isOther?'':dNum}</div>\${evs.slice(0,3).map(e => \`<div class="cal-event-pill \${(e.tipo||'').toLowerCase()}" onclick="event.stopPropagation(); window.openEventView('\${e.id}')">\${escapeHtml(e.evento)}</div>\`).join('')}\${evs.length>3 ? \`<div style="font-size:0.6rem;font-weight:700;color:var(--muted)">+\${evs.length-3}</div>\` : ''}</div>\`;
    } document.getElementById('cal-grid').innerHTML = html;
  }

  // benchmark
  const startOriginal = performance.now();
  for (let i = 0; i < 100; i++) renderCalendarOriginal();
  const endOriginal = performance.now();
  console.log("Original Time:", endOriginal - startOriginal, "ms");

  // reset parsed cache just in case
  EVENTS.forEach(e => { delete e._parsed_ini; delete e._parsed_fim; });

  const startOptimized = performance.now();
  for (let i = 0; i < 100; i++) renderCalendarOptimized();
  const endOptimized = performance.now();
  console.log("Optimized Time:", endOptimized - startOptimized, "ms");

  const percentage = ((endOriginal - endOptimized) / endOriginal) * 100;
  console.log("Improvement: ", percentage.toFixed(2), "%");
`;
fs.writeFileSync('test.js', script);
