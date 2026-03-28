> <script>
    // ── FIREBASE CONFIGURAÇÕES (VERSÃO COMPAT PARA RODAR LOCALMENTE) ──
    const firebaseConfig = {
      apiKey: "AIzaSyCmuDrq-ctHOGu4Fe9gHoK2Fxhcfg3BE9g",
      authDomain: "calendario-estrategico.firebaseapp.com",
      projectId: "calendario-estrategico",
      storageBucket: "calendario-estrategico.firebasestorage.app",
      messagingSenderId: "941508404506",
      appId: "1:941508404506:web:af82455df11b35359538a3"
    };
  
    if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    const db = firebase.firestore();
    const auth = firebase.auth();
    const storage = firebase.storage();
  
    // DADOS DE FALLBACK (Garante que a tela nunca fique em branco)
    const ORIGINAL_EVENTS = [
      {tipo:"Interno",responsavel:"Jéss e Jê",mes_ref:"Janeiro",data_ini:"2026-01-28",data_fim:"2026-01-30",evento:"Tripla Conecta",status:"Planejado",formato:"Presencial",participantes:"Todos"},
      {tipo:"Feriado",responsavel:"",mes_ref:"Fevereiro",data_ini:"2026-02-17",data_fim:"2026-02-17",evento:"Carnaval",status:"Planejado"},
      {tipo:"Interno",responsavel:"G&G",mes_ref:"Fevereiro",data_ini:"2026-02-26",data_fim:"2026-02-26",evento:"Embarca Tripla",status:"Planejado",formato:"Online"},
      {tipo:"Comercial",responsavel:"Jê",mes_ref:"Março",data_ini:"2026-03-09",data_fim:"2026-03-09",evento:"Cybersecurity Forum",cota:"Ouro",vagas:"13 convites",status:"Confirmado",formato:"Presencial"},
      {tipo:"Comercial",responsavel:"Jê",mes_ref:"Março",data_ini:"2026-03-17",data_fim:"2026-03-20",evento:"UTCAL Summit",vagas:"8 executivos",status:"Planejado",formato:"Presencial"},
      {tipo:"Comercial",responsavel:"Jess",mes_ref:"Março",data_ini:"2026-03-26",data_fim:"2026-03-26",evento:"GPTI Experience",cota:"Cota Ouro",vagas:"2",status:"Planejado",formato:"Presencial"},
      {tipo:"Comercial",responsavel:"Jê",mes_ref:"Abril",data_ini:"2026-04-15",data_fim:"2026-04-16",evento:"Cloudflare Immerse SP 2026",cota:"Platinum",vagas:"5",status:"Confirmado",formato:"Presencial"},
      {tipo:"Feriado",responsavel:"",mes_ref:"Abril",data_ini:"2026-04-21",data_fim:"2026-04-21",evento:"Tiradentes",status:"Planejado"},
      {tipo:"Comercial",responsavel:"Jess",mes_ref:"Maio",data_ini:"2026-05-12",data_fim:"2026-05-12",evento:"Security Leaders BH",cota:"Bronze",vagas:"6 executivos",status:"Planejado",formato:"Presencial"},
      {tipo:"Interno",responsavel:"G&G",mes_ref:"Julho",data_ini:"2026-07-09",data_fim:"2026-07-09",evento:"Embarca Tripla",status:"Planejado",formato:"Online"},
      {tipo:"Comercial",responsavel:"Jê",mes_ref:"Setembro",data_ini:"2026-09-15",data_fim:"2026-09-17",evento:"Mind the Sec",cota:"Diamond",status:"Planejado",formato:"Presencial"},
      {tipo:"Feriado",responsavel:"",mes_ref:"Outubro",data_ini:"2026-10-12",data_fim:"2026-10-12",evento:"Dia de N. Sra. Aparecida",status:"Planejado"}
    ];
  
    let currentUser = null, userRole = null;
    let EVENTS = [], RESPONSAVEIS = [];
    let KITS = [];
    
    const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const DAYS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    const STATUS_CLASS = {'Planejado':'planejado','Confirmado':'confirmado','Em negociação':'negociacao','Concluído':'concluido','Cancelado':'cancelado'};
    const TYPE_COLOR = { Comercial:'var(--c-comercial)', Interno:'var(--c-interno)', Feriado:'var(--c-feriado)' };
    let isAdmin = false;
    
    // ── TOAST SYSTEM ──
    function showToast(msg, type = 'info', duration = 3500) {
      const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
      const ct = document.getElementById('toast-container');
      const t = document.createElement('div');
      t.className = `toast toast-${type}`;
      t.innerHTML = `<span style="font-size:1.1rem">${icons[type]}</span><span style="flex:1">${msg}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:1rem;padding:0 0 0 8px;">✕</button>`;
      ct.appendChild(t);
      setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 260); }, duration);
    }
  
    // ── CONFIRM MODAL (MEHORADO) ──
    let confirmResolve = null;
    window.showConfirm = function(title, msg) {
      return new Promise(resolve => {
        confirmResolve = resolve;
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-msg').textContent = msg;
        const modal = document.getElementById('confirm-modal');
        modal.style.display = 'flex';
        modal.classList.add('open');
      });
    };
  
    window.closeConfirm = function(val) {
      const modal = document.getElementById('confirm-modal');
      modal.classList.remove('open');
      modal.style.display = 'none';
      if (confirmResolve) {
        confirmResolve(val);
        confirmResolve = null;
      }
    };
    document.getElementById('confirm-cancel-btn').onclick = () => window.closeConfirm(false);
    document.getElementById('confirm-ok-btn').onclick = () => window.closeConfirm(true);
    document.getElementById('confirm-modal').onclick = (e) => { if(e.target === e.currentTarget) window.closeConfirm(false); };
  
    // ── SKELETON LOADING ──
    function showSkeletonTimeline(n = 4) {
      const container = document.getElementById('timeline-content');
      let html = '';
      for (let i = 0; i < n; i++) html += `<div class="skeleton-card"><div class="skeleton skeleton-date"></div><div class="skeleton-body"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-meta"></div><div class="skeleton skeleton-tags"></div></div></div>`;
      container.innerHTML = `<div class="month-block"><div class="month-header"><div class="skeleton" style="width:120px;height:24px;"></div></div>${html}</div>`;
    }
  
    // ── SIDEBAR MOBILE ──
    function openSidebar() { document.querySelector('.sidebar').classList.add('open'); document.getElementById('sidebar-overlay').style.display='block'; }
    function closeSidebar() { document.querySelector('.sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').style.display='none'; }
    window.closeSidebar = closeSidebar;
    document.getElementById('btn-sidebar-toggle').onclick = () => { const s = document.querySelector('.sidebar'); s.classList.contains('open') ? closeSidebar() : openSidebar(); };
  
    // ── NOTIFICATIONS IN-APP ──
    let NOTIFICATIONS = [];
    let notifOpen = false;
  
    function addNotification(text, eventId = null) {
      const n = { id: Date.now() + Math.random(), text, eventId, unread: true, time: new Date() };
      NOTIFICATIONS.unshift(n);
      if (NOTIFICATIONS.length > 30) NOTIFICATIONS.pop();
      renderNotifBell();
    }
  
    function renderNotifBell() {
      const unread = NOTIFICATIONS.filter(n => n.unread).length;
      const countEl = document.getElementById('notif-count');
      countEl.textContent = unread > 9 ? '9+' : unread;
      countEl.style.display = unread > 0 ? 'flex' : 'none';
      const list = document.getElementById('notif-list');
      if (NOTIFICATIONS.length === 0) {
        list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:0.85rem;">Sem notificações</div>';
        return;
      }
      list.innerHTML = NOTIFICATIONS.map(n => {
        const ago = timeAgo(n.time);
        return `<div class="notif-item ${n.unread?'unread':''}" onclick="window.onNotifClick('${n.id}','${n.eventId||''}')">
          <div><div class="notif-text">${n.text}</div><div class="notif-time">${ago}</div></div>
        </div>`;
      }).join('');
    }
  
    function timeAgo(date) {
      const diff = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diff < 60) return 'agora mesmo';
      if (diff < 3600) return `há ${Math.floor(diff/60)} min`;
      if (diff < 86400) return `há ${Math.floor(diff/3600)}h`;
      return `há ${Math.floor(diff/86400)}d`;
    }
  
    window.onNotifClick = (nid, eventId) => {
      const n = NOTIFICATIONS.find(x => String(x.id) === String(nid));
      if (n) n.unread = false;
      renderNotifBell();
      if (eventId && eventId !== 'null' && eventId !== '') window.openEventView(eventId);
      document.getElementById('notif-dropdown').style.display = 'none';
      notifOpen = false;
    };
  
    document.getElementById('btn-notif-bell').onclick = (e) => {
      e.stopPropagation();
      notifOpen = !notifOpen;
      document.getElementById('notif-dropdown').style.display = notifOpen ? 'block' : 'none';
    };
    document.getElementById('btn-mark-all-read').onclick = (e) => {
      e.stopPropagation();
      NOTIFICATIONS.forEach(n => n.unread = false);
      renderNotifBell();
    };
    document.addEventListener('click', (e) => {
      if (notifOpen && !document.getElementById('notif-bell-wrapper').contains(e.target)) {
        notifOpen = false;
        document.getElementById('notif-dropdown').style.display = 'none';
      }
    });
  
    function checkUpcomingNotifications() {
      EVENTS.forEach(ev => {
        const ini = parseDate(ev.data_ini);
        if (!ini || ev.tipo === 'Feriado') return;
        const diff = Math.ceil((ini - today) / (1000*60*60*24));
        if (diff === 1) addNotification(`📅 <b>${ev.evento}</b> começa amanhã!`, ev.id);
        else if (diff === 3) addNotification(`⏳ <b>${ev.evento}</b> em 3 dias.`, ev.id);
        else if (diff === 7) addNotification(`🗓️ <b>${ev.evento}</b> em 1 semana.`, ev.id);
      });
    }
  
    // ── ROLE BADGE ──
    function renderRoleBadge(role) {
      const el = document.getElementById('user-role-badge');
      if (role === 'admin') { el.textContent = 'Admin'; el.className = 'role-badge-admin'; el.style.display='inline-block'; }
      else if (role === 'editor') { el.textContent = 'Editor'; el.className = 'role-badge-editor'; el.style.display='inline-block'; }
      else { el.style.display='none'; }
      const notifWrapper = document.getElementById('notif-bell-wrapper');
      notifWrapper.style.display = (role === 'admin' || role === 'editor') ? 'block' : 'none';
    }
  
    // ── COMMENTS SYSTEM ──
    let currentCommentEventId = null;
  
    async function loadComments(eventId) {
      currentCommentEventId = eventId;
      const list = document.getElementById('comments-list');
      const countEl = document.getElementById('comments-count');
      list.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;padding:8px 0;">Carregando...</div>';
      try {
        const snap = await db.collection("eventos").doc(eventId).collection("comments").orderBy("created_at","asc").get();
        const comments = [];
        snap.forEach(doc => comments.push({ id: doc.id, ...doc.data() }));
        countEl.textContent = comments.length;
        if (comments.length === 0) {
          list.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;padding:8px 0;text-align:center;">Sem comentários ainda. Seja o primeiro!</div>';
          return;
        }
        list.innerHTML = comments.map(c => {
          const isMine = currentUser && c.author_email === currentUser.email;
          const timeStr = c.created_at ? new Date(c.created_at.toDate ? c.created_at.toDate() : c.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
          return `<div class="comment-bubble ${isMine?'mine':''}">
            <div class="comment-author">${c.author_name || c.author_email || 'Usuário'}</div>
            <div class="comment-content">${escapeHtml(c.text)}</div>
            <div class="comment-time">${timeStr}</div>
          </div>`;
        }).join('');
        list.scrollTop = list.scrollHeight;
      } catch(e) {
        list.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;padding:8px 0;">Comentários indisponíveis no modo offline.</div>';
      }
    }
  
    function escapeHtml(str) {
      return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');
    }
  
    window.submitComment = async function() {
      const textarea = document.getElementById('comment-text');
      const text = textarea.value.trim();
      if (!text || !currentCommentEventId || !currentUser) return;
      if (currentCommentEventId.startsWith('mock_')) { showToast('Comentários não disponíveis no modo demo.','warning'); return; }
      const btn = textarea.nextElementSibling;
      btn.textContent = '...'; btn.disabled = true;
      try {
        const nameFromEmail = (currentUser.email||'').split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());
        await db.collection("eventos").doc(currentCommentEventId).collection("comments").add({
          text, author_email: currentUser.email, author_name: nameFromEmail,
          created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        textarea.value = '';
        await loadComments(currentCommentEventId);
      } catch(e) { showToast('Erro ao enviar comentário.','error'); }
      finally { btn.textContent = 'Enviar'; btn.disabled = false; }
    };
  
    // ── DIRECTIONAL VIEW TRANSITIONS ──
    const VIEW_ORDER = ['timeline','calendar','week','list','admin'];
    let prevViewIndex = 0;
  
  
    const today = new Date(); today.setHours(0,0,0,0);
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    let calMonth = today.getMonth(), calYear = today.getFullYear(); 
    let miniMonth = today.getMonth(), miniYear = today.getFullYear();
    let currentWeekStart = getStartOfWeek(today); 
    
    let filterType = 'all', filterStatus = 'all', filterResp = 'all', searchQ = '';
    let filterRespMulti = new Set(); // multi-select responsável
    let filterFormato = 'all';
    let filterDateFrom = null, filterDateTo = null;
    let currentView = 'timeline', sortCol = 'data_ini', sortAsc = true;
    let showPastEvents = false; // Padrão: Ocultar Passados para tela limpa
    let currentEditId = null;
  
    // ── FUNÇÕES UTILITÁRIAS ──
    function parseDate(s) { if (!s) return null; const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
    function getStartOfWeek(date) { const d = new Date(date); const day = d.getDay(); const diff = d.getDate() - day; return new Date(d.setDate(diff)); }
    function getStatus(ev) { const ini = parseDate(ev.data_ini), fim = parseDate(ev.data_fim); if (!ini) return 'future'; if (fim && today >= ini && today <= fim) return 'ongoing'; if (today > (fim || ini)) return 'past'; return 'future'; }
    function dateFmt(ev) { const ini = parseDate(ev.data_ini), fim = parseDate(ev.data_fim); if (!ini) return ev.mes_ref || ''; const opts = { day:'numeric', month:'short' }; if (!fim || ev.data_ini === ev.data_fim) return ini.toLocaleDateString('pt-BR', opts); return `${ini.toLocaleDateString('pt-BR',opts)} – ${fim.toLocaleDateString('pt-BR',opts)}`; }
    function typeBadge(t) { return t ? `<span class="badge badge-${t.toLowerCase()}">${t}</span>` : ''; }
    function statusBadge(s) { return s ? `<span class="badge badge-status-${STATUS_CLASS[s]||''}">${s}</span>` : ''; }
    function formatoBadge(f) { return f ? `<span class="badge badge-formato">${f}</span>` : ''; }
    function getRespArray(str) { return !str ? [] : str.split(',').map(s=>s.trim()).filter(s=>s); }
    
    function cotaBadge(c) { 
      if(!c) return ''; let lowerC = c.toLowerCase(); let icon = '🏅', style = 'background: rgba(128,128,128,0.1); color: var(--text); border: 1px solid var(--border);';
      if (lowerC.includes('ouro') || lowerC.includes('gold')) { icon = '🥇'; style = 'background: rgba(234, 179, 8, 0.15); color: #d97706; border: 1px solid rgba(234, 179, 8, 0.3);'; } else if (lowerC.includes('prata') || lowerC.includes('silver')) { icon = '🥈'; style = 'background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3);'; } else if (lowerC.includes('bronze')) { icon = '🥉'; style = 'background: rgba(180, 83, 9, 0.15); color: #b45309; border: 1px solid rgba(180, 83, 9, 0.3);'; } else if (lowerC.includes('diamond') || lowerC.includes('diamante')) { icon = '💎'; style = 'background: rgba(56, 189, 248, 0.15); color: #0284c7; border: 1px solid rgba(56, 189, 248, 0.3);'; } else if (lowerC.includes('platina') || lowerC.includes('platinum')) { icon = '💠'; style = 'background: rgba(167, 139, 250, 0.15); color: #7c3aed; border: 1px solid rgba(167, 139, 250, 0.3);'; }
      return `<span class="badge" style="${style}">${icon} Cota: ${c}</span>`; 
    }
    
    function temporalBadge(ev) {
      const ini = parseDate(ev.data_ini), fim = parseDate(ev.data_fim) || ini; if(!ini) return '';
      const t = new Date(today); t.setHours(0,0,0,0); const i = new Date(ini); i.setHours(0,0,0,0); const f = new Date(fim); f.setHours(0,0,0,0);
      if (t >= i && t <= f) return `<span class="badge badge-temporal-agora">🟢 Acontecendo</span>`;
      const diffDays = Math.ceil((i - t) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) return `<span class="badge badge-temporal-breve">📅 Falta 1 dia</span>`;
      if (diffDays > 1 && diffDays <= 7) return `<span class="badge badge-temporal-breve">📅 Faltam ${diffDays} dias</span>`;
      return '';
    }
  
    // ── HELPER CENTRAL: aplica/retira visibilidade dos elementos de admin ──
    function applyAdminUI(enabled) {
      isAdmin = enabled;
      document.body.classList.toggle('admin-mode', enabled);
      const btnAdmin = document.getElementById('btn-admin-toggle');
      if (btnAdmin) {
        btnAdmin.style.display = enabled ? 'flex' : 'none';
        btnAdmin.classList.toggle('active', enabled);
      }
      const canEdit = enabled || userRole === 'editor';
      const btnAdd = document.getElementById('btn-add-event');
      if (btnAdd) btnAdd.style.display = canEdit ? 'flex' : 'none';
      
      const tabAdm = document.getElementById('tab-admin');
      if (tabAdm) tabAdm.style.display = enabled ? 'flex' : 'none';
      
      // Garantir que os botões do modal de detalhes sigam o papel correto
      const btnSave = document.getElementById('btn-save');
      const btnDel = document.getElementById('btn-delete');
      if (btnSave) btnSave.style.display = canEdit ? 'flex' : 'none';
      if (btnDel) btnDel.style.display = enabled ? 'flex' : 'none';
      
      renderRoleBadge(userRole);
      // Show edit button in modal for admin and editor
      const _bse2 = document.getElementById('btn-switch-edit');
      if (_bse2) _bse2.style.display = (enabled || userRole === 'editor') ? 'flex' : 'none';
      
      // Hide delete for editors specifically
      if (userRole === 'editor' && btnDel) btnDel.style.display = 'none';
  
      // Se for admin, atualizar contador de usuários pendentes imediatamente
      if (enabled && userRole === 'admin' && typeof loadPendingUsers === 'function') {
        loadPendingUsers();
      }
    }
  
    // ── AUTENTICAÇÃO FIREBASE ──
    auth.onAuthStateChanged(async (user) => {
      const authS = document.getElementById('auth-screen'), appS = document.getElementById('app-screen'),
            pendS = document.getElementById('pending-screen'), logB = document.getElementById('login-box'),
            regB  = document.getElementById('register-box');
      if (user) {
        try {
          const uDoc = await db.collection("users").doc(user.uid).get();
          if (uDoc.exists) {
            userRole = uDoc.data().role;
          } else {
            // Primeiro acesso: admin para e-mail canônico, approved para demais
            userRole = (user.email.endsWith('@tripla.com.br')) ? 'admin' : 'approved';
            await db.collection("users").doc(user.uid).set({ email: user.email, role: userRole });
          }
          currentUser = user;
          document.getElementById('user-email-display').textContent = user.email;
          if (userRole === 'pending') {
            logB.classList.add('hide'); regB.classList.add('hide');
            pendS.style.display = 'block'; appS.classList.add('hide');
          } else {
            authS.classList.add('hide'); appS.classList.remove('hide');
            applyAdminUI(userRole === 'admin');
            if (userRole === 'editor') {
              document.getElementById('btn-add-event').style.display = 'flex';
              renderRoleBadge('editor');
            }
            await loadDataFromFirebase();
          }
        } catch (e) {
          // Firestore inacessível: libera acesso com base no e-mail
          console.warn("Firestore inacessível, usando fallback de papel.");
          currentUser = user;
          userRole = (user.email.endsWith('@tripla.com.br')) ? 'admin' : 'approved';
          document.getElementById('user-email-display').textContent = user.email;
          authS.classList.add('hide'); appS.classList.remove('hide');
          applyAdminUI(userRole === 'admin');
          await loadDataFromFirebase();
        }
      } else {
        currentUser = null; userRole = null;
        applyAdminUI(false);
        authS.classList.remove('hide'); appS.classList.add('hide');
        pendS.style.display = 'none'; logB.classList.remove('hide'); regB.classList.add('hide');
      }
    });
  
    document.getElementById('btn-show-register').onclick = () => { document.getElementById('login-box').classList.add('hide'); document.getElementById('register-box').classList.remove('hide'); };
    document.getElementById('btn-show-login').onclick = () => { document.getElementById('register-box').classList.add('hide'); document.getElementById('login-box').classList.remove('hide'); };
  
    document.getElementById('btn-login-submit').onclick = async () => {
      const btn = document.getElementById('btn-login-submit');
      const em = document.getElementById('auth-email').value, pw = document.getElementById('auth-pass').value, err = document.getElementById('auth-error');
      if(!em || !pw) return;
      try { 
        btn.textContent = "Aguarde..."; 
        btn.disabled = true;
        await auth.signInWithEmailAndPassword(em, pw); 
      } catch(error) { 
        err.textContent = "Email ou senha incorretos."; 
        err.style.display = 'block'; 
        btn.textContent = "Entrar"; 
        btn.disabled = false;
      }
    };
  
    document.getElementById('btn-reg-submit').onclick = async () => {
      const em = document.getElementById('reg-email').value, pw = document.getElementById('reg-pass').value, err = document.getElementById('reg-error');
      if(!em.endsWith('@tripla.com.br')) { err.textContent = "Apenas e-mails corporativos (@tripla.com.br) são permitidos."; return; }
      if(pw.length < 6) { err.textContent = "A senha deve ter no mínimo 6 caracteres."; return; }
      try {
        document.getElementById('btn-reg-submit').textContent = "Criando..."; const userCred = await auth.createUserWithEmailAndPassword(em, pw);
        const role = (em === 'admin@tripla.com.br') ? 'admin' : 'approved'; await db.collection("users").doc(userCred.user.uid).set({ email: em, role: role });
      } catch(error) { err.textContent = "Erro ao registrar. Email já existe?"; document.getElementById('btn-reg-submit').textContent = "Solicitar Acesso"; }
    };
    document.getElementById('btn-logout').onclick = () => auth.signOut(); document.getElementById('btn-logout-pending').onclick = () => auth.signOut();
  
    // ── DATA FETCHING (COM FALLBACK 100% GARANTIDO) ──
    async function _loadDataCore() {
      showSkeletonTimeline(4);
      try {
        const eSnap = await db.collection("eventos").get();
        EVENTS = []; eSnap.forEach(doc => { EVENTS.push({ id: doc.id, ...doc.data() }); });
        if (EVENTS.length === 0) {
           EVENTS = [...ORIGINAL_EVENTS].map((e, i) => ({ id: 'mock_'+i, ...e }));
        }
        const rSnap = await db.collection("responsaveis").get(); 
        RESPONSAVEIS = []; rSnap.forEach(doc => { RESPONSAVEIS.push({ id: doc.id, ...doc.data() }); });
        if(userRole === 'admin') await loadPendingUsers();
      } catch (e) { 
        console.warn("Sem internet ou Firebase bloqueado. Carregando modo local.");
        EVENTS = [...ORIGINAL_EVENTS].map((e, i) => ({ id: 'mock_'+i, ...e }));
      }
      if(EVENTS.length > 0) {
        let evsSorted = EVENTS.map(e=>parseDate(e.data_ini)).filter(d=>d).sort((a,b)=>a-b);
        let firstFuture = evsSorted.find(d => d.getTime() >= currentMonthStart.getTime());
        let targetDate = firstFuture || evsSorted[evsSorted.length - 1]; 
        if(targetDate) { calMonth = targetDate.getMonth(); calYear = targetDate.getFullYear(); miniMonth = targetDate.getMonth(); miniYear = targetDate.getFullYear(); currentWeekStart = getStartOfWeek(targetDate); }
      }
      initUI();
      checkUpcomingNotifications();
    }
    // loadDataFromFirebase starts as alias; Operacional block overrides it with cache+offline wrapper
    let loadDataFromFirebase = _loadDataCore;
  
    async function loadPendingUsers() {
      const list = document.getElementById('users-pending-list');
      try {
        const snap = await db.collection("users").get();
        let html = ''; let pendingCount = 0;
        snap.forEach(doc => {
          let d = doc.data();
          if(d.role === 'pending') {
            pendingCount++;
            html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border);"><span style="font-weight:600; font-size:0.9rem;">${d.email}</span><button class="btn-icon" style="color:var(--green); border-color:var(--green)" onclick="window.approveUser('${doc.id}')">Aprovar</button></div>`;
          }
        });
        list.innerHTML = html || '<div style="text-align:center; padding: 20px; color: var(--muted); font-size: 0.85rem;">Nenhuma solicitação pendente.</div>';
        // Atualizar badge na sidenav
        const cfgBtn = document.querySelector('.admin-nav-item[data-section="configuracoes"]');
        if (cfgBtn) {
          let badge = cfgBtn.querySelector('.admin-nav-badge');
          if (pendingCount > 0) {
            if (!badge) { badge = document.createElement('span'); badge.className = 'admin-nav-badge'; cfgBtn.appendChild(badge); }
            badge.textContent = pendingCount;
          } else {
            if (badge) badge.remove();
          }
        }
      } catch(e) {}
    }
    window.approveUser = async (uid) => { try { await db.collection("users").doc(uid).update({ role: 'approved' }); loadPendingUsers(); showToast('Usuário aprovado com sucesso!', 'success'); } catch(e) { showToast('Erro ao aprovar usuário.', 'error'); } }
  
    // ── ORGANIZADORES ADMIN CRUD ──
    async function loadAdminResponsaveis() {
      const list = document.getElementById('resp-list-admin');
      if(!list) return;
      try {
        let html = '';
        RESPONSAVEIS.forEach(r => {
          html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid var(--border);">
                     <span style="font-weight:600; font-size:0.9rem;">${r.nome}</span>
                     <button class="btn-icon" style="color:var(--red); border-color:var(--surface2); padding:6px 10px;" onclick="window.deleteResp('${r.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                   </div>`;
        });
        list.innerHTML = html || '<div style="text-align:center; padding: 20px; color: var(--muted); font-size: 0.85rem;">Nenhum organizador cadastrado.</div>';
        refreshIcons();
      } catch(e) {}
    }
    
    window.deleteResp = async (id) => {
      if(confirm('Tem certeza que deseja remover este organizador?')) {
        try {
          await db.collection("responsaveis").doc(id).delete();
          showToast('Organizador removido.', 'success');
          RESPONSAVEIS = RESPONSAVEIS.filter(r => r.id !== id);
          updateResponsiblesUI();
          loadAdminResponsaveis();
        } catch(e) { showToast('Erro ao remover.', 'error'); }
      }
    };
  
    document.addEventListener('DOMContentLoaded', () => {
      const btnAddResp = document.getElementById('btn-add-resp');
      if(btnAddResp) {
        btnAddResp.addEventListener('click', async () => {
          const input = document.getElementById('new-resp-input');
          const nome = input.value.trim();
          if(!nome) return;
          try {
            const docRef = await db.collection("responsaveis").add({ nome });
            RESPONSAVEIS.push({ id: docRef.id, nome });
            input.value = '';
            showToast('Organizador adicionado!', 'success');
            updateResponsiblesUI();
            loadAdminResponsaveis();
          } catch(e) { showToast('Erro ao adicionar.', 'error'); }
        });
      }
    });
  
    // ── CORE RENDER LOGIC ──
    function initUI() {
      document.getElementById('today-badge').textContent = today.toLocaleDateString('pt-BR', {weekday:'short', day:'numeric', month:'short'});
      updateResponsiblesUI();
      renderFormatoFilter();
      renderActiveFilterChips();
      syncURLState();
      renderAll();
    }
    function refreshIcons() { if(window.lucide) { setTimeout(() => window.lucide.createIcons(), 50); } }
    function renderAll() { renderMiniCal(); renderUpcoming(); renderDashboardAdmin(); renderCurrentView(); refreshIcons(); }
  
    // ── HIGHLIGHT helper ──
    function highlight(text, q) {
      if (!q) return escapeHtml(text);
      const safe = escapeHtml(text);
      const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return safe.replace(new RegExp(`(${safeQ})`, 'gi'), '<mark style="background:rgba(234,179,8,0.35);color:inherit;border-radius:2px;padding:0 1px;">$1</mark>');
    }
  
    function getFilteredEvents() {
      return EVENTS.filter(e => {
        if (filterType !== 'all' && e.tipo !== filterType) return false;
        if (filterStatus !== 'all' && e.status !== filterStatus) return false;
        if (filterFormato !== 'all' && (e.formato||'').toLowerCase() !== filterFormato.toLowerCase()) return false;
        // Multi-responsável
        if (filterRespMulti.size > 0) {
          const respArr = getRespArray(e.responsavel);
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
  
    // ── FORMATO FILTER (dynamic) ──
    function renderFormatoFilter() {
      const formatos = [...new Set(EVENTS.map(e => e.formato).filter(Boolean))].sort();
      const group = document.getElementById('filter-formato-group');
      if (!group) return;
      const active = group.querySelector('.filter-btn.active')?.dataset.filterFormato || 'all';
      group.innerHTML = `<button class="filter-btn ${active==='all'?'active':''}" data-filter-formato="all"><span class="filter-dot" style="background:var(--muted)"></span>Todos</button>`;
      formatos.forEach(f => {
        const btn = document.createElement('button');
        btn.className = `filter-btn${active===f?' active':''}`;
        btn.dataset.filterFormato = f;
        btn.innerHTML = `<span class="filter-dot" style="background:var(--teal)"></span>${f}`;
        group.appendChild(btn);
      });
      group.querySelectorAll('[data-filter-formato]').forEach(b => b.onclick = ev => {
        filterFormato = ev.currentTarget.dataset.filterFormato;
        group.querySelectorAll('[data-filter-formato]').forEach(x => x.classList.remove('active'));
        ev.currentTarget.classList.add('active');
        renderActiveFilterChips(); syncURLState(); renderCurrentView(); renderSearchCount();
      });
    }
  
    // ── MULTI-RESP filter UI ──
    function renderMultiRespFilter() {
      const setResps = new Set(RESPONSAVEIS.map(r => r.nome));
      EVENTS.forEach(e => getRespArray(e.responsavel).forEach(r => setResps.add(r)));
      const arr = Array.from(setResps).sort();
      const container = document.getElementById('filter-resp-multi');
      if (!container) return;
      container.innerHTML = arr.map(r => `
        <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:0.82rem;font-weight:600;color:var(--text);transition:0.15s;" onmouseenter="this.style.background='var(--border)'" onmouseleave="this.style.background='transparent'">
          <input type="checkbox" value="${r}" class="resp-multi-cb" ${filterRespMulti.has(r)?'checked':''} style="accent-color:var(--accent);width:14px;height:14px;">
          ${r}
        </label>`).join('');
      container.querySelectorAll('.resp-multi-cb').forEach(cb => {
        cb.onchange = () => {
          if (cb.checked) filterRespMulti.add(cb.value); else filterRespMulti.delete(cb.value);
          const clearBtn = document.getElementById('btn-clear-resp');
          if (clearBtn) clearBtn.style.display = filterRespMulti.size > 0 ? 'block' : 'none';
          renderActiveFilterChips(); syncURLState(); initUI();
        };
      });
    }
  
    // ── ACTIVE FILTER CHIPS ──
    function renderActiveFilterChips() {
      const section = document.getElementById('active-filters-section');
      const chips = document.getElementById('active-filter-chips');
      if (!section || !chips) return;
      const active = [];
      if (filterType !== 'all') active.push({ label: `Tipo: ${filterType}`, clear: () => { filterType='all'; document.querySelectorAll('[data-filter-type]').forEach(b=>b.classList.remove('active')); document.querySelector('[data-filter-type="all"]').classList.add('active'); } });
      if (filterStatus !== 'all') active.push({ label: `Status: ${filterStatus}`, clear: () => { filterStatus='all'; document.querySelectorAll('[data-filter-status]').forEach(b=>b.classList.remove('active')); document.querySelector('[data-filter-status="all"]').classList.add('active'); } });
      if (filterFormato !== 'all') active.push({ label: `Formato: ${filterFormato}`, clear: () => { filterFormato='all'; renderFormatoFilter(); } });
      if (filterRespMulti.size > 0) [...filterRespMulti].forEach(r => active.push({ label: `👤 ${r}`, clear: () => { filterRespMulti.delete(r); renderMultiRespFilter(); } }));
      if (filterDateFrom) active.push({ label: `De: ${filterDateFrom.toLocaleDateString('pt-BR')}`, clear: () => { filterDateFrom=null; document.getElementById('filter-date-from').value=''; document.getElementById('btn-clear-daterange').style.display='none'; } });
      if (filterDateTo)   active.push({ label: `Até: ${filterDateTo.toLocaleDateString('pt-BR')}`,   clear: () => { filterDateTo=null;   document.getElementById('filter-date-to').value='';   document.getElementById('btn-clear-daterange').style.display='none'; } });
      section.style.display = active.length > 0 ? 'block' : 'none';
      chips.innerHTML = active.map((a,i) => `<span class="filter-chip" data-chip="${i}">${a.label} <span style="cursor:pointer;opacity:0.7;" onclick="window._clearChip(${i})">✕</span></span>`).join('');
      window._chipData = active;
    }
    window._clearChip = (i) => { window._chipData[i].clear(); renderActiveFilterChips(); syncURLState(); initUI(); };
  
    document.getElementById('btn-clear-all-filters')?.addEventListener('click', () => {
      filterType='all'; filterStatus='all'; filterFormato='all'; filterRespMulti=new Set(); filterDateFrom=null; filterDateTo=null; searchQ='';
      document.getElementById('search-input').value='';
      document.querySelectorAll('[data-filter-type]').forEach(b=>b.classList.remove('active')); document.querySelector('[data-filter-type="all"]').classList.add('active');
      document.querySelectorAll('[data-filter-status]').forEach(b=>b.classList.remove('active')); document.querySelector('[data-filter-status="all"]').classList.add('active');
      document.getElementById('filter-date-from').value=''; document.getElementById('filter-date-to').value='';
      document.getElementById('btn-clear-daterange').style.display='none';
      document.getElementById('btn-clear-resp').style.display='none';
      renderFormatoFilter(); renderMultiRespFilter(); renderActiveFilterChips(); syncURLState(); initUI();
      showToast('Todos os filtros foram limpos.', 'info');
    });
  
    // ── URL STATE SYNC ──
    function syncURLState() {
      try {
        const params = new URLSearchParams();
        if (filterType !== 'all')    params.set('tipo', filterType);
        if (filterStatus !== 'all')  params.set('status', filterStatus);
        if (filterFormato !== 'all') params.set('formato', filterFormato);
        if (filterRespMulti.size > 0) params.set('resp', [...filterRespMulti].join(','));
        if (filterDateFrom) params.set('de', filterDateFrom.toISOString().slice(0,10));
        if (filterDateTo)   params.set('ate', filterDateTo.toISOString().slice(0,10));
        if (searchQ)        params.set('q', searchQ);
        if (currentView !== 'timeline') params.set('view', currentView);
        const newUrl = params.toString() ? `${location.pathname}?${params}` : location.pathname;
        history.replaceState(null, '', newUrl);
      } catch(e) {}
    }
  
    function loadURLState() {
      try {
        const params = new URLSearchParams(location.search);
        if (params.get('tipo'))   { filterType   = params.get('tipo');   document.querySelector(`[data-filter-type="${filterType}"]`)?.classList.add('active'); document.querySelector('[data-filter-type="all"]')?.classList.remove('active'); }
        if (params.get('status')) { filterStatus = params.get('status'); document.querySelector(`[data-filter-status="${filterStatus}"]`)?.classList.add('active'); document.querySelector('[data-filter-status="all"]')?.classList.remove('active'); }
        if (params.get('formato')) filterFormato = params.get('formato');
        if (params.get('resp'))   { params.get('resp').split(',').forEach(r => filterRespMulti.add(r.trim())); }
        if (params.get('de'))     filterDateFrom = parseDate(params.get('de'));
        if (params.get('ate'))    filterDateTo   = parseDate(params.get('ate'));
        if (params.get('q'))      { searchQ = params.get('q'); document.getElementById('search-input').value = searchQ; }
        if (params.get('view'))   { currentView = params.get('view'); document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('active', t.dataset.view === currentView)); }
      } catch(e) {}
    }
  
    // ── SEARCH COUNT + CLEAR ──
    function renderSearchCount() {
      const countEl = document.getElementById('search-count');
      const clearBtn = document.getElementById('btn-clear-search');
      const q = searchQ.trim();
      if (q) {
        const n = getFilteredEvents().length;
        countEl.textContent = `${n} resultado${n!==1?'s':''}`;
        countEl.style.display = 'inline';
        clearBtn.style.display = 'inline';
      } else {
        countEl.style.display = 'none';
        clearBtn.style.display = 'none';
      }
    }
    window.clearSearch = function() { searchQ=''; document.getElementById('search-input').value=''; renderSearchCount(); syncURLState(); renderCurrentView(); };
  
  
    function renderCurrentView() {
      document.querySelectorAll('.view-container').forEach(c => c.classList.remove('active'));
      const pane = document.getElementById('view-' + currentView);
      if (pane) pane.classList.add('active');
      if      (currentView === 'timeline') renderTimeline();
      else if (currentView === 'calendar') renderCalendar();
      else if (currentView === 'week')     renderWeek();
      else if (currentView === 'list')     renderList();
      else if (currentView === 'admin')    renderDashboardAdmin();
    }
  
    // ── TIMELINE ROBUSTA ──
    document.getElementById('btn-toggle-past').onclick = () => { 
        showPastEvents = !showPastEvents; 
        document.getElementById('btn-toggle-past').textContent = showPastEvents ? "Ocultar meses anteriores" : "⏳ Ver meses anteriores"; 
        renderTimeline(); 
    };
  
    function renderTimeline() {
      const container = document.getElementById('timeline-content');
      let evs = getFilteredEvents();
      
      if(!showPastEvents) {
          evs = evs.filter(e => {
              const d = parseDate(e.data_ini);
              if(!d) return true;
              const evMonthStart = new Date(d.getFullYear(), d.getMonth(), 1);
              return evMonthStart.getTime() >= currentMonthStart.getTime();
          });
      }
      
      evs.sort((a,b) => (parseDate(a.data_ini) || new Date(2030,0)) - (parseDate(b.data_ini) || new Date(2030,0)));
      
      if(evs.length === 0) { 
          container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div>Nenhum evento encontrado no período.</div></div>`; 
          return; 
      }
  
      const byMonth = {}; 
      evs.forEach(e => { 
          const m = e.mes_ref || (parseDate(e.data_ini) ? MONTHS_PT[parseDate(e.data_ini).getMonth()] : 'Sem mês'); 
          if(!byMonth[m]) byMonth[m]=[]; 
          byMonth[m].push(e); 
      });
  
      let html = '';
      // Filtra MONTHS_PT preservando ordem cronológica correta
      const monthsOrdered = MONTHS_PT.filter(m => byMonth[m]);
      monthsOrdered.forEach(m => {
          html += `<div class="month-block"><div class="month-header"><span class="month-name">${m}</span><span class="month-count">${byMonth[m].length}</span><div class="month-line"></div></div><div class="event-list">`;
          byMonth[m].forEach(e => {
              const d = parseDate(e.data_ini); 
              const color = TYPE_COLOR[e.tipo] || 'var(--accent)';
              let respPills = getRespArray(e.responsavel).map(r => `<span class="resp-pill">${r}</span>`).join('');
              
              html += `
              <div class="event-card ${getStatus(e)}" style="--card-color:${color}" onclick="window.openEventView('${e.id}')">
                  <div class="event-date-col">
                      <div class="event-date-day">${d ? d.getDate() : '-'}</div>
                      <div class="event-date-month">${d ? MONTHS_SHORT[d.getMonth()] : ''}</div>
                  </div>
                  <div class="event-body">
                      <div class="event-header-row">
                          <div class="event-name">${e.evento}</div>
                          <div>${temporalBadge(e)}</div>
                      </div>
                      <div class="event-meta">
                          ${typeBadge(e.tipo)}
                          ${statusBadge(e.status)}
                          ${formatoBadge(e.formato)}
                          ${cotaBadge(e.cota)} 
                          ${respPills ? `<div class="event-resp-area">${respPills}</div>`:''}
                      </div>
                  </div>
              </div>`;
          });
          html += `</div></div>`;
      }); 
      container.innerHTML = html;
    }
  
    function renderList() {
      const evs = getFilteredEvents().sort((a, b) => { let va=a[sortCol]||'', vb=b[sortCol]||''; if (sortCol==='data_ini') return sortAsc ? (parseDate(va)||new Date(2030,0))-(parseDate(vb)||new Date(2030,0)) : (parseDate(vb)||new Date(2030,0))-(parseDate(va)||new Date(2030,0)); return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va); });
      const body = document.getElementById('list-body'), noR = document.getElementById('list-no-results');
      if (evs.length===0) { body.innerHTML=''; noR.classList.remove('hide'); return; } noR.classList.add('hide');
      body.innerHTML = evs.map(e => `
          <tr onclick="window.openEventView('${e.id}')" class="${getStatus(e)}">
          <td style="font-weight:700;">${dateFmt(e)}</td><td><div style="display:flex; align-items:center; gap:8px;"><strong style="font-size:0.95rem; color:var(--text);">${e.evento}</strong> ${temporalBadge(e)}</div></td><td>${typeBadge(e.tipo)}</td><td>${statusBadge(e.status)}</td><td><div style="color:var(--text); font-weight:600; font-size:0.85rem;">${e.participantes || '<span style="color:var(--muted);font-weight:400">-</span>'}</div></td></tr>`
      ).join('');
    }
  
    function renderCalendar() {
      document.getElementById('cal-month-label').textContent = `${MONTHS_PT[calMonth]} ${calYear}`;
      const fd = new Date(calYear, calMonth, 1).getDay(), dim = new Date(calYear, calMonth+1, 0).getDate(), cells = Math.ceil((fd + dim) / 7) * 7, evMap = {};
      getFilteredEvents().forEach(e => { const ini = parseDate(e.data_ini), fim = parseDate(e.data_fim) || ini; if (!ini) return; let d = new Date(ini); while (d <= fim) { if(d.getFullYear()===calYear && d.getMonth()===calMonth){ if(!evMap[d.getDate()]) evMap[d.getDate()]=[]; evMap[d.getDate()].push(e); } d.setDate(d.getDate()+1); } });
      let html = DAYS_PT.map(d => `<div class="cal-dow">${d}</div>`).join('');
      for (let i = 0; i < cells; i++) {
        const dNum = i - fd + 1, isOther = dNum<1||dNum>dim, isToday = !isOther&&dNum===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear(), evs = !isOther&&evMap[dNum] ? evMap[dNum] : [];
        html += `<div class="cal-day ${isOther?'other-month':''} ${isToday?'today':''}"><div class="cal-day-num">${isOther?'':dNum}</div>${evs.slice(0,3).map(e => `<div class="cal-event-pill ${(e.tipo||'').toLowerCase()}" onclick="event.stopPropagation(); window.openEventView('${e.id}')">${e.evento}</div>`).join('')}${evs.length>3 ? `<div style="font-size:0.6rem;font-weight:700;color:var(--muted)">+${evs.length-3}</div>` : ''}</div>`;
      } document.getElementById('cal-grid').innerHTML = html;
    }
  
    function renderWeek() {
      const s = new Date(currentWeekStart), e = new Date(s); e.setDate(e.getDate() + 6); document.getElementById('week-label').textContent = `${s.getDate()}/${s.getMonth()+1} até ${e.getDate()}/${e.getMonth()+1}`;
      let html = '';
      for(let i=0; i<7; i++) {
        const cD = new Date(s); cD.setDate(s.getDate() + i); const evs = getFilteredEvents().filter(ev => { const iD=parseDate(ev.data_ini), fD=parseDate(ev.data_fim)||iD; return cD>=iD && cD<=fD; });
        html += `<div class="week-col"><div class="week-col-header">${DAYS_PT[i]} ${cD.getDate()}</div><div class="week-col-body">${evs.map(ev => `<div class="week-event" style="border-left-color:${TYPE_COLOR[ev.tipo]||'var(--accent)'}" onclick="window.openEventView('${ev.id}')">${ev.evento}</div>`).join('')}</div></div>`;
      } document.getElementById('week-grid').innerHTML = html;
    }
  
    function renderMiniCal() {
      document.getElementById('mini-month-label').textContent = `${MONTHS_SHORT[miniMonth]} ${miniYear}`;
      const fd = new Date(miniYear, miniMonth, 1).getDay(), dim = new Date(miniYear, miniMonth+1, 0).getDate(), cells = Math.ceil((fd + dim) / 7) * 7;
      const evDays = new Set();
      EVENTS.forEach(e => { const i=parseDate(e.data_ini), f=parseDate(e.data_fim)||i; if(!i)return; let d=new Date(i); while(d<=f){ if(d.getFullYear()===miniYear&&d.getMonth()===miniMonth)evDays.add(d.getDate()); d.setDate(d.getDate()+1); } });
      // Cabeçalho de dias da semana
      let html = DAYS_PT.map(d => `<div class="mini-cal-dow">${d}</div>`).join('');
      for (let i=0; i<cells; i++) {
        const dNum=i-fd+1, isO=dNum<1||dNum>dim, isT=!isO&&dNum===today.getDate()&&miniMonth===today.getMonth()&&miniYear===today.getFullYear(), hasEv=!isO&&evDays.has(dNum);
        html += `<div class="mini-day ${isO?'other-month':''} ${isT?'today':''} ${hasEv?'has-event':''}">${isO?'':dNum}</div>`;
      }
      document.getElementById('mini-cal-grid').innerHTML = html;
    }
    
    function renderUpcoming() {
      const up = EVENTS
        .filter(e => { const d = parseDate(e.data_ini); return d && d >= today && e.tipo !== 'Feriado'; })
        .sort((a,b) => parseDate(a.data_ini) - parseDate(b.data_ini))
        .slice(0, 5);
      const container = document.getElementById('upcoming-list');
      if (!up.length) {
        container.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;padding:8px 0">Nenhum evento próximo.</div>';
        return;
      }
      container.innerHTML = up.map(e =>
        `<div class="upcoming-item" onclick="window.openEventView('${e.id}')">
          <div class="upcoming-dot" style="background:${TYPE_COLOR[e.tipo]||'var(--accent)'}"></div>
          <div><div class="upcoming-name">${e.evento}</div><div class="upcoming-date">${dateFmt(e)}</div></div>
        </div>`
      ).join('');
    }
  
    // ── RESPONSÁVEIS CRUD ──
    function updateResponsiblesUI() {
      const setResps = new Set(RESPONSAVEIS.map(r => r.nome)); EVENTS.forEach(e => { getRespArray(e.responsavel).forEach(r => setResps.add(r)); }); const arr = Array.from(setResps).sort();
      const filterSel = document.getElementById('filter-resp'); filterSel.innerHTML = '<option value="all">Todos os responsáveis</option>';
      const checkContainer = document.getElementById('edit-resp-checkboxes'); checkContainer.innerHTML = '';
      const adminList = document.getElementById('resp-list-admin'); adminList.innerHTML = '';
  
      arr.forEach(r => {
        const opt1 = document.createElement('option'); opt1.value = r; opt1.textContent = r; if(r === filterResp) opt1.selected = true; filterSel.appendChild(opt1);
        const lbl = document.createElement('label'); lbl.className = 'checkbox-item'; lbl.innerHTML = `<input type="checkbox" class="resp-checkbox" value="${r}"> <span>${r}</span>`; checkContainer.appendChild(lbl);
        const div = document.createElement('div'); div.style = "padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 0.9rem; display:flex; justify-content:space-between; align-items:center;";
        const bdResp = RESPONSAVEIS.find(x => x.nome === r);
        if(bdResp) { div.innerHTML = `<span style="font-weight:700; color:var(--text)">👤 ${r}</span> <div style="display:flex; gap:16px;"><span style="color:var(--accent); cursor:pointer; font-weight:700;" onclick="window.editResp('${bdResp.id}', '${r}')"><i data-lucide="edit-2" style="width:16px;height:16px;"></i></span><span style="color:var(--red); cursor:pointer; font-weight:700;" onclick="window.delResp('${bdResp.id}')"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></span></div>`; } 
        else { div.innerHTML = `<span><span style="font-weight:700; color:var(--text)">👤 ${r}</span> <small style="color:var(--muted); margin-left:8px;">(via evento)</small></span><div style="display:flex; gap:16px;"><span style="color:var(--accent); cursor:pointer; font-weight:700;" onclick="window.editLegacyResp('${r}')"><i data-lucide="save" style="width:16px;height:16px;"></i> Salvar</span></div>`; }
        adminList.appendChild(div);
      });
      if (typeof lucide !== 'undefined') lucide.createIcons();
      // Populate multi-resp filter in sidebar
      renderMultiRespFilter();
    }
  
    document.getElementById('btn-add-resp').onclick = async () => { const inp = document.getElementById('new-resp-input'); const nome = inp.value.trim(); if(!nome) return; try { inp.value = "Salvando..."; inp.disabled = true; await db.collection("responsaveis").add({ nome }); inp.value = ""; await loadDataFromFirebase(); } catch(e) { console.error(e); } finally { inp.disabled = false; } };
    document.getElementById('btn-add-resp-modal').onclick = async (e) => { e.preventDefault(); const inp = document.getElementById('new-resp-input-modal'); const nome = inp.value.trim(); if(!nome) return; try { await db.collection("responsaveis").add({ nome }); inp.value = ""; await loadDataFromFirebase(); const idEditing = document.getElementById('edit-id').value; if(idEditing) window.openAdminForm(idEditing); else window.openAdminForm(''); } catch(er) {} }
    window.editResp = async (id, oldName) => { const newName = prompt(`Editando: ${oldName}`, oldName); if (!newName || newName === oldName) return; try { await db.collection("responsaveis").doc(id).update({ nome: newName.trim() }); const batch = db.batch(); let changed = false; EVENTS.forEach(ev => { let arr = getRespArray(ev.responsavel); if (arr.includes(oldName)) { const newArr = arr.map(n => n === oldName ? newName.trim() : n); batch.update(db.collection("eventos").doc(ev.id), { responsavel: newArr.join(', ') }); changed = true; } }); if(changed) await batch.commit(); await loadDataFromFirebase(); } catch(e) {} };
    window.editLegacyResp = async (oldName) => { const newName = prompt(`Editando (Legado): ${oldName}`, oldName); if (!newName || newName === oldName) return; try { await db.collection("responsaveis").add({ nome: newName.trim() }); const batch = db.batch(); EVENTS.forEach(ev => { let arr = getRespArray(ev.responsavel); if (arr.includes(oldName)) { const newArr = arr.map(n => n === oldName ? newName.trim() : n); batch.update(db.collection("eventos").doc(ev.id), { responsavel: newArr.join(', ') }); } }); await batch.commit(); await loadDataFromFirebase(); } catch(e) {} };
    window.delResp = async (id) => {
      const ok = await showConfirm('Remover responsável?', 'Este responsável será removido da lista de opções.');
      if (!ok) return;
      try { await db.collection("responsaveis").doc(id).delete(); await loadDataFromFirebase(); showToast('Responsável removido.', 'warning'); } catch(e) { showToast('Erro ao remover.', 'error'); }
    }
  
    // ── DASHBOARD ADMIN (ANALYTICS COMPLETO) ──
    let myChart = null, chartMeses = null, chartStatus = null, chartResp = null;
    window.adminEventLimit = 10;
  
    window.renderAdminEventList = function() {
      const tbody = document.getElementById('admin-event-list-body');
      if (!tbody) return;
      const q = (document.getElementById('admin-event-search')?.value || '').toLowerCase();
      
      let evs = getFilteredEvents().sort((a,b) => (parseDate(a.data_ini)||new Date(2030,0))-(parseDate(b.data_ini)||new Date(2030,0)));
      if (q) evs = evs.filter(e => (e.evento||'').toLowerCase().includes(q) || (e.responsavel||'').toLowerCase().includes(q));
      
      const count = evs.length;
      const sliced = evs.slice(0, window.adminEventLimit);
      
        : sliced.map(e => `<tr><td style="font-size:0.85rem;font-weight:700;">${dateFmt(e)}</td><td style="font-weight:800;">${highlight(e.evento, q)}</td><td><div style="display:flex;gap:4px;flex-wrap:wrap;">${getRespArray(e.responsavel).map(r=>`<span class="resp-pill">${highlight(r, q)}</span>`).join('')||'—'}</div></td><td>${statusBadge(e.status)}</td><td style="text-align:right;"><button class="btn-icon" onclick="window.openAdminForm('${e.id}')"><i data-lucide="edit-2"></i></button></td></tr>`).join('');
        
      if (typeof lucide !== 'undefined') lucide.createIcons();
      const cont = document.getElementById('admin-event-ver-mais-container');
      if (cont) cont.style.display = window.adminEventLimit < count ? 'block' : 'none';
    };
  
    function getChartTextColor() {
      return getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#64748b';
    }
  
    function animateValue(el, end) {
      if (!el) return;
      const start = parseInt(el.textContent) || 0;
      const duration = 600;
      const startTime = performance.now();
      const isPercent = el.id === 'dash-taxa';
      const update = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const val = Math.round(start + (end - start) * ease);
        el.textContent = isPercent ? val + '%' : val;
        if (progress < 1) requestAnimationFrame(update);
      };
      requestAnimationFrame(update);
    }
  
    function renderDashboardAdmin() {
      const now = new Date(); now.setHours(0,0,0,0);
      const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
  
      const total      = EVENTS.length;
      const comerciais = EVENTS.filter(e => e.tipo === 'Comercial').length;
      const internos   = EVENTS.filter(e => e.tipo === 'Interno').length;
      const confirmados= EVENTS.filter(e => e.status === 'Confirmado').length;
      const concluidos = EVENTS.filter(e => e.status === 'Concluído').length;
      const proximos   = EVENTS.filter(e => { const d = parseDate(e.data_ini); return d && d >= now && d <= in30; }).length;
      const taxa       = total > 0 ? Math.round((confirmados / total) * 100) : 0;
  
      // Vagas numéricas (tenta extrair número do campo vagas)
      let vagasTotal = 0;
      EVENTS.forEach(e => {
        if (e.tipo === 'Comercial' && e.vagas) {
          const n = parseInt((e.vagas+'').replace(/\D/g,''));
          if (!isNaN(n)) vagasTotal += n;
        }
      });
  
      // KPIs com animação
      animateValue(document.getElementById('dash-total'), total);
      animateValue(document.getElementById('dash-comercial'), comerciais);
      animateValue(document.getElementById('dash-interno'), internos);
      animateValue(document.getElementById('dash-confirmados'), confirmados);
      animateValue(document.getElementById('dash-proximos'), proximos);
      animateValue(document.getElementById('dash-concluidos'), concluidos);
      animateValue(document.getElementById('dash-vagas'), vagasTotal);
      // taxa
      const taxaEl = document.getElementById('dash-taxa');
      if (taxaEl) { const start = parseInt(taxaEl.textContent)||0; const dur=600; const t0=performance.now(); const upd=(now)=>{ const p=Math.min((now-t0)/dur,1); const e2=1-Math.pow(1-p,3); taxaEl.textContent=Math.round(start+(taxa-start)*e2)+'%'; if(p<1)requestAnimationFrame(upd); }; requestAnimationFrame(upd); }
  
      // Sub-labels
      const sub = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
      sub('dash-total-sub', `${concluidos} concluídos`);
      sub('dash-comercial-sub', `${Math.round((comerciais/Math.max(total,1))*100)}% do total`);
      sub('dash-interno-sub', `${Math.round((internos/Math.max(total,1))*100)}% do total`);
      sub('dash-confirmados-sub', `${confirmados} de ${total} eventos`);
      sub('dash-proximos-sub', 'nos próximos 30 dias');
      sub('dash-taxa-sub', confirmados + ' confirmados');
      sub('dash-vagas-sub', 'vagas em aberto');
      sub('dash-concluidos-sub', `${Math.round((concluidos/Math.max(total,1))*100)}% do total`);
  
      // Lista rápida de edição
      window.renderAdminEventList();
  
      if (userRole !== 'admin') return;
  
      const tc = getChartTextColor();
      const chartDefaults = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: tc, font: { weight: '600' } } } } };
  
      // ── CHART 1: Tipo (doughnut) ──
      const ctxTipo = document.getElementById('chartTipos');
      if (myChart) myChart.destroy();
      myChart = new Chart(ctxTipo, {
        type: 'doughnut',
        data: { labels: ['Comercial','Interno','Feriado'], datasets: [{ data: [comerciais, internos, EVENTS.filter(e=>e.tipo==='Feriado').length], backgroundColor: ['#3b82f6','#10b981','#f59e0b'], borderWidth: 0 }] },
        options: { ...chartDefaults, cutout: '65%' }
      });
  
      // ── CHART 2: Por Mês (bar empilhado) ──
      const ctxMes = document.getElementById('chartMeses');
      if (chartMeses) chartMeses.destroy();
      const byMonthCom = Array(12).fill(0), byMonthInt = Array(12).fill(0);
      EVENTS.forEach(e => {
        const d = parseDate(e.data_ini); if (!d) return;
        if (e.tipo === 'Comercial') byMonthCom[d.getMonth()]++;
        else if (e.tipo === 'Interno') byMonthInt[d.getMonth()]++;
      });
      chartMeses = new Chart(ctxMes, {
        type: 'bar',
        data: {
          labels: MONTHS_SHORT,
          datasets: [
            { label: 'Comercial', data: byMonthCom, backgroundColor: 'rgba(59,130,246,0.8)', borderRadius: 4, borderSkipped: false },
            { label: 'Interno',   data: byMonthInt, backgroundColor: 'rgba(16,185,129,0.8)',  borderRadius: 4, borderSkipped: false }
          ]
        },
        options: { ...chartDefaults, scales: { x: { stacked: true, ticks: { color: tc }, grid: { display: false } }, y: { stacked: true, ticks: { color: tc, stepSize: 1 }, grid: { color: 'rgba(128,128,128,0.1)' } } }, plugins: { ...chartDefaults.plugins, tooltip: { mode: 'index' } } }
      });
  
      // ── CHART 3: Por Status (doughnut) ──
      const ctxSt = document.getElementById('chartStatus');
      if (chartStatus) chartStatus.destroy();
      const statusLabels = ['Planejado','Confirmado','Em negociação','Concluído','Cancelado'];
      const statusColors = ['#94a3b8','#10b981','#f59e0b','#8b5cf6','#ef4444'];
      const statusData = statusLabels.map(s => EVENTS.filter(e => e.status === s).length);
      chartStatus = new Chart(ctxSt, {
        type: 'doughnut',
        data: { labels: statusLabels, datasets: [{ data: statusData, backgroundColor: statusColors, borderWidth: 0 }] },
        options: { ...chartDefaults, cutout: '60%' }
      });
  
      // ── CHART 4: Ranking por Responsável (bar horizontal) ──
      const ctxResp = document.getElementById('chartResp');
      if (chartResp) chartResp.destroy();
      const respCount = {};
      EVENTS.forEach(e => { getRespArray(e.responsavel).forEach(r => { respCount[r] = (respCount[r]||0) + 1; }); });
      const respSorted = Object.entries(respCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
      chartResp = new Chart(ctxResp, {
        type: 'bar',
        data: {
          labels: respSorted.map(r=>r[0]),
          datasets: [{ label: 'Eventos', data: respSorted.map(r=>r[1]), backgroundColor: respSorted.map((_,i)=>`hsl(${210+i*25},70%,55%)`), borderRadius: 6 }]
        },
        options: { ...chartDefaults, indexAxis: 'y', scales: { x: { ticks: { color: tc, stepSize: 1 }, grid: { color: 'rgba(128,128,128,0.1)' } }, y: { ticks: { color: tc } } }, plugins: { ...chartDefaults.plugins, legend: { display: false } } }
      });
  
      // ── HEATMAP ANUAL ──
      renderHeatmap();
  
      // ── TABELA DE VAGAS ──
      renderVagasTable();
  
      // ── GESTÃO OPERACIONAL: carrega módulos na primeira visita ──
      if (typeof loadGestaoModules === 'function') loadGestaoModules();
    }
  
    function renderHeatmap() {
      const container = document.getElementById('heatmap-container');
      const tooltip   = document.getElementById('hm-tooltip');
      const year = new Date().getFullYear();
      const jan1 = new Date(year, 0, 1);
      const dec31 = new Date(year, 11, 31);
  
      // Count events per day
      const dayMap = {};
      EVENTS.forEach(e => {
        const ini = parseDate(e.data_ini), fim = parseDate(e.data_fim) || ini;
        if (!ini) return;
        let d = new Date(ini);
        while (d <= fim) {
          if (d.getFullYear() === year) {
            const key = d.toISOString().slice(0,10);
            dayMap[key] = (dayMap[key]||[]);
            dayMap[key].push(e.evento);
          }
          d.setDate(d.getDate()+1);
        }
      });
  
      const maxCount = Math.max(...Object.values(dayMap).map(a=>a.length), 1);
  
      // Build weeks
      const startDay = new Date(jan1);
      startDay.setDate(startDay.getDate() - startDay.getDay()); // align to Sunday
  
      const weeks = [];
      let cur = new Date(startDay);
      while (cur <= dec31) {
        const week = [];
        for (let d = 0; d < 7; d++) {
          week.push(new Date(cur));
          cur.setDate(cur.getDate()+1);
        }
        weeks.push(week);
      }
  
      // Month labels
      let labelHTML = '<div class="heatmap-month-labels" style="padding-left:20px;">';
      const monthPos = {};
      weeks.forEach((wk, wi) => {
        const m = wk[0].getMonth();
        if (monthPos[m] === undefined) monthPos[m] = wi;
      });
      let lastM = -1;
      weeks.forEach((_, wi) => {
        const label = Object.entries(monthPos).find(([,v])=>v===wi);
        labelHTML += `<span style="width:16px;display:inline-block;flex-shrink:0;">${label ? MONTHS_SHORT[+label[0]] : ''}</span>`;
      });
      labelHTML += '</div>';
  
      // Day labels
      const dayLetters = ['D','S','T','Q','Q','S','S'];
      let dayLabelsHTML = '<div style="display:flex;flex-direction:column;gap:3px;margin-right:4px;padding-top:0px;">';
      dayLetters.forEach(l => { dayLabelsHTML += `<div style="width:13px;height:13px;font-size:0.55rem;font-weight:700;color:var(--muted);display:flex;align-items:center;justify-content:center;">${l}</div>`; });
      dayLabelsHTML += '</div>';
  
      // Cells
      let gridHTML = '<div class="heatmap-grid">';
      weeks.forEach(wk => {
        gridHTML += '<div class="heatmap-col">';
        wk.forEach(day => {
          const key = day.toISOString().slice(0,10);
          const evList = dayMap[key] || [];
          const count = evList.length;
          const inYear = day.getFullYear() === year;
          let bg;
          if (!inYear || count === 0) {
            bg = 'var(--surface2)';
          } else {
            const intensity = Math.min(count / maxCount, 1);
            const alpha = 0.2 + intensity * 0.75;
            bg = `rgba(37,99,235,${alpha.toFixed(2)})`;
          }
          const dayStr = day.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
          const evNames = evList.slice(0,3).join(', ') + (evList.length > 3 ? ` +${evList.length-3}` : '');
          gridHTML += `<div class="heatmap-cell" style="background:${bg};border:1px solid ${count>0?'rgba(37,99,235,0.15)':'var(--border)'};" data-day="${dayStr}" data-count="${count}" data-evs="${evNames.replace(/"/g,'&quot;')}"></div>`;
        });
        gridHTML += '</div>';
      });
      gridHTML += '</div>';
  
      container.innerHTML = labelHTML + `<div style="display:flex;align-items:flex-start;">${dayLabelsHTML}${gridHTML}</div>`;
  
      // Tooltip
      container.querySelectorAll('.heatmap-cell').forEach(cell => {
        cell.addEventListener('mouseenter', (e) => {
          const count = cell.dataset.count;
          const day   = cell.dataset.day;
          const evs   = cell.dataset.evs;
          tooltip.innerHTML = `<strong>${day}</strong>: ${count} evento${count!=1?'s':''} ${evs ? '<br><span style="color:var(--muted)">'+evs+'</span>' : ''}`;
          tooltip.style.display = 'block';
        });
        cell.addEventListener('mousemove', (e) => {
          tooltip.style.left = (e.clientX + 12) + 'px';
          tooltip.style.top  = (e.clientY - 36) + 'px';
        });
        cell.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
      });
    }
  
    function renderVagasTable() {
      const container = document.getElementById('vagas-table-container');
      const now = new Date(); now.setHours(0,0,0,0);
      const eventsWithVagas = EVENTS
        .filter(e => e.tipo === 'Comercial' && e.vagas && !['Concluído','Cancelado'].includes(e.status))
        .map(e => {
          const d = parseDate(e.data_ini);
          const daysUntil = d ? Math.ceil((d - now)/(1000*60*60*24)) : 999;
          const vagasNum = parseInt((e.vagas+'').replace(/\D/g,'')) || null;
          return { ...e, daysUntil, vagasNum };
        })
        .filter(e => e.daysUntil >= 0)
        .sort((a,b) => a.daysUntil - b.daysUntil);
  
      if (!eventsWithVagas.length) {
        container.innerHTML = '<div class="empty-state" style="padding:32px;"><div class="empty-icon">🎫</div><div>Nenhum evento comercial com vagas em aberto.</div></div>';
        return;
      }
  
      container.innerHTML = `
        <table class="vagas-table">
          <thead><tr><th>Evento</th><th>Data</th><th>Vagas</th><th>Cota</th><th>Status</th><th>Urgência</th></tr></thead>
          <tbody>
            ${eventsWithVagas.map(e => {
              let urgClass = 'urgency-low', urgLabel = `${e.daysUntil}d`;
              if (e.daysUntil <= 7)  { urgClass = 'urgency-high'; urgLabel = `🔴 ${e.daysUntil}d`; }
              else if (e.daysUntil <= 30) { urgClass = 'urgency-mid'; urgLabel = `🟡 ${e.daysUntil}d`; }
              else { urgLabel = `🟢 ${e.daysUntil}d`; }
              return `<tr onclick="window.openEventView('${e.id}')">
                <td style="font-weight:800;">${e.evento}</td>
                <td>${dateFmt(e)}</td>
                <td>${e.vagas}</td>
                <td>${e.cota ? cotaBadge(e.cota) : '<span style="color:var(--muted)">—</span>'}</td>
                <td>${statusBadge(e.status)}</td>
                <td class="${urgClass}">${urgLabel}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
    }
  
    // ── EXPORTAR PDF (DASHBOARD) ──
    document.getElementById('btn-export-pdf-dash').onclick = async () => {
      const btn = document.getElementById('btn-export-pdf-dash');
      btn.innerHTML = '<i data-lucide="loader-2"></i> Gerando PDF...'; btn.disabled = true; refreshIcons();
      try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const W = pdf.internal.pageSize.getWidth();
        const H = pdf.internal.pageSize.getHeight();
  
        // Header
        pdf.setFillColor(37, 99, 235);
        pdf.rect(0, 0, W, 18, 'F');
        pdf.setTextColor(255,255,255);
        pdf.setFont('helvetica','bold');
        pdf.setFontSize(14);
        pdf.text('Tripla · Calendário Estratégico', 14, 12);
        pdf.setFontSize(9);
        pdf.setFont('helvetica','normal');
        pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}`, W-14, 12, {align:'right'});
  
        // KPIs
        pdf.setTextColor(15,23,42);
        const kpis = [
          ['Total de Eventos', document.getElementById('dash-total')?.textContent || '0'],
          ['Comerciais',       document.getElementById('dash-comercial')?.textContent || '0'],
          ['Internos',         document.getElementById('dash-interno')?.textContent || '0'],
          ['Confirmados',      document.getElementById('dash-confirmados')?.textContent || '0'],
          ['Próx. 30 dias',    document.getElementById('dash-proximos')?.textContent || '0'],
          ['Taxa Confirmação', document.getElementById('dash-taxa')?.textContent || '0%'],
          ['Vagas Abertas',    document.getElementById('dash-vagas')?.textContent || '0'],
          ['Concluídos',       document.getElementById('dash-concluidos')?.textContent || '0'],
        ];
        const cardW = (W - 28) / 4, cardH = 22, cardMargin = 4;
        kpis.forEach((kpi, i) => {
          const col = i % 4, row = Math.floor(i / 4);
          const x = 14 + col * (cardW + cardMargin), y = 24 + row * (cardH + cardMargin);
          pdf.setFillColor(241,245,249); pdf.roundedRect(x, y, cardW, cardH, 3, 3, 'F');
          pdf.setFont('helvetica','normal'); pdf.setFontSize(7); pdf.setTextColor(100,116,139);
          pdf.text(kpi[0], x+4, y+7);
          pdf.setFont('helvetica','bold'); pdf.setFontSize(16); pdf.setTextColor(15,23,42);
          pdf.text(kpi[1], x+4, y+17);
        });
  
        // Charts via canvas (render each as image)
        const chartIds = ['chartTipos','chartMeses','chartStatus','chartResp'];
        const chartTitles = ['Tipo de Evento','Por Mês','Por Status','Por Organizador'];
        const chartW = (W - 28) / 2 - 4, chartH = 60;
        const chartStartY = 74;
  
        for (let i = 0; i < chartIds.length; i++) {
          const canvas = document.getElementById(chartIds[i]);
          if (!canvas) continue;
          const imgData = canvas.toDataURL('image/png');
          const col = i % 2, row = Math.floor(i / 2);
          const x = 14 + col * (chartW + 8), y = chartStartY + row * (chartH + 16);
          pdf.setFillColor(255,255,255); pdf.roundedRect(x, y - 8, chartW, chartH + 12, 3, 3, 'F');
          pdf.setFont('helvetica','bold'); pdf.setFontSize(8); pdf.setTextColor(100,116,139);
          pdf.text(chartTitles[i], x + 4, y - 1);
          pdf.addImage(imgData, 'PNG', x + 4, y + 2, chartW - 8, chartH - 8);
        }
  
        // Page 2: Upcoming events table
        pdf.addPage();
        pdf.setFillColor(37,99,235); pdf.rect(0,0,W,18,'F');
        pdf.setTextColor(255,255,255); pdf.setFont('helvetica','bold'); pdf.setFontSize(12);
        pdf.text('Eventos — Visão Completa', 14, 12);
        pdf.setTextColor(15,23,42);
  
        const evs = EVENTS.sort((a,b)=>(parseDate(a.data_ini)||new Date(2030,0))-(parseDate(b.data_ini)||new Date(2030,0)));
        const cols = ['Data','Evento','Tipo','Status','Responsável'];
        const colW = [32,80,28,32,50];
        let yPos = 28;
        pdf.setFillColor(241,245,249); pdf.rect(14, yPos-5, W-28, 10, 'F');
        pdf.setFont('helvetica','bold'); pdf.setFontSize(7.5); pdf.setTextColor(100,116,139);
        let xPos = 14;
        cols.forEach((c,i)=>{ pdf.text(c, xPos+2, yPos+1); xPos+=colW[i]; });
        yPos += 8;
  
        pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5);
        evs.forEach(ev => {
          if (yPos > H-14) { pdf.addPage(); yPos = 20; }
          pdf.setTextColor(15,23,42);
          if (evs.indexOf(ev) % 2 === 0) { pdf.setFillColor(248,250,252); pdf.rect(14,yPos-4,W-28,8,'F'); }
          xPos = 14;
          const row = [dateFmt(ev), ev.evento||'', ev.tipo||'', ev.status||'', ev.responsavel||''];
          row.forEach((cell,i)=>{ pdf.text(String(cell).substring(0,colW[i]/2.2), xPos+2, yPos); xPos+=colW[i]; });
          yPos += 8;
        });
  
        pdf.save(`Tripla_Dashboard_${new Date().toISOString().slice(0,10)}.pdf`);
        showToast('PDF gerado e baixado com sucesso! 📄', 'success');
      } catch(err) {
        console.error(err);
        showToast('Erro ao gerar PDF. Tente novamente.', 'error');
      }
      btn.innerHTML = '<i data-lucide="file-output"></i> Exportar PDF'; btn.disabled = false; refreshIcons();
    };
  
  
    // ── IMPORTAÇÃO CSV ──
    document.getElementById('btn-download-csv').onclick = () => { const csvContent = "evento,data_ini,data_fim,tipo,status,responsavel,formato,cota,vagas,publico,beneficios,obs,participantes\n\"Exemplo Palestra\",2026-05-10,2026-05-10,Comercial,Confirmado,\"Jéss, Jê\",Online,Ouro,10,Clientes,Logo no site,Nota extra,Emilly\n"; const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "template_eventos.csv"; a.click(); };
    let fileToUpload = null;
    document.getElementById('csv-file').onchange = (e) => { fileToUpload = e.target.files[0]; const dropzone = document.getElementById('file-dropzone'), btn = document.getElementById('btn-upload-csv'); if(fileToUpload) { dropzone.innerHTML = `<div style="font-size:2.5rem; margin-bottom:12px">✅</div><div style="font-weight:600">Arquivo <b>${fileToUpload.name}</b> pronto!</div>`; dropzone.style.borderColor = "var(--green)"; btn.disabled = false; } };
    function parseCSVLine(text) { let ret = [], val = "", inQ = false; for(let ch of text){ if(inQ){ if(ch === '"') inQ = false; else val += ch; } else { if(ch === '"') inQ = true; else if(ch === ',') { ret.push(val.trim()); val = ""; } else val += ch; } } ret.push(val.trim()); return ret; }
    document.getElementById('btn-upload-csv').onclick = () => {
      if(!fileToUpload) return; const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result; const lines = text.split('\n').filter(l => l.trim() !== ''); if(lines.length < 2) { showToast('Arquivo vazio ou inválido.', 'error'); return; }
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase()); const batch = db.batch(); let count = 0;
        for(let i = 1; i < lines.length; i++) { const row = parseCSVLine(lines[i]); let obj = {}; headers.forEach((h, idx) => { obj[h] = row[idx] ? row[idx] : ''; }); if(obj.evento && obj.data_ini) { obj.mes_ref = MONTHS_PT[parseDate(obj.data_ini).getMonth()] || ''; batch.set(db.collection("eventos").doc(), obj); count++; } }
        if(count > 0) { document.getElementById('btn-upload-csv').textContent = "Enviando..."; try { await batch.commit(); showToast(`✅ ${count} eventos importados com sucesso!`, 'success'); fileToUpload = null; document.getElementById('file-dropzone').innerHTML = `<div style="font-size:2.5rem; margin-bottom:12px">📁</div><div style="font-weight:600">Arraste o <b>.csv</b> aqui</div>`; document.getElementById('file-dropzone').style.borderColor = "var(--border)"; document.getElementById('btn-upload-csv').textContent = "Iniciar Importação"; document.getElementById('btn-upload-csv').disabled = true; await loadDataFromFirebase(); } catch(err) { showToast('Erro ao salvar no banco.', 'error'); } }
      }; reader.readAsText(fileToUpload);
    };
  
    // ── LOGICA DO MODAL ──
    window.openEventView = function(id) {
      const ev = EVENTS.find(e => e.id === id); if(!ev) return; currentEditId = id;
      document.getElementById('view-header').style.setProperty('--card-color', TYPE_COLOR[ev.tipo] || 'var(--accent)');
      document.getElementById('view-title').textContent = ev.evento;
      document.getElementById('view-temporal-badge-header').innerHTML = temporalBadge(ev);
      document.getElementById('view-badges').innerHTML = typeBadge(ev.tipo) + statusBadge(ev.status);
  
      // Date + hora
      let dateStr = `📅 ${dateFmt(ev)}`;
      if (ev.hora_ini) dateStr += ` · ⏰ ${ev.hora_ini}${ev.hora_fim ? ' – ' + ev.hora_fim : ''}`;
      document.getElementById('view-date').innerHTML = dateStr;
  
      let rPills = getRespArray(ev.responsavel).map(r => `<span class="resp-pill">${r}</span>`).join('');
      document.getElementById('view-resp-list').innerHTML = rPills || '<span style="color:var(--muted)">Não definido</span>';
  
      document.getElementById('view-status').textContent = ev.status || '-';
      document.getElementById('view-formato').textContent = ev.formato || 'Não definido';
      const blockCota = document.getElementById('block-cota');
      if (ev.cota || ev.vagas) { blockCota.style.display = 'block'; document.getElementById('view-cota').innerHTML = cotaBadge(ev.cota) || '-'; document.getElementById('view-vagas').textContent = ev.vagas || '-'; } else { blockCota.style.display = 'none'; }
  
      // Financeiro Consolidado
      const costBrindes = BRINDES.filter(b => b.evento_id === ev.id).reduce((s, b) => s + (parseFloat(b.vlr_unit)||0) * (parseInt(b.qtd)||0), 0);
      const costUniformes = UNIFORMES.filter(u => u.evento_id === ev.id).reduce((s, u) => s + (parseFloat(u.vlr_unit)||0) * (parseInt(u.qtd)||0), 0);
      const costTotal = costBrindes + costUniformes;
      if (costTotal > 0 && (userRole === 'admin' || userRole === 'editor')) {
        document.getElementById('block-financeiro').style.display = 'block';
        let fv = function(v){ return parseFloat(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); };
        document.getElementById('view-fin-brindes').textContent = fv(costBrindes);
        document.getElementById('view-fin-unif').textContent = fv(costUniformes);
        document.getElementById('view-fin-total').textContent = fv(costTotal);
      } else {
        document.getElementById('block-financeiro').style.display = 'none';
      }
  
      const toggleBlock = (blockId, val, render) => {
        const el = document.getElementById(blockId);
        if (!el) return;
        if (val) { el.style.display = 'block'; const vEl = document.getElementById(blockId.replace('block-','view-')); if(vEl) vEl.innerHTML = render ? render(val) : escapeHtml(val); }
        else { el.style.display = 'none'; }
      };
      toggleBlock('block-publico', ev.publico);
      toggleBlock('block-beneficios', ev.beneficios);
      toggleBlock('block-obs', ev.obs);
      if (ev.equipe && ev.equipe.length > 0) {
        document.getElementById('block-participantes').style.display = 'block';
        const mapEquipe = ev.equipe.map(m => {
          const bdg = m.funcao ? `<span style="font-size:0.7rem;background:var(--border);padding:2px 5px;border-radius:4px;font-weight:700;color:var(--text);margin-left:4px;">${escapeHtml(m.funcao)}</span>` : '';
          const unifBdg = m.camisa_id ? (() => { const u=UNIFORMES.find(x=>x.id===m.camisa_id); return u ? `<span style="font-size:0.7rem;color:var(--accent);font-weight:700;margin-left:6px;">👕 ${u.cor} ${u.tamanho!=='Único'?u.tamanho:''}</span>`:'' })() : '';
          return `<div style="padding:4px 0; border-bottom:1px solid rgba(0,0,0,0.05);">${escapeHtml(m.nome)}${bdg}${unifBdg}</div>`;
        }).join('');
        document.getElementById('view-participantes').innerHTML = mapEquipe;
      } else {
        toggleBlock('block-participantes', ev.participantes);
      }
      toggleBlock('block-localidade', ev.localidade, v => `<a href="https://maps.google.com/?q=${encodeURIComponent(v)}" target="_blank" style="color:var(--accent);font-weight:700;">${escapeHtml(v)} 🗺️</a>`);
      toggleBlock('block-hora', (ev.hora_ini ? ev.hora_ini + (ev.hora_fim ? ' – ' + ev.hora_fim : '') : null));
  
      // Links
      const linksBlock = document.getElementById('block-links');
      if (ev.links && ev.links.trim()) {
        linksBlock.style.display = 'block';
        const linksHtml = ev.links.split('\n').filter(l=>l.trim()).map(l => {
          const url = l.trim();
          const label = url.replace(/^https?:\/\/(www\.)?/,'').split('/')[0];
          return `<a href="${url}" target="_blank" style="display:block;color:var(--accent);font-weight:600;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">🔗 ${label}</a>`;
        }).join('');
        document.getElementById('view-links').innerHTML = linksHtml;
      } else { linksBlock.style.display = 'none'; }
  
      document.getElementById('mode-view').classList.remove('hide');
      document.getElementById('mode-edit').classList.add('hide');
      document.getElementById('modal-overlay').classList.add('open');
      if (!id.startsWith('mock_')) loadComments(id);
      else {
        document.getElementById('comments-list').innerHTML = '<div style="color:var(--muted);font-size:0.8rem;padding:8px 0;text-align:center;">Comentários não disponíveis no modo demo.</div>';
        document.getElementById('comments-count').textContent = '0';
      }
    };
  
    window.currentEquipe = [];
    
    window.renderEquipeBuilder = function() {
      const listEl = document.getElementById('equipe-builder-list');
      const selectEl = document.getElementById('equipe-camisa');
      if(!listEl || !selectEl) return;
      
      // 1. Calculate Unif Stock
      const unifsForEvent = UNIFORMES.filter(u => u.evento_id === currentEditId);
      let optionsHtml = '<option value="">Sem uniforme</option>';
      unifsForEvent.forEach(u => {
        const qtdTotal = parseInt(u.qtd) || 0;
        const qtdUsada = window.currentEquipe.filter(m => m.camisa_id === u.id).length;
        const restante = qtdTotal - qtdUsada;
        const t = u.tamanho ? u.tamanho : 'Único';
        const c = u.cor || 'Sem Cor';
        const label = `👕 ${c} — Tam: ${t} (${restante} disponíveis)`;
        optionsHtml += `<option value="${u.id}" ${restante <= 0 ? 'disabled' : ''}>${label}</option>`;
      });
      selectEl.innerHTML = optionsHtml;
      
      // 2. Render List
      if(window.currentEquipe.length === 0) {
        listEl.innerHTML = '<div style="color:var(--muted);font-size:0.8rem;text-align:center;padding:8px 0;background:var(--surface2);border-radius:var(--radius-sm);">Nenhum participante adicionado.</div>';
        return;
      }
      listEl.innerHTML = window.currentEquipe.map((m, i) => {
        const unif = UNIFORMES.find(u => u.id === m.camisa_id);
        const funcBadge = m.funcao ? `<span style="font-size:0.7rem;background:var(--border);padding:2px 6px;border-radius:4px;font-weight:700;">${escapeHtml(m.funcao)}</span>` : '';
        const unifBadge = unif ? `<span style="font-size:0.7rem;color:var(--accent);font-weight:700;"><i data-lucide="shirt" style="width:12px;height:12px;"></i> ${unif.cor} ${unif.tamanho !== 'Único' ? unif.tamanho : ''}</span>` : '';
        return `<div style="display:flex;justify-content:space-between;align-items:center;background:var(--surface);border:1px solid var(--border);padding:8px 12px;border-radius:var(--radius-sm);">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:700;font-size:0.9rem;">${escapeHtml(m.nome)}</span>
            ${funcBadge}
            ${unifBadge}
          </div>
          <button class="btn-icon" onclick="window.delEquipeMember(${i})" style="color:var(--red);"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
        </div>`;
      }).join('');
    };
  
    window.delEquipeMember = function(idx) {
      window.currentEquipe.splice(idx, 1);
      window.renderEquipeBuilder();
    };
  
    document.getElementById('btn-add-equipe').onclick = (e) => {
      e.preventDefault();
      const nomeInp = document.getElementById('equipe-nome');
      const funcInp = document.getElementById('equipe-funcao');
      const camInp = document.getElementById('equipe-camisa');
      const nome = nomeInp.value.trim();
      if(!nome) return showToast('Informe o nome do participante.', 'warning');
      window.currentEquipe.push({ nome, funcao: funcInp.value.trim(), camisa_id: camInp.value || '' });
      nomeInp.value = '';
      funcInp.value = '';
      window.renderEquipeBuilder();
      nomeInp.focus();
    };
  
    async function loadEventHistory(id) {
      const historyList = document.getElementById('history-list');
      if (!historyList) return;
      historyList.innerHTML = '<div style="text-align:center;padding:20px;"><i data-lucide="loader-2" class="spin"></i> Carregando histórico...</div>';
      refreshIcons();
      try {
        const snap = await db.collection("events").doc(id).collection("history").orderBy("timestamp", "desc").limit(10).get();
        let html = '';
        snap.forEach(doc => {
          const h = doc.data();
          const dateStr = h.timestamp?.toDate().toLocaleString('pt-BR') || '';
          html += `<div style="padding:8px; border-bottom:1px solid var(--border); font-size:0.8rem;">
                     <div style="font-weight:700; color:var(--accent);">${escapeHtml(h.action)} por ${escapeHtml(h.user)}</div>
                     <div style="color:var(--muted);">${dateStr}</div>
                   </div>`;
        });
        historyList.innerHTML = html || '<div style="text-align:center;padding:20px;color:var(--muted);">Nenhum histórico disponível.</div>';
      } catch(e) {
        historyList.innerHTML = '<div style="color:var(--red); font-size:0.8rem;">Erro ao carregar histórico.</div>';
      }
    }
  
    window.openAdminForm = function(id) {
      if(userRole !== 'admin' && userRole !== 'editor') return showToast("Acesso restrito. Apenas admins e editores podem editar.", 'error');
      let ev = EVENTS.find(e => e.id === id);
      if(!id || !ev) {
        ev = { id:"", evento:"", data_ini:"", data_fim:"", hora_ini:"", hora_fim:"", responsavel:"", tipo:"Comercial", status:"Planejado", cota:"", vagas:"", publico:"", beneficios:"", obs:"", formato:"", participantes:"", localidade:"", links:"" };
        document.getElementById('form-title').textContent = "+ Cadastrar Novo Evento";
        document.getElementById('btn-delete').style.display = 'none';
        document.getElementById('btn-cancel-edit').style.display = 'none';
        document.getElementById('history-section').style.display = 'none';
      } else {
        document.getElementById('form-title').textContent = "Editar Evento";
        document.getElementById('btn-delete').style.display = userRole === 'admin' ? 'block' : 'none';
        document.getElementById('btn-cancel-edit').style.display = 'inline-block';
        loadEventHistory(id);
      }
      const selectedArr = getRespArray(ev.responsavel);
          document.querySelectorAll('.resp-checkbox').forEach(cb => { cb.checked = selectedArr.includes(cb.value); });
      const fields = { 
        'id':'id', 'nome':'evento', 'ini':'data_ini', 'fim':'data_fim', 
        'hora-ini':'hora_ini', 'hora-fim':'hora_fim', 'tipo':'tipo', 
        'status':'status', 'formato':'formato', 'cota':'cota', 
        'vagas':'vagas', 'publico':'publico', 'beneficios':'beneficios', 
        'obs':'obs', 'participantes':'participantes', 
        'localidade':'localidade', 'links':'links' 
      };
      Object.entries(fields).forEach(([k, evKey]) => { 
        const input = document.getElementById(`edit-${k}`); 
        if(input) input.value = ev[evKey] || ""; 
      });
      
      // Hydrate Equipe Builder
      window.currentEquipe = ev.equipe ? JSON.parse(JSON.stringify(ev.equipe)) : [];
      if (window.currentEquipe.length === 0 && ev.participantes) window.currentEquipe = [{nome: ev.participantes, funcao: '', camisa_id: ''}];
      window.renderEquipeBuilder();
  
      // Reset UI state
      document.querySelectorAll('.admin-input').forEach(i => i.classList.remove('valid','invalid'));
      document.querySelectorAll('.field-error').forEach(e => e.classList.remove('show'));
      
      document.getElementById('mode-view').classList.add('hide');
      document.getElementById('mode-edit').classList.remove('hide');
      document.getElementById('modal-overlay').classList.add('open');
    };
  
    // ── BINDINGS DE MODAIS E BOTÕES ──
    const _bse = document.getElementById('btn-switch-edit');
    if (_bse) _bse.onclick = () => window.openAdminForm(currentEditId);
  
    // ── FUNÇÕES AUXILIARES PARA PDF ──
    function generateProfessionalPDF(elementId, filename, isLandscape = false) {
      const original = document.getElementById(elementId);
      if (!original) return;
  
      // Criar clone para manipulação sem afetar a UI
      const clone = original.cloneNode(true);
      clone.classList.add('pdf-capture');
      
      // Configurar container invisível mas renderizável
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.appendChild(clone);
      document.body.appendChild(container);
  
      // Adicionar cabeçalho oficial no PDF
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.marginBottom = '30px';
      header.style.paddingBottom = '15px';
      header.style.borderBottom = '2px solid #333';
      header.innerHTML = `
        <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:800;color:#000;">Tripla <span style="color:#2563eb">·</span> Eventos</div>
        <div style="text-align:right;">
          <div style="font-size:12px;font-weight:700;color:#666;">RELATÓRIO GERENCIAL SISTEMA ERP</div>
          <div style="font-size:10px;color:#999;">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
        </div>
      `;
      clone.prepend(header);
  
      // Ajustes específicos no clone (remover botões, expandir scrolls)
      clone.querySelectorAll('button, .modal-actions-top, .admin-sidenav').forEach(el => el.remove());
      
      // CORREÇÃO CRÍTICA: Copiar conteúdo de Canvas (Chart.js) para o clone
      const originalCanvases = original.querySelectorAll('canvas');
      const clonedCanvases = clone.querySelectorAll('canvas');
      originalCanvases.forEach((orig, idx) => {
        if (clonedCanvases[idx]) {
          const destCtx = clonedCanvases[idx].getContext('2d');
          clonedCanvases[idx].width = orig.width;
          clonedCanvases[idx].height = orig.height;
          destCtx.drawImage(orig, 0, 0);
        }
      });
  
      const opt = { 
        margin: 0.4, 
        filename: filename, 
        image: { type: 'jpeg', quality: 1.0 }, 
        html2canvas: { 
          scale: 3, 
          useCORS: true, 
          letterRendering: true,
          backgroundColor: '#ffffff',
          logging: false
        }, 
        jsPDF: { unit: 'in', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
  
      return html2pdf().set(opt).from(clone).save().then(() => {
        document.body.removeChild(container);
      });
    }
  
    // PDF do Modal de Evento
    const _btnPdfModal = document.getElementById('btn-export-pdf-modal');
    if (_btnPdfModal) {
      _btnPdfModal.onclick = async () => {
        const originalText = _btnPdfModal.innerHTML;
        _btnPdfModal.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Gerando Ficha...';
        _btnPdfModal.disabled = true;
        refreshIcons();
        
        const evName = EVENTS.find(e => e.id === currentEditId)?.evento.replace(/\s+/g,'_') || 'Evento';
        await generateProfessionalPDF('mode-view', `Ficha_Evento_${evName}.pdf`, false);
        
        _btnPdfModal.innerHTML = originalText;
        _btnPdfModal.disabled = false;
        refreshIcons();
        showToast('Ficha técnica gerada com sucesso!', 'success');
      };
    }
  
    // PDF do Dashboard Admin
    const _btnPdfDash = document.getElementById('btn-export-pdf-dash');
    if (_btnPdfDash) {
      _btnPdfDash.onclick = async () => {
         const originalText = _btnPdfDash.innerHTML;
         _btnPdfDash.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Gerando Painel...';
         _btnPdfDash.disabled = true;
         refreshIcons();
         try {
           await generateProfessionalPDF('asec-dashboard', `Relatorio_Dashboard_${new Date().toISOString().slice(0,10)}.pdf`, true);
           showToast('Painel exportado com sucesso!', 'success');
         } catch(err) {
           showToast('Erro ao exportar PDF.', 'error');
         }
         _btnPdfDash.innerHTML = originalText;
         _btnPdfDash.disabled = false;
         refreshIcons();
      };
    }
  
    document.getElementById('btn-cancel-edit').onclick = () => window.openEventView(currentEditId);
    document.getElementById('modal-close-view').onclick = () => document.getElementById('modal-overlay').classList.remove('open');
    document.getElementById('modal-close-edit').onclick = () => document.getElementById('modal-overlay').classList.remove('open');
    document.getElementById('btn-add-event').onclick = () => window.openAdminForm('');
  
    // ── VALIDAÇÃO EM TEMPO REAL ──
    function validateField(inputId, errId, condition, msg) {
      const inp = document.getElementById(inputId);
      const err = document.getElementById(errId);
      if (!inp) return true;
      inp.classList.remove('valid','invalid');
      if (err) { err.textContent = msg; err.classList.remove('show'); }
      if (!condition(inp.value)) {
        inp.classList.add('invalid');
        if (err) err.classList.add('show');
        return false;
      }
      inp.classList.add('valid');
      return true;
    }
    document.getElementById('edit-nome')?.addEventListener('input', () => validateField('edit-nome','err-nome', v => v.trim().length > 0, 'Nome do evento é obrigatório.'));
    document.getElementById('edit-ini')?.addEventListener('change', () => {
      validateField('edit-ini','err-ini', v => v.length > 0, 'Data de início é obrigatória.');
      // Auto-fill fim if empty
      const fim = document.getElementById('edit-fim');
      if (fim && !fim.value) fim.value = document.getElementById('edit-ini').value;
    });
    document.getElementById('edit-fim')?.addEventListener('change', () => {
      const ini = document.getElementById('edit-ini').value;
      const fim = document.getElementById('edit-fim').value;
      if (ini && fim && fim < ini) {
        document.getElementById('edit-fim').classList.add('invalid');
        showToast('Data fim não pode ser anterior à data início.', 'warning');
      }
    });
  
    document.getElementById('btn-save').onclick = async () => {
      if(userRole !== 'admin' && userRole !== 'editor') return;
      const ok1 = validateField('edit-nome','err-nome', v => v.trim().length > 0, 'Nome do evento é obrigatório.');
      const ok2 = validateField('edit-ini','err-ini',  v => v.length > 0, 'Data de início é obrigatória.');
      if (!ok1 || !ok2) { showToast('Corrija os campos obrigatórios.', 'warning'); return; }
  
      const id = document.getElementById('edit-id').value;
      const btn = document.getElementById('btn-save');
      const selectedChecks = Array.from(document.querySelectorAll('.resp-checkbox:checked')).map(cb => cb.value);
      const data = {
        evento:       document.getElementById('edit-nome').value,
        data_ini:     document.getElementById('edit-ini').value,
        data_fim:     document.getElementById('edit-fim').value,
        hora_ini:     document.getElementById('edit-hora-ini')?.value || '',
        hora_fim:     document.getElementById('edit-hora-fim')?.value || '',
        responsavel:  selectedChecks.join(', '),
        tipo:         document.getElementById('edit-tipo').value,
        status:       document.getElementById('edit-status').value,
        formato:      document.getElementById('edit-formato').value,
        cota:         document.getElementById('edit-cota').value,
        vagas:        document.getElementById('edit-vagas').value,
        publico:      document.getElementById('edit-publico').value,
        beneficios:   document.getElementById('edit-beneficios').value,
        obs:          document.getElementById('edit-obs').value,
        participantes: window.currentEquipe.map(x => x.nome + (x.funcao ? ` (${x.funcao})` : '')).join(', '),
        equipe:       window.currentEquipe,
        localidade:   document.getElementById('edit-localidade')?.value || '',
        links:        document.getElementById('edit-links')?.value || '',
      };
      data.mes_ref = MONTHS_PT[parseDate(data.data_ini).getMonth()];
      btn.textContent = "Salvando..."; btn.disabled = true;
      try {
        const isNew = !id || id.startsWith('mock_');
        if (!isNew) {
          await db.collection("eventos").doc(id).update(data);
          // Log history
          const authorName = (currentUser?.email||'').split('@')[0].replace('.', ' ').replace(/\b\w/g, l=>l.toUpperCase());
          await db.collection("eventos").doc(id).collection("history").add({
            action: 'Editado', author: authorName, author_email: currentUser?.email||'',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            summary: `Status: ${data.status} · Tipo: ${data.tipo}`
          });
        } else {
          const docRef = await db.collection("eventos").add(data);
          const authorName = (currentUser?.email||'').split('@')[0].replace('.', ' ').replace(/\b\w/g, l=>l.toUpperCase());
          await db.collection("eventos").doc(docRef.id).collection("history").add({
            action: 'Criado', author: authorName, author_email: currentUser?.email||'',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            summary: `Evento criado por ${authorName}`
          });
        }
        document.getElementById('modal-overlay').classList.remove('open');
        showToast(isNew ? 'Evento criado com sucesso! 🎉' : 'Evento atualizado!', 'success');
        addNotification(`${isNew ? '✨ Novo evento' : '✏️ Atualizado'}: <b>${data.evento}</b>`, null);
        await loadDataFromFirebase();
      } catch (e) { showToast("Erro ao salvar no banco. Tente novamente.", 'error'); }
      finally { btn.textContent = "Salvar Alterações"; btn.disabled = false; }
    };
  
    // ── HISTÓRICO DE ALTERAÇÕES ──
    async function loadEventHistory(eventId) {
      const section = document.getElementById('history-section');
      const list = document.getElementById('history-list');
      const count = document.getElementById('history-count');
      if (!section || eventId.startsWith('mock_')) { if(section) section.style.display='none'; return; }
      try {
        const snap = await db.collection("eventos").doc(eventId).collection("history").orderBy("timestamp","desc").limit(20).get();
        const items = [];
        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        if (items.length === 0) { section.style.display = 'none'; return; }
        section.style.display = 'block';
        count.textContent = `${items.length} registro${items.length!==1?'s':''}`;
        list.innerHTML = items.map(h => {
          const ts = h.timestamp ? new Date(h.timestamp.toDate ? h.timestamp.toDate() : h.timestamp).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
          const actionColor = h.action==='Criado' ? 'var(--green)' : h.action==='Excluído' ? 'var(--red)' : 'var(--accent)';
          return `<div class="history-item">
            <div class="history-dot" style="background:${actionColor};"></div>
            <div>
              <div class="history-text"><strong style="color:${actionColor}">${h.action}</strong> por <strong>${h.author||'Sistema'}</strong>${h.summary ? ` — <span style="color:var(--muted)">${h.summary}</span>` : ''}</div>
              <div class="history-time">${ts}</div>
            </div>
          </div>`;
        }).join('');
      } catch(e) { section.style.display = 'none'; }
    }
  
    // ── DUPLICAR EVENTO ──
    document.getElementById('btn-duplicate').onclick = async () => {
      const id = document.getElementById('edit-id').value;
      const ev = EVENTS.find(e => e.id === id);
      if (!ev) { showToast('Salve o evento primeiro antes de duplicar.', 'warning'); return; }
      if (id.startsWith('mock_')) { showToast('Não é possível duplicar no modo demo.', 'warning'); return; }
      const { id: _, ...evData } = ev;
      const copy = { ...evData, evento: `${ev.evento} (Cópia)`, status: 'Planejado' };
      try {
        await db.collection("eventos").add(copy);
        document.getElementById('modal-overlay').classList.remove('open');
        showToast(`Evento duplicado como "${copy.evento}"!`, 'success');
        await loadDataFromFirebase();
      } catch(e) { showToast('Erro ao duplicar evento.', 'error'); }
    };
  
    // ── HOVER POPOVER nos cards de evento ──
    const popover = document.getElementById('ev-popover');
    let popTimeout = null;
    document.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.event-card, .cal-event-pill, .week-event');
      if (!card) return;
      const evId = card.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
      if (!evId) return;
      const ev = EVENTS.find(e => e.id === evId);
      if (!ev) return;
      clearTimeout(popTimeout);
      popTimeout = setTimeout(() => {
        const respStr = getRespArray(ev.responsavel).join(', ') || '—';
        popover.innerHTML = `
          <div class="ev-popover-title">${escapeHtml(ev.evento)}</div>
          <div class="ev-popover-row">📅 ${dateFmt(ev)}${ev.hora_ini ? ' · ' + ev.hora_ini : ''}</div>
          <div class="ev-popover-row">${typeBadge(ev.tipo)} ${statusBadge(ev.status)}</div>
          ${respStr !== '—' ? `<div class="ev-popover-row">👤 ${escapeHtml(respStr)}</div>` : ''}
          ${ev.localidade ? `<div class="ev-popover-row">📍 ${escapeHtml(ev.localidade)}</div>` : ''}
        `;
        popover.style.display = 'block';
      }, 400);
    });
    document.addEventListener('mousemove', (e) => {
      if (popover.style.display === 'block') {
        popover.style.left = (e.clientX + 14) + 'px';
        popover.style.top  = (e.clientY + 14) + 'px';
      }
    });
    document.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.event-card, .cal-event-pill, .week-event');
      if (card) { clearTimeout(popTimeout); popover.style.display = 'none'; }
    });
    document.getElementById('btn-delete').onclick = async () => {
      if(userRole !== 'admin') return;
      const id = document.getElementById('edit-id').value;
      const evName = document.getElementById('edit-nome').value || 'este evento';
      const confirmed = await showConfirm('Excluir evento?', `Tem certeza que deseja excluir "${evName}"? Esta ação não pode ser desfeita.`);
      if (!confirmed) return;
      try {
        if(id && !id.startsWith('mock_')) await db.collection("eventos").doc(id).delete();
        document.getElementById('modal-overlay').classList.remove('open');
        showToast('Evento excluído.', 'warning');
        await loadDataFromFirebase();
      } catch (e) { showToast('Erro ao excluir evento.', 'error'); console.error(e); }
    };
  
    // ── EVENT LISTENERS & UI ──
  
    // Botão "⚙️ Painel Admin" no header — fica só aqui, sem duplicata nas tabs
    document.getElementById('btn-admin-toggle').onclick = () => {
      if (currentView === 'admin') {
        // Já no painel: volta para timeline
        document.querySelector('.view-tab[data-view="timeline"]').click();
      } else {
        // Vai para o painel admin
        document.getElementById('tab-admin').click();
      }
    };
  
    document.getElementById('btn-theme').onclick = () => {
      const html = document.documentElement;
      html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
    };
  
    document.getElementById('btn-export').onclick = () => {
      let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Tripla//Eventos//PT\n";
      getFilteredEvents().forEach(e => {
        if(!e.data_ini) return;
        const start = e.data_ini.replace(/-/g,'') + 'T000000Z', end = (e.data_fim||e.data_ini).replace(/-/g,'') + 'T235959Z';
        ics += `BEGIN:VEVENT\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${e.evento}\nDESCRIPTION:Resp: ${e.responsavel||''} | Status: ${e.status||''}\nEND:VEVENT\n`;
      });
      ics += "END:VCALENDAR";
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(new Blob([ics], {type:'text/calendar'}));
      a.download = "eventos.ics"; a.click();
      showToast('Calendário exportado como .ics!', 'success');
    };
  
    // ── KEYBOARD SHORTCUTS ──
    document.addEventListener('keydown', (e) => {
      // Don't fire when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      const modal = document.getElementById('modal-overlay');
      if (e.key === 'Escape') { modal.classList.remove('open'); return; }
      if (modal.classList.contains('open')) return;
      const tabs = { 't': 'timeline', 'm': 'calendar', 's': 'semana', 'l': 'list' };
      if (e.key === 'n' && (userRole === 'admin' || userRole === 'editor')) { window.openAdminForm(''); return; }
      if (e.key === 'ArrowRight' && !e.altKey) {
        const idx = VIEW_ORDER.indexOf(currentView);
        const next = VIEW_ORDER[Math.min(idx + 1, VIEW_ORDER.length - 2)];
        document.querySelector(`.view-tab[data-view="${next}"]`)?.click();
      }
      if (e.key === 'ArrowLeft' && !e.altKey) {
        const idx = VIEW_ORDER.indexOf(currentView);
        const prev = VIEW_ORDER[Math.max(idx - 1, 0)];
        document.querySelector(`.view-tab[data-view="${prev}"]`)?.click();
      }
    });
  
    // Show tooltip on first load about shortcuts
    setTimeout(() => { showToast('💡 Dica: use ← → para navegar entre views, N para novo evento.', 'info', 5000); }, 2500);
  
  
  
    document.querySelectorAll('.view-tab').forEach(t => t.onclick = () => {
      const newView = t.dataset.view;
      const oldIdx = VIEW_ORDER.indexOf(currentView);
      const newIdx = VIEW_ORDER.indexOf(newView);
      document.querySelectorAll('.view-tab').forEach(b => b.classList.remove('active'));
      t.classList.add('active');
      currentView = newView;
      // Sincroniza estado ativo do botão do header
      const btn = document.getElementById('btn-admin-toggle');
      btn.classList.toggle('active', currentView === 'admin');
      btn.textContent = currentView === 'admin' ? '✕ Fechar Admin' : '⚙️ Painel Admin';
      // Directional slide animation
      document.querySelectorAll('.view-container').forEach(c => { c.classList.remove('active','slide-in-right','slide-in-left'); });
      const pane = document.getElementById('view-' + currentView);
      if (pane) {
        pane.classList.add('active');
        if (newIdx > oldIdx) pane.classList.add('slide-in-right');
        else if (newIdx < oldIdx) pane.classList.add('slide-in-left');
        setTimeout(() => pane.classList.remove('slide-in-right','slide-in-left'), 300);
      }
      prevViewIndex = newIdx;
      if      (currentView === 'timeline') renderTimeline();
      else if (currentView === 'calendar') renderCalendar();
      else if (currentView === 'week')     renderWeek();
      else if (currentView === 'list')     renderList();
      else if (currentView === 'admin')    renderDashboardAdmin();
    });
    document.querySelectorAll('[data-filter-type]').forEach(b => b.onclick = (e) => { filterType = e.currentTarget.dataset.filterType; document.querySelectorAll('[data-filter-type]').forEach(b=>b.classList.remove('active')); e.currentTarget.classList.add('active'); renderActiveFilterChips(); syncURLState(); initUI(); });
    document.querySelectorAll('[data-filter-status]').forEach(b => b.onclick = (e) => { filterStatus = e.currentTarget.dataset.filterStatus; document.querySelectorAll('[data-filter-status]').forEach(b=>b.classList.remove('active')); e.currentTarget.classList.add('active'); renderActiveFilterChips(); syncURLState(); initUI(); });
    document.getElementById('filter-resp').onchange = (e) => { filterResp = e.target.value; initUI(); };
    document.getElementById('search-input').oninput = (e) => { searchQ = e.target.value; renderSearchCount(); syncURLState(); renderCurrentView(); };
  
    // ── DATE RANGE LISTENERS ──
    document.getElementById('filter-date-from')?.addEventListener('change', (e) => {
      filterDateFrom = e.target.value ? parseDate(e.target.value) : null;
      document.getElementById('btn-clear-daterange').style.display = (filterDateFrom || filterDateTo) ? 'block' : 'none';
      renderActiveFilterChips(); syncURLState(); initUI();
    });
    document.getElementById('filter-date-to')?.addEventListener('change', (e) => {
      filterDateTo = e.target.value ? parseDate(e.target.value) : null;
      document.getElementById('btn-clear-daterange').style.display = (filterDateFrom || filterDateTo) ? 'block' : 'none';
      renderActiveFilterChips(); syncURLState(); initUI();
    });
    document.getElementById('btn-clear-daterange')?.addEventListener('click', () => {
      filterDateFrom = null; filterDateTo = null;
      document.getElementById('filter-date-from').value = '';
      document.getElementById('filter-date-to').value = '';
      document.getElementById('btn-clear-daterange').style.display = 'none';
      renderActiveFilterChips(); syncURLState(); initUI();
    });
    document.getElementById('btn-clear-resp')?.addEventListener('click', () => {
      filterRespMulti = new Set();
      renderMultiRespFilter();
      document.getElementById('btn-clear-resp').style.display = 'none';
      renderActiveFilterChips(); syncURLState(); initUI();
    });
  
    // Load URL state on init
    loadURLState();
    
    document.getElementById('mini-prev').onclick = () => { miniMonth--; if(miniMonth<0){miniMonth=11;miniYear--;} renderMiniCal(); };
    document.getElementById('mini-next').onclick = () => { miniMonth++; if(miniMonth>11){miniMonth=0;miniYear++;} renderMiniCal(); };
    document.getElementById('cal-prev').onclick = () => { calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); };
    document.getElementById('cal-next').onclick = () => { calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); };
    document.getElementById('week-prev').onclick = () => { currentWeekStart.setDate(currentWeekStart.getDate()-7); renderWeek(); };
    document.getElementById('week-next').onclick = () => { currentWeekStart.setDate(currentWeekStart.getDate()+7); renderWeek(); };
    document.querySelectorAll('.list-table th[data-sort]').forEach(th => th.onclick = () => { if (sortCol === th.dataset.sort) sortAsc = !sortAsc; else { sortCol = th.dataset.sort; sortAsc = true; } renderList(); });
    // ══════════════════════════════════════════════════════
    // ── BLOCO OPERACIONAL ──────────────────────────────────
    // ══════════════════════════════════════════════════════
  
    // ── CACHE LOCAL (localStorage) ──
    const CACHE_KEY = 'tripla_events_cache';
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  
    function saveCache(events, responsaveis) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ events, responsaveis, ts: Date.now() })); } catch(e) {}
    }
    function loadCache() {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - data.ts > CACHE_TTL) return null;
        return data;
      } catch(e) { return null; }
    }
  
    // Override loadDataFromFirebase with cache + offline version
    loadDataFromFirebase = async function() {
      // Instant render from cache while fetching
      const cached = loadCache();
      if (cached?.events?.length) {
        EVENTS = cached.events;
        RESPONSAVEIS = cached.responsaveis || [];
        initUI();
      } else {
        showSkeletonTimeline(4);
      }
      try {
        const eSnap = await db.collection("eventos").get();
        const freshEvents = [];
        eSnap.forEach(doc => freshEvents.push({ id: doc.id, ...doc.data() }));
        EVENTS = freshEvents.length ? freshEvents : [...ORIGINAL_EVENTS].map((e,i)=>({id:'mock_'+i,...e}));
        const rSnap = await db.collection("responsaveis").get();
        RESPONSAVEIS = [];
        rSnap.forEach(doc => RESPONSAVEIS.push({ id: doc.id, ...doc.data() }));
        saveCache(EVENTS, RESPONSAVEIS);
        if (userRole === 'admin') await loadPendingUsers();
        setOfflineMode(false);
      } catch(e) {
        console.warn("Firebase inacessível. Usando cache ou fallback.");
        if (!cached) EVENTS = [...ORIGINAL_EVENTS].map((e,i)=>({id:'mock_'+i,...e}));
        setOfflineMode(true);
      }
      if (EVENTS.length > 0) {
        let evsSorted = EVENTS.map(e=>parseDate(e.data_ini)).filter(d=>d).sort((a,b)=>a-b);
        let firstFuture = evsSorted.find(d => d.getTime() >= currentMonthStart.getTime());
        let targetDate = firstFuture || evsSorted[evsSorted.length-1];
        if (targetDate) { calMonth=targetDate.getMonth(); calYear=targetDate.getFullYear(); miniMonth=targetDate.getMonth(); miniYear=targetDate.getFullYear(); currentWeekStart=getStartOfWeek(targetDate); }
      }
      initUI();
      checkUpcomingNotifications();
    };
  
    // ── MODO OFFLINE ──
    let isOffline = false;
    function setOfflineMode(offline) {
      if (isOffline === offline) return;
      isOffline = offline;
      let banner = document.getElementById('offline-banner');
      if (offline) {
        if (!banner) {
          banner = document.createElement('div');
          banner.id = 'offline-banner';
          banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9998;background:#dc2626;color:#fff;text-align:center;padding:8px 16px;font-size:0.82rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:10px;';
          banner.innerHTML = '📡 Sem conexão — exibindo dados em cache. <button onclick="window.location.reload()" style="background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:#fff;padding:3px 10px;border-radius:6px;cursor:pointer;font-weight:700;font-size:0.78rem;">↺ Tentar novamente</button>';
          document.body.prepend(banner);
        }
        showToast('Você está offline. Usando dados em cache.', 'warning', 6000);
      } else {
        banner?.remove();
      }
    }
    window.addEventListener('online',  () => { setOfflineMode(false); showToast('Conexão restaurada! ✅','success'); loadDataFromFirebase(); });
    window.addEventListener('offline', () => setOfflineMode(true));
  
    // ── PAGINAÇÃO NA VIEW LISTA ──
    let listPage = 1;
    const LIST_PAGE_SIZE = 20;
    let _listPaginationActive = false;
  
    // Patch renderList via a unique name
    const _renderListOrig = renderList;
    function renderListPaged() {
      const allEvs = getFilteredEvents().sort((a, b) => {
        let va=a[sortCol]||'', vb=b[sortCol]||'';
        if (sortCol==='data_ini') return sortAsc?(parseDate(va)||new Date(2030,0))-(parseDate(vb)||new Date(2030,0)):(parseDate(vb)||new Date(2030,0))-(parseDate(va)||new Date(2030,0));
        return sortAsc?va.localeCompare(vb):vb.localeCompare(va);
      });
      const body = document.getElementById('list-body');
      const noR  = document.getElementById('list-no-results');
      if (allEvs.length === 0) { body.innerHTML=''; noR.classList.remove('hide'); renderListPagination(0,0); return; }
      noR.classList.add('hide');
      const totalPages = Math.ceil(allEvs.length / LIST_PAGE_SIZE);
      if (listPage > totalPages) listPage = totalPages;
      const start = (listPage-1)*LIST_PAGE_SIZE;
      const evs = allEvs.slice(start, start+LIST_PAGE_SIZE);
      body.innerHTML = evs.map(e=>`
        <tr onclick="window.openEventView('${e.id}')" class="${getStatus(e)}">
        <td style="font-weight:700;">${dateFmt(e)}</td>
        <td><div style="display:flex;align-items:center;gap:8px;"><strong style="font-size:0.95rem;color:var(--text);">${highlight(e.evento,searchQ)}</strong>${temporalBadge(e)}</div></td>
        <td>${typeBadge(e.tipo)}</td><td>${statusBadge(e.status)}</td>
        <td><div style="color:var(--text);font-weight:600;font-size:0.85rem;">${e.participantes||'<span style="color:var(--muted);font-weight:400">-</span>'}</div></td>
        </tr>`).join('');
      renderListPagination(allEvs.length, totalPages);
    }
  
    function renderListPagination(total, totalPages) {
      let pager = document.getElementById('list-pagination');
      if (!pager) {
        pager = document.createElement('div');
        pager.id = 'list-pagination';
        pager.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 0;font-size:0.82rem;font-weight:600;color:var(--muted);flex-wrap:wrap;gap:8px;';
        document.getElementById('view-list')?.appendChild(pager);
      }
      if (total === 0 || totalPages <= 1) { pager.innerHTML=''; return; }
      const start=(listPage-1)*LIST_PAGE_SIZE+1, end=Math.min(listPage*LIST_PAGE_SIZE,total);
      const pages = Array.from({length:totalPages},(_,i)=>i+1);
      pager.innerHTML = `
        <span>${start}–${end} de ${total} eventos</span>
        <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
          <button onclick="window._listPg(${listPage-1})" ${listPage<=1?'disabled':''} class="btn-icon" style="padding:5px 10px;">←</button>
          ${pages.map(p=>`<button onclick="window._listPg(${p})" class="btn-icon${p===listPage?' active':''}" style="padding:5px 9px;min-width:30px;">${p}</button>`).join('')}
          <button onclick="window._listPg(${listPage+1})" ${listPage>=totalPages?'disabled':''} class="btn-icon" style="padding:5px 10px;">→</button>
        </div>
        <span>Página ${listPage}/${totalPages}</span>`;
    }
    window._listPg = (p) => { listPage=p; renderListPaged(); document.getElementById('view-list')?.scrollIntoView({behavior:'smooth',block:'start'}); };
  
    // Reset pagination when filters/search change — patch via global flag
    const _initUIOrig = initUI;
    function initUIPatched() { listPage=1; _initUIOrig(); }
  
    // ── BOTÃO "HOJE" em calendário e semana ──
    function addTodayButton(navSelector, clickFn) {
      const nav = document.querySelector(navSelector);
      if (!nav || nav.querySelector('.btn-today')) return;
      const btn = document.createElement('button');
      btn.className = 'btn-icon btn-today';
      btn.textContent = '⊙ Hoje';
      btn.style.fontWeight = '700';
      btn.onclick = clickFn;
      nav.insertBefore(btn, nav.children[1]);
    }
    function renderCalendarPatched() {
      renderCalendar();
      addTodayButton('#view-calendar .cal-nav', () => { calMonth=today.getMonth(); calYear=today.getFullYear(); renderCalendarPatched(); });
    }
    function renderWeekPatched() {
      renderWeek();
      addTodayButton('#view-week .cal-nav', () => { currentWeekStart=getStartOfWeek(today); renderWeekPatched(); });
    }
    function renderTimelinePatched() {
      renderTimeline();
      if (!searchQ) return;
      document.querySelectorAll('#timeline-content .event-name').forEach(el => { el.innerHTML = highlight(el.textContent, searchQ); });
    }
  
    // Override renderCurrentView to use patched versions
    function renderCurrentView() {
      document.querySelectorAll('.view-container').forEach(c => c.classList.remove('active'));
      const pane = document.getElementById('view-' + currentView);
      if (pane) pane.classList.add('active');
      if      (currentView === 'timeline') renderTimelinePatched();
      else if (currentView === 'calendar') renderCalendarPatched();
      else if (currentView === 'week')     renderWeekPatched();
      else if (currentView === 'list')     renderListPaged();
      else if (currentView === 'admin')    renderDashboardAdmin();
    }
  
    // Also patch renderAll to use patched versions
    function renderAll() { renderMiniCal(); renderUpcoming(); renderDashboardAdmin(); renderCurrentView(); }
    // And initUI to reset page
    function initUI() { listPage=1; document.getElementById('today-badge').textContent = today.toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'}); updateResponsiblesUI(); renderFormatoFilter(); renderActiveFilterChips(); syncURLState(); renderAll(); }
  
    // ── LOG DETALHADO DE IMPORTAÇÃO CSV ──
    document.getElementById('btn-upload-csv').onclick = () => {
      if (!fileToUpload) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const text = evt.target.result;
        const lines = text.split('\n').filter(l=>l.trim()!=='');
        if (lines.length < 2) { showToast('Arquivo vazio ou inválido.', 'error'); return; }
        const headers = parseCSVLine(lines[0]).map(h=>h.toLowerCase());
        const batch = db.batch();
        let count=0, skipped=0, firstError='';
        for (let i=1; i<lines.length; i++) {
          const row = parseCSVLine(lines[i]); let obj={};
          headers.forEach((h,idx)=>{ obj[h]=row[idx]?row[idx]:''; });
          if (!obj.evento) { skipped++; continue; }
          if (!obj.data_ini) { if(!firstError) firstError=`Linha ${i+1}: "${obj.evento}" sem data`; skipped++; continue; }
          obj.mes_ref = MONTHS_PT[parseDate(obj.data_ini)?.getMonth()]||'';
          batch.set(db.collection("eventos").doc(), obj); count++;
        }
        if (count===0) { showToast('Nenhum evento válido no CSV.','warning'); return; }
        const btnUpload = document.getElementById('btn-upload-csv');
        btnUpload.textContent=`Importando ${count}...`; btnUpload.disabled=true;
        try {
          await batch.commit();
          let msg = `✅ ${count} evento${count!==1?'s':''} importado${count!==1?'s':''}!`;
          if (skipped>0) msg+=` ${skipped} ignorada${skipped!==1?'s':''}.`;
          showToast(msg,'success',6000);
          if (firstError) setTimeout(()=>showToast(`⚠️ ${firstError}`,'warning',7000),600);
          addNotification(`📥 CSV: ${count} eventos importados.`,null);
          fileToUpload=null;
          document.getElementById('file-dropzone').innerHTML='<div style="font-size:2rem;margin-bottom:12px">📁</div><div style="font-weight:600">Arraste o <b>.csv</b> aqui</div>';
          document.getElementById('file-dropzone').style.borderColor='var(--border)';
          btnUpload.textContent='Iniciar Importação'; btnUpload.disabled=true;
          await loadDataFromFirebase();
        } catch(err) { showToast('Erro ao salvar no banco.','error'); btnUpload.textContent='Iniciar Importação'; btnUpload.disabled=false; }
      };
      reader.readAsText(fileToUpload);
    };
  
    // ══════════════════════════════════════════════════════════
    // ── GESTÃO OPERACIONAL: BRINDES / FORNECEDORES / UNIFORMES
    // ══════════════════════════════════════════════════════════
  
    let ESTOQUE     = [];
    let BRINDES     = [];
    let FORNECEDORES_LIST = [];
    let UNIFORMES   = [];
    window.lastSavedId = null; // Usado para destacar (flash-green) itens editados ou criados
  
    // ── Sub-tabs de gestão ──
    document.querySelectorAll('.gestao-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.gestao-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.gestao-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('gpane-' + tab.dataset.gtab).classList.add('active');
      };
    });
  
    // ── Helpers de formatação ──
    function fmtBRL(v) {
      const n = parseFloat(v) || 0;
      return n.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    }
    function nivelBadge(nivel) {
      const map = { 'Massa':'nivel-massa', 'Qualificação':'nivel-qualif', 'VIP':'nivel-vip' };
      return `<span class="badge ${map[nivel]||'nivel-massa'}">${nivel||'—'}</span>`;
    }
    function unifStatusBadge(s) {
      const map = { 'Pedido':'unif-status-pedido','Em Produção':'unif-status-producao','Entregue':'unif-status-entregue','Cancelado':'unif-status-cancelado' };
      return `<span class="badge ${map[s]||''}">${s||'—'}</span>`;
    }
    function fornNome(id) {
      const f = FORNECEDORES_LIST.find(x => x.id === id);
      return f ? f.nome : (id ? `<span style="color:var(--muted)">${id}</span>` : '—');
    }
    function eventoNome(id) {
      const e = EVENTS.find(x => x.id === id);
      return e ? e.evento : '—';
    }
  
    // ── Preencher selects de fornecedor/evento nos forms e nos filtros ──
    function populateGestaoSelects() {
      ['brinde-fornecedor','unif-fornecedor','estoque-fornecedor'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">— Selecionar —</option>';
        FORNECEDORES_LIST.forEach(f => {
          const opt = document.createElement('option');
          opt.value = f.id; opt.textContent = f.nome;
          sel.appendChild(opt);
        });
        if (cur) sel.value = cur;
      });
  
      // Selects de vínculo (forms de adicionar/editar)
      ['brinde-evento','unif-evento'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">— Sem vínculo —</option>';
        EVENTS.filter(e => e.tipo !== 'Feriado').sort((a,b) => (parseDate(a.data_ini)||new Date(2030,0))-(parseDate(b.data_ini)||new Date(2030,0))).forEach(e => {
          const opt = document.createElement('option');
          opt.value = e.id; opt.textContent = `${e.evento} (${e.mes_ref||''})`;
          sel.appendChild(opt);
        });
        if (cur) sel.value = cur;
      });
  
      // Selects de filtro de evento (filtros de tabela/kanban)
      ['filtro-brinde-evento','filtro-unif-evento'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">Todos os Eventos</option>';
        EVENTS.filter(e => e.tipo !== 'Feriado').sort((a,b) => (parseDate(a.data_ini)||new Date(2030,0))-(parseDate(b.data_ini)||new Date(2030,0))).forEach(e => {
          const opt = document.createElement('option');
          opt.value = e.id; opt.textContent = e.evento;
          sel.appendChild(opt);
        });
        if (cur) sel.value = cur;
      });
      
      // Populate Brindes/Uniformes base items from Estoque Global
      ['brinde-estoque-id','unif-estoque-id'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const cur = sel.value;
        const isBrinde = selId === 'brinde-estoque-id';
        sel.innerHTML = `<option value="">— Selecione ${isBrinde ? 'um Brinde' : 'um Uniforme'} Mestre —</option>`;
        ESTOQUE.filter(x => x.tipo === (isBrinde ? 'brinde' : 'uniforme')).sort((a,b)=>(a.nome||'').localeCompare(b.nome||'')).forEach(e => {
          const opt = document.createElement('option');
          opt.value = e.id;
          const saldo = (parseInt(e.qtd_inicial)||0) - getEstoqueAlocado(e.id);
          const sub = isBrinde ? e.nivel : `Tamanho ${e.tamanho||'U'}${e.cor ? ' - '+e.cor : ''}`;
          opt.textContent = `${e.nome} (${sub}) — Saldo: ${saldo}`;
          if (saldo <= 0) opt.textContent = `⚠️ ` + opt.textContent;
          sel.appendChild(opt);
        });
        if (cur) sel.value = cur;
      });
    }
  
    // ════════════ ALMOXARIFADO (ESTOQUE GLOBAL) ════════════
    window.toggleEstoqueFields = function() {
      const t = document.getElementById('estoque-tipo').value;
      document.getElementById('wrap-est-nivel').style.display = t === 'brinde' ? 'block' : 'none';
      document.getElementById('wrap-est-tamanho').style.display = t === 'uniforme' ? 'block' : 'none';
      document.getElementById('wrap-est-cor').style.display = t === 'uniforme' ? 'block' : 'none';
      document.getElementById('lbl-estoque-nome').textContent = t === 'brinde' ? 'Nome do Brinde *' : 'Modelo Uniforme *';
    };
  
    async function loadEstoque() {
      try {
        const snap = await db.collection("estoque").orderBy("nome").get();
        ESTOQUE = [];
        snap.forEach(doc => ESTOQUE.push({ id: doc.id, ...doc.data() }));
      } catch(e) { ESTOQUE = []; }
      renderEstoque();
    }
  
    function getEstoqueAlocado(estId) {
      let sum = 0;
      BRINDES.filter(b => b.estoque_id === estId).forEach(b => sum += parseInt(b.qtd||0));
      UNIFORMES.filter(u => u.estoque_id === estId).forEach(u => sum += parseInt(u.qtd||0));
      return sum;
    }
  
    function renderEstoque() {
      const tbody = document.getElementById('estoque-body');
      if (!tbody) return;
      const busca = (document.getElementById('filtro-estoque-busca')?.value || '').toLowerCase();
      const tipo = document.getElementById('filtro-estoque-tipo')?.value || '';
      let list = ESTOQUE;
      if (busca) list = list.filter(e => (e.nome||'').toLowerCase().includes(busca) || (e.cor||'').toLowerCase().includes(busca));
      if (tipo) list = list.filter(e => e.tipo === tipo);
  
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--muted);">Nenhum item cadastrado no Almoxarifado.</td></tr>';
        return;
      }
  
      tbody.innerHTML = list.map(e => {
        const qtdTotal = parseInt(e.qtd_inicial)||0;
        const qtdAlocada = getEstoqueAlocado(e.id);
        const saldo = qtdTotal - qtdAlocada;
        const vlr = parseFloat(e.vlr_unit)||0;
        const isBrinde = e.tipo === 'brinde';
        let subtipoHtml = isBrinde ? nivelBadge(e.nivel) : `<span style="font-size:0.75rem;font-weight:700;">Tam: ${e.tamanho||'Único'}</span>`;
        const isNew = window.lastSavedId === e.id ? 'flash-green' : '';
        let corFormat = !isBrinde && e.cor ? `<br><span style="font-size:0.75rem;color:var(--muted)">Cor: ${escapeHtml(e.cor)}</span>` : '';
        
        return `<tr class="${isNew}">
          <td><span class="badge ${isBrinde ? 'nivel-massa' : 'nivel-vip'}" style="font-size:0.7rem;">${isBrinde ? '🎁 Brinde' : '👕 Uniforme'}</span></td>
          <td><strong>${highlight(e.nome, busca)}</strong>${corFormat}</td>
          <td>${subtipoHtml}</td>
          <td style="font-weight:600">${vlr > 0 ? fmtBRL(vlr) : '—'}</td>
          <td style="font-size:0.75rem">${fornNome(e.fornecedor_id)}</td>
          <td style="font-weight:700;color:var(--text)">${qtdTotal}</td>
          <td style="font-weight:700;color:var(--amber)">${qtdAlocada}</td>
          <td style="font-weight:800;color:${saldo<0?'var(--red)':saldo===0?'var(--muted)':'var(--green)'}">${saldo}</td>
          <td style="text-align:right;white-space:nowrap;">
            <button class="tbl-action edit" onclick="window.editEstoque('${e.id}')" title="Editar"><i data-lucide="edit-2"></i></button>
            <button class="tbl-action del" onclick="window.deleteEstoque('${e.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`;
      }).join('');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  
    window.editEstoque = (id) => {
      const e = ESTOQUE.find(x => x.id === id); if(!e) return;
      document.getElementById('estoque-id').value = id;
      document.getElementById('estoque-tipo').value = e.tipo || 'brinde';
      window.toggleEstoqueFields();
      document.getElementById('estoque-nome').value = e.nome || '';
      document.getElementById('estoque-nivel').value = e.nivel || 'Massa';
      document.getElementById('estoque-tamanho').value = e.tamanho || 'Único';
      document.getElementById('estoque-cor').value = e.cor || '';
      document.getElementById('estoque-qtd').value = e.qtd_inicial || '';
      document.getElementById('estoque-vlr').value = e.vlr_unit || '';
      document.getElementById('estoque-fornecedor').value = e.fornecedor_id || '';
      document.getElementById('btn-save-estoque').textContent = 'Salvar Alterações';
      document.getElementById('btn-cancel-estoque').style.display = 'inline-block';
      const form = document.getElementById('estoque-add-form');
      if(form) form.scrollIntoView({behavior:'smooth', block:'nearest'});
    };
  
    document.getElementById('btn-cancel-estoque').onclick = () => {
      document.getElementById('estoque-id').value = '';
      ['estoque-nome','estoque-cor','estoque-qtd','estoque-vlr','estoque-fornecedor'].forEach(id => {let el=document.getElementById(id); if(el) el.value = '';});
      document.getElementById('estoque-tipo').value = 'brinde';
      document.getElementById('estoque-nivel').value = 'Massa';
      document.getElementById('estoque-tamanho').value = 'Único';
      window.toggleEstoqueFields();
      document.getElementById('btn-save-estoque').textContent = '+ Registrar no Almoxarifado';
      document.getElementById('btn-cancel-estoque').style.display = 'none';
    };
  
    document.getElementById('btn-save-estoque').onclick = async () => {
      const id = document.getElementById('estoque-id').value;
      const nome = document.getElementById('estoque-nome').value.trim();
      if (!nome) { showToast('Nome do item é obrigatório.', 'warning'); return; }
      
      const btn = document.getElementById('btn-save-estoque');
      btn.textContent = 'Salvando...'; btn.disabled = true;
      
      const payload = {
        tipo: document.getElementById('estoque-tipo').value,
        nome,
        nivel: document.getElementById('estoque-nivel').value,
        tamanho: document.getElementById('estoque-tamanho').value,
        cor: document.getElementById('estoque-cor').value.trim(),
        qtd_inicial: parseInt(document.getElementById('estoque-qtd').value) || 0,
        vlr_unit: parseFloat(document.getElementById('estoque-vlr').value) || 0,
        fornecedor_id: document.getElementById('estoque-fornecedor').value || ''
      };
      
      try {
        if (id) {
          await db.collection("estoque").doc(id).update(payload);
          showToast('Item atualizado no almoxarifado!', 'success');
          window.lastSavedId = id;
        } else {
          payload.criado_em = firebase.firestore.FieldValue.serverTimestamp();
          const docRef = await db.collection("estoque").add(payload);
          showToast('Item registrado no almoxarifado! 📦', 'success');
          window.lastSavedId = docRef.id;
        }
        document.getElementById('btn-cancel-estoque').click();
        await loadEstoque();
        setTimeout(() => window.lastSavedId = null, 3000);
      } catch(e) { showToast('Erro ao salvar no almoxarifado.', 'error'); }
      finally { btn.textContent = id ? 'Salvar Alterações' : '+ Registrar no Almoxarifado'; btn.disabled = false; }
    };
  
    window.deleteEstoque = async (id) => {
      const ok = await showConfirm('Excluir do almoxarifado?', 'Tem certeza? Eventos alocados com este item perderão o vínculo de matriz.');
      if (!ok) return;
      try { await db.collection("estoque").doc(id).delete(); showToast('Item excluído.', 'warning'); await loadEstoque(); } catch(e) { showToast('Erro ao excluir.', 'error'); }
    };
  
    window.migrarLegadoEstoque = async () => {
      const ok = await showConfirm('Integração de Estoque Global', 'Isso transformará todos os Brindes e Uniformes existentes em registros matrizes do Almoxarifado Central, calculando o que já foi usado como saída. É recomendado rodar apenas 1 vez. Continuar?');
      if (!ok) return;
      try {
        const batch = db.batch();
        const stIds = {}; 
  
        // 1. Unifica Brindes
        for(let b of BRINDES) {
          if(b.estoque_id) continue;
          let pKey = `brinde_${(b.titulo||'').toLowerCase()}_${b.nivel||''}`;
          if(!stIds[pKey]) {
            const newDoc = db.collection("estoque").doc();
            stIds[pKey] = newDoc.id;
            batch.set(newDoc, { tipo: 'brinde', nome: b.titulo||'Brinde Sem Nome', nivel: b.nivel, qtd_inicial: parseInt(b.qtd||0), vlr_unit: parseFloat(b.vlr_unit||0), fornecedor_id: b.fornecedor_id||'', criado_em: firebase.firestore.FieldValue.serverTimestamp() });
          } else {
            const matrixRef = db.collection("estoque").doc(stIds[pKey]);
            batch.update(matrixRef, { qtd_inicial: firebase.firestore.FieldValue.increment(parseInt(b.qtd||0)) });
          }
          batch.update(db.collection("brindes").doc(b.id), { estoque_id: stIds[pKey] });
        }
  
        // 2. Unifica Uniformes
        for(let u of UNIFORMES) {
          if(u.estoque_id) continue;
          let pKey = `unif_${(u.cor||'').toLowerCase()}_${u.tamanho||''}`;
          if(!stIds[pKey]) {
            const newDoc = db.collection("estoque").doc();
            stIds[pKey] = newDoc.id;
            batch.set(newDoc, { tipo: 'uniforme', nome: u.cor ? `Camisa ${u.cor}` : 'Uniforme', cor: u.cor||'', tamanho: u.tamanho||'Único', qtd_inicial: parseInt(u.qtd||0), vlr_unit: parseFloat(u.vlr_unit||0), fornecedor_id: u.fornecedor_id||'', criado_em: firebase.firestore.FieldValue.serverTimestamp() });
          } else {
            const matrixRef = db.collection("estoque").doc(stIds[pKey]);
            batch.update(matrixRef, { qtd_inicial: firebase.firestore.FieldValue.increment(parseInt(u.qtd||0)) });
          }
          batch.update(db.collection("uniformes").doc(u.id), { estoque_id: stIds[pKey] });
        }
  
        await batch.commit();
        showToast('Migração Realizada! Base populada.', 'success', 5000);
        await loadGestaoModules();
      } catch(e) { console.error(e); showToast('Falha ao migrar.', 'error'); }
    };
  
    // ════════════ FORNECEDORES ════════════
    async function loadFornecedores() {
      try {
        const snap = await db.collection("fornecedores").orderBy("nome").get();
        FORNECEDORES_LIST = [];
        snap.forEach(doc => FORNECEDORES_LIST.push({ id: doc.id, ...doc.data() }));
      } catch(e) { FORNECEDORES_LIST = []; }
      renderFornecedores();
      populateGestaoSelects();
    }
  
    function renderFornecedores() {
      const tbody = document.getElementById('forn-body');
      if (!tbody) return;
      
      const busca = (document.getElementById('filtro-forn-busca')?.value || '').toLowerCase();
      let list = FORNECEDORES_LIST;
      if (busca) list = list.filter(f => (f.nome||'').toLowerCase().includes(busca) || (f.email||'').toLowerCase().includes(busca) || (f.telefone||'').toLowerCase().includes(busca));
  
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--muted);">Nenhum fornecedor encontrado.</td></tr>';
        return;
      }
      
      tbody.innerHTML = list.map(f => {
        const bCount = BRINDES.filter(b => b.fornecedor_id === f.id).length;
        const uCount = UNIFORMES.filter(u => u.fornecedor_id === f.id).length;
        const total = bCount + uCount;
        const isNew = window.lastSavedId === f.id ? 'flash-green' : '';
        return `<tr class="${isNew}">
          <td><strong>${highlight(f.nome, document.getElementById('filtro-forn-busca')?.value)}</strong></td>
          <td>${f.email ? `<a href="mailto:${escapeHtml(f.email)}" style="color:var(--accent);font-weight:600;">${escapeHtml(f.email)}</a>` : '<span style="color:var(--muted)">—</span>'}</td>
          <td>${f.telefone ? `<a href="tel:${escapeHtml(f.telefone)}" style="color:var(--teal);font-weight:600;">${escapeHtml(f.telefone)}</a>` : '<span style="color:var(--muted)">—</span>'}</td>
          <td>${total > 0 ? `<span style="font-weight:700">${total} item${total!==1?'s':''}</span> <span style="color:var(--muted);font-size:0.75rem;">(${bCount} brinde${bCount!==1?'s':''}, ${uCount} unif.)</span>` : '<span style="color:var(--muted)">0 itens</span>'}</td>
          <td style="text-align:right;white-space:nowrap;">
            <button class="tbl-action edit" onclick="window.editForn('${f.id}')" title="Editar">✏️</button>
            <button class="tbl-action del" onclick="window.deleteForn('${f.id}')" title="Excluir">🗑️</button>
          </td>
        </tr>`;
      }).join('');
    }
  
    window.editForn = (id) => {
      const f = FORNECEDORES_LIST.find(x => x.id === id); if(!f) return;
      document.getElementById('forn-id').value = id;
      document.getElementById('forn-nome').value = f.nome || '';
      document.getElementById('forn-email').value = f.email || '';
      document.getElementById('forn-tel').value = f.telefone || '';
      document.getElementById('btn-save-forn').textContent = 'Salvar Alterações';
      document.getElementById('btn-cancel-forn').style.display = 'inline-block';
      document.getElementById('forn-add-form').scrollIntoView({behavior:'smooth', block:'nearest'});
    };
  
    document.getElementById('btn-cancel-forn').onclick = () => {
      document.getElementById('forn-id').value = '';
      ['forn-nome','forn-email','forn-tel'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('btn-save-forn').textContent = '+ Adicionar';
      document.getElementById('btn-cancel-forn').style.display = 'none';
    };
  
    document.getElementById('btn-save-forn').onclick = async () => {
      const id = document.getElementById('forn-id').value;
      const nome = document.getElementById('forn-nome').value.trim();
      const email = document.getElementById('forn-email').value.trim();
      const telefone = document.getElementById('forn-tel').value.trim();
      if (!nome) { showToast('Nome do fornecedor é obrigatório.', 'warning'); return; }
      const btn = document.getElementById('btn-save-forn');
      btn.textContent = 'Salvando...'; btn.disabled = true;
      try {
        if (id) {
          await db.collection("fornecedores").doc(id).update({ nome, email, telefone });
          showToast('Fornecedor atualizado!', 'success');
          window.lastSavedId = id;
        } else {
          const docRef = await db.collection("fornecedores").add({ nome, email, telefone, criado_em: firebase.firestore.FieldValue.serverTimestamp() });
          showToast('Fornecedor cadastrado! 🏢', 'success');
          window.lastSavedId = docRef.id;
        }
        document.getElementById('btn-cancel-forn').click();
        await loadFornecedores();
        setTimeout(() => window.lastSavedId = null, 3000);
      } catch(e) { showToast('Erro ao salvar fornecedor.', 'error'); }
      finally { btn.textContent = id ? 'Salvar Alterações' : '+ Adicionar'; btn.disabled = false; }
    };
  
    window.deleteForn = async (id) => {
      const linked = BRINDES.filter(b=>b.fornecedor_id===id).length + UNIFORMES.filter(u=>u.fornecedor_id===id).length;
      const msg = linked > 0 ? `Este fornecedor tem ${linked} item(s) vinculado(s). Deseja mesmo excluir?` : 'Excluir este fornecedor permanentemente?';
      const ok = await showConfirm('Excluir fornecedor?', msg);
      if (!ok) return;
      try { await db.collection("fornecedores").doc(id).delete(); showToast('Fornecedor excluído.', 'warning'); await loadFornecedores(); } catch(e) { showToast('Erro ao excluir.', 'error'); }
    };
  
    // ════════════ BRINDES ════════════
    async function loadBrindes() {
      try {
        const snap = await db.collection("brindes").orderBy("titulo").get();
        BRINDES = [];
        snap.forEach(doc => BRINDES.push({ id: doc.id, ...doc.data() }));
      } catch(e) { BRINDES = []; }
      renderBrindes();
      renderBrindesSummary();
    }
  
    window.setBrindeView = function(view) {
      window.currentBrindeView = view;
      document.getElementById('btn-brinde-view-table').classList.toggle('active', view==='table');
      document.getElementById('btn-brinde-view-kanban').classList.toggle('active', view==='kanban');
      
      if (view === 'table') {
        document.getElementById('brindes-table-wrap').classList.remove('hide');
        document.getElementById('brindes-kanban').classList.add('hide');
      } else {
        document.getElementById('brindes-table-wrap').classList.add('hide');
        document.getElementById('brindes-kanban').classList.remove('hide');
      }
      renderBrindes();
    };
  
    function renderBrindesKanban(list, statusCores) {
      const kBoard = document.getElementById('brindes-kanban');
      if (!kBoard) return;
      const colunas = ['Cotação', 'Aprovado', 'Pedido', 'Recebido'];
      
      kBoard.innerHTML = colunas.map(col => {
        const items = list.filter(b => (b.status || 'Cotação') === col);
        const sc = statusCores[col] || 'var(--muted)';
        const cardsHtml = items.map(b => {
          const anexoHtml = b.anexo_url ? `<a href="${b.anexo_url}" target="_blank" class="kanban-anexo-link" onclick="event.stopPropagation()">📎</a>` : '';
          return `
            <div class="kanban-card" onclick="window.editBrinde('${b.id}')">
              <div class="kanban-card-title">
                <span>${escapeHtml(b.titulo||'')}</span>
                ${anexoHtml}
              </div>
              <div class="kanban-card-desc">${escapeHtml(b.descricao||'—')}</div>
              <div class="kanban-card-meta">
                 <span class="kanban-card-badge">${b.qtd||0} un.</span>
                 ${b.evento_id ? `<span class="kanban-card-badge" style="color:var(--accent);">${escapeHtml(eventoNome(b.evento_id))}</span>` : ''}
              </div>
            </div>
          `;
        }).join('');
        
        return `
          <div class="kanban-column">
            <div class="kanban-column-header">
              <div style="display:flex; align-items:center; gap:8px;">
                 <span style="width:8px;height:8px;border-radius:50%;background:${sc};"></span>
                 ${col}
              </div>
              <span class="kanban-column-count">${items.length}</span>
            </div>
            <div class="kanban-column-body">
              ${cardsHtml}
            </div>
          </div>
        `;
      }).join('');
    }
  
    function renderBrindes() {
      const tbody = document.getElementById('brindes-body');
      if (!tbody) return;
      
      const busca = (document.getElementById('filtro-brinde-busca')?.value || '').toLowerCase();
      const nivel = document.getElementById('filtro-brinde-nivel')?.value || '';
      const evento= document.getElementById('filtro-brinde-evento')?.value || '';
      
      let list = BRINDES;
      if (busca) list = list.filter(b => (b.titulo||'').toLowerCase().includes(busca) || (b.descricao||'').toLowerCase().includes(busca));
      if (nivel) list = list.filter(b => b.nivel === nivel);
      if (evento) list = list.filter(b => b.evento_id === evento);
  
      const statusCores = { 'Cotação':'var(--muted)', 'Aprovado':'var(--teal)', 'Pedido':'var(--amber)', 'Recebido':'var(--green)' };
  
      if (window.currentBrindeView === 'kanban') {
        renderBrindesKanban(list, statusCores);
        return;
      }
  
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--muted);">Nenhum brinde encontrado.</td></tr>';
        return;
      }
      
      tbody.innerHTML = list.map(b => {
        const qtd  = parseInt(b.qtd) || 0;
        const vlr  = parseFloat(b.vlr_unit) || 0;
        const total = qtd * vlr;
        const totalPill = total > 0
          ? `<span class="valor-total-pill">${fmtBRL(total)}</span>`
          : `<span class="valor-total-pill zero">—</span>`;
        const isNew = window.lastSavedId === b.id ? 'flash-green' : '';
        const sc = statusCores[b.status] || 'var(--muted)';
        const statusHtml = `<span style="font-size:0.7rem;font-weight:700;border:1px solid ${sc};color:${sc};padding:2px 6px;border-radius:12px;white-space:nowrap;">${b.status||'Cotação'}</span>`;
        const anexoIco = b.anexo_url ? `<a href="${b.anexo_url}" target="_blank" title="Ver Anexo" style="margin-left:8px; text-decoration:none;" onclick="event.stopPropagation()">📎</a>` : '';
  
        return `<tr class="${isNew}">
          <td><strong>${highlight(b.titulo||'', busca)}</strong>${anexoIco}</td>
          <td style="color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(b.descricao||'')}">${highlight(b.descricao||'—', busca)}</td>
          <td>${nivelBadge(b.nivel)}</td>
          <td>${statusHtml}</td>
          <td style="font-weight:700">${qtd > 0 ? qtd : '—'}</td>
          <td style="font-weight:600">${vlr > 0 ? fmtBRL(vlr) : '—'}</td>
          <td>${totalPill}</td>
          <td style="font-size:0.78rem">${fornNome(b.fornecedor_id)}</td>
          <td style="font-size:0.78rem;color:var(--accent);font-weight:600">${b.evento_id ? escapeHtml(eventoNome(b.evento_id)) : '<span style="color:var(--muted)">—</span>'}</td>
          <td style="text-align:right;white-space:nowrap;">
            <button class="tbl-action edit" onclick="window.editBrinde('${b.id}')" title="Editar"><i data-lucide="edit-2"></i></button>
            <button class="tbl-action del" onclick="window.deleteBrinde('${b.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`;
      }).join('');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  
    function renderBrindesSummary() {
      const el = document.getElementById('brindes-summary');
      if (!el) return;
      const total  = BRINDES.reduce((s,b) => s + (parseFloat(b.vlr_unit)||0) * (parseInt(b.qtd)||0), 0);
      const qtdTot = BRINDES.reduce((s,b) => s + (parseInt(b.qtd)||0), 0);
      const vip    = BRINDES.filter(b=>b.nivel==='VIP').length;
      el.innerHTML = `
        <div class="gestao-summary-card"><div class="gestao-summary-label">Total de Itens</div><div class="gestao-summary-value">${BRINDES.length}</div></div>
        <div class="gestao-summary-card"><div class="gestao-summary-label">Quantidade Total</div><div class="gestao-summary-value">${qtdTot.toLocaleString('pt-BR')}</div></div>
        <div class="gestao-summary-card"><div class="gestao-summary-label">Custo Total</div><div class="gestao-summary-value" style="color:var(--green)">${fmtBRL(total)}</div></div>
        <div class="gestao-summary-card"><div class="gestao-summary-label">Itens VIP</div><div class="gestao-summary-value" style="color:var(--purple)">${vip}</div></div>`;
    }
  
    window.autofillBrinde = function() {
      const eid = document.getElementById('brinde-estoque-id').value;
      const e = ESTOQUE.find(x => x.id === eid);
      const lbl = document.getElementById('lbl-saldo-brinde');
      if (!e) {
        if (!document.getElementById('brinde-id').value) {
          document.getElementById('brinde-titulo').value = '';
          document.getElementById('brinde-nivel').value = 'Massa';
          document.getElementById('brinde-vlr').value = '';
        }
        if(lbl) lbl.innerHTML = 'Saldo: —';
        return;
      }
      const isNew = !document.getElementById('brinde-id').value;
      if (isNew) {
        document.getElementById('brinde-titulo').value = e.nome;
        document.getElementById('brinde-nivel').value = e.nivel || 'Massa';
        document.getElementById('brinde-vlr').value = e.vlr_unit || 0;
        if (e.fornecedor_id) document.getElementById('brinde-fornecedor').value = e.fornecedor_id;
      }
      const saldo = (parseInt(e.qtd_inicial)||0) - getEstoqueAlocado(e.id);
      if(lbl) lbl.innerHTML = `Saldo em Estoque: <b style="color:${saldo <= 0 ? 'var(--red)' : 'var(--green)'}">${saldo}</b>`;
    };
  
    window.editBrinde = (id) => {
      const b = BRINDES.find(x => x.id === id); if(!b) return;
      document.getElementById('brinde-id').value = id;
      document.getElementById('brinde-estoque-id').value = b.estoque_id || '';
      document.getElementById('brinde-titulo').value = b.titulo || '';
      document.getElementById('brinde-desc').value = b.descricao || '';
      document.getElementById('brinde-nivel').value = b.nivel || 'Massa';
      document.getElementById('brinde-qtd').value = b.qtd || '';
      document.getElementById('brinde-vlr').value = b.vlr_unit || '';
      document.getElementById('brinde-fornecedor').value = b.fornecedor_id || '';
      document.getElementById('brinde-evento').value = b.evento_id || '';
      if (document.getElementById('brinde-anexo-url')) document.getElementById('brinde-anexo-url').value = b.anexo_url || '';
      if (document.getElementById('brinde-anexo-name')) document.getElementById('brinde-anexo-name').innerHTML = b.anexo_url ? `<a href="${b.anexo_url}" target="_blank">Ver anexo atual</a>` : '';
      document.getElementById('btn-save-brinde').textContent = 'Salvar Alterações';
      document.getElementById('btn-cancel-brinde').style.display = 'inline-block';
      
      window.autofillBrinde(); // Atualiza saldo visualmente
      document.getElementById('brinde-qtd').dispatchEvent(new Event('input'));
      const form = document.getElementById('brinde-add-form');
      if(form) form.scrollIntoView({behavior:'smooth', block:'nearest'});
    };
  
    document.getElementById('btn-cancel-brinde').onclick = () => {
      document.getElementById('brinde-id').value = '';
      ['brinde-estoque-id','brinde-titulo','brinde-desc','brinde-qtd','brinde-vlr','brinde-fornecedor','brinde-evento'].forEach(id => {let el=document.getElementById(id); if(el) el.value = '';});
      document.getElementById('brinde-nivel').value = 'Massa';
      if (document.getElementById('brinde-anexo')) document.getElementById('brinde-anexo').value = '';
      if (document.getElementById('brinde-anexo-url')) document.getElementById('brinde-anexo-url').value = '';
      if (document.getElementById('brinde-anexo-name')) document.getElementById('brinde-anexo-name').innerHTML = '';
      document.getElementById('btn-save-brinde').textContent = '+ Adicionar';
      document.getElementById('btn-cancel-brinde').style.display = 'none';
      const lbl = document.getElementById('lbl-saldo-brinde');
      if(lbl) lbl.innerHTML = 'Saldo: —';
      document.getElementById('brinde-qtd').dispatchEvent(new Event('input'));
    };
  
    document.getElementById('btn-save-brinde').onclick = async () => {
      const id = document.getElementById('brinde-id').value;
      const estId = document.getElementById('brinde-estoque-id').value;
      if (!estId) { showToast('Selecione um Brinde mestre do Almoxarifado.', 'warning'); return; }
      
      const titulo = document.getElementById('brinde-titulo').value.trim();
      const btn = document.getElementById('btn-save-brinde');
      btn.textContent = 'Salvando...'; btn.disabled = true;
      const qtd    = parseInt(document.getElementById('brinde-qtd').value) || 0;
      const vlr    = parseFloat(document.getElementById('brinde-vlr').value) || 0;
      
      let statusEl = document.getElementById('brinde-status');
      const statusVal = statusEl ? statusEl.value : 'Cotação';
  
      const payload = {
          estoque_id:    estId,
          titulo,
          descricao:     document.getElementById('brinde-desc').value.trim(),
          nivel:         document.getElementById('brinde-nivel').value,
          status:        statusVal,
          qtd,
          vlr_unit:      vlr,
          fornecedor_id: document.getElementById('brinde-fornecedor').value || '',
          evento_id:     document.getElementById('brinde-evento').value || ''
      };
  
      const fileInput = document.getElementById('brinde-anexo');
      if (fileInput && fileInput.files[0]) {
        const url = await window.uploadAnexoHelper(fileInput.files[0], 'brindes');
        if (url) payload.anexo_url = url;
      } else {
        const existingUrl = document.getElementById('brinde-anexo-url')?.value;
        if (existingUrl) payload.anexo_url = existingUrl;
      }
      
      try {
        if (id) {
          await db.collection("brindes").doc(id).update(payload);
          showToast('Brinde atualizado!', 'success');
          window.lastSavedId = id;
        } else {
          payload.criado_em = firebase.firestore.FieldValue.serverTimestamp();
          const docRef = await db.collection("brindes").add(payload);
          showToast('Brinde alocado com sucesso! 🎁', 'success');
          window.lastSavedId = docRef.id;
        }
        document.getElementById('btn-cancel-brinde').click();
        await loadBrindes();
        await loadEstoque(); // refresh saldos globais
        setTimeout(() => window.lastSavedId = null, 3000);
      } catch(e) { showToast('Erro ao salvar brinde.', 'error'); }
      finally { btn.textContent = id ? 'Salvar Alterações' : '+ Adicionar'; btn.disabled = false; }
    };
  
    window.deleteBrinde = async (id) => {
      const ok = await showConfirm('Excluir brinde?', 'Remover este brinde permanentemente?');
      if (!ok) return;
      try { await db.collection("brindes").doc(id).delete(); showToast('Brinde excluído.', 'warning'); await loadBrindes(); } catch(e) { showToast('Erro ao excluir.', 'error'); }
    };
  
    // ════════════ UNIFORMES ════════════
    async function loadUniformes() {
      try {
        const snap = await db.collection("uniformes").orderBy("data_pedido","desc").get();
        UNIFORMES = [];
        snap.forEach(doc => UNIFORMES.push({ id: doc.id, ...doc.data() }));
      } catch(e) {
        // fallback se não tiver índice: busca sem ordenação
        try {
          const snap2 = await db.collection("uniformes").get();
          UNIFORMES = [];
          snap2.forEach(doc => UNIFORMES.push({ id: doc.id, ...doc.data() }));
        } catch(e2) { UNIFORMES = []; }
      }
      renderUniformes();
      renderUniformesSummary();
    }
  
    window.setUnifView = function(view) {
      window.currentUnifView = view;
      document.getElementById('btn-unif-view-table').classList.toggle('active', view==='table');
      document.getElementById('btn-unif-view-kanban').classList.toggle('active', view==='kanban');
      
      if (view === 'table') {
        document.getElementById('unif-table-wrap').classList.remove('hide');
        document.getElementById('unif-kanban').classList.add('hide');
      } else {
        document.getElementById('unif-table-wrap').classList.add('hide');
        document.getElementById('unif-kanban').classList.remove('hide');
      }
      renderUniformes();
    };
  
    function renderUniformesKanban(list) {
      const kBoard = document.getElementById('unif-kanban');
      if (!kBoard) return;
      const colunas = ['Pedido', 'Em Produção', 'Entregue', 'Cancelado'];
      const scMapping = { 'Pedido': 'var(--amber)', 'Em Produção': 'var(--purple)', 'Entregue': 'var(--green)', 'Cancelado': 'var(--red)' };
      
      kBoard.innerHTML = colunas.map(col => {
        const items = list.filter(u => (u.status || 'Pedido') === col);
        const sc = scMapping[col] || 'var(--muted)';
        const cardsHtml = items.map(u => {
          const anexoHtml = u.anexo_url ? `<a href="${u.anexo_url}" target="_blank" class="kanban-anexo-link" onclick="event.stopPropagation()">📎 Anexo</a>` : '';
          const tamPill = u.tamanho && u.tamanho !== 'Único' ? `<span style="font-size:0.7rem;padding:2px 4px;background:var(--accent);color:#fff;border-radius:4px;margin-right:4px;">${u.tamanho}</span>` : '';
          return `
            <div class="kanban-card" onclick="window.editUnif('${u.id}')">
              <div class="kanban-card-title">
                <span>${tamPill}${escapeHtml(u.cor||'')}</span>
                ${anexoHtml}
              </div>
              <div class="kanban-card-desc">${escapeHtml(u.obs||'—')}</div>
              <div class="kanban-card-meta">
                 <span class="kanban-card-badge">${u.qtd||0} un.</span>
                 ${u.evento_id ? `<span class="kanban-card-badge" style="color:var(--accent);">${escapeHtml(eventoNome(u.evento_id))}</span>` : ''}
              </div>
            </div>
          `;
        }).join('');
        
        return `
          <div class="kanban-column">
            <div class="kanban-column-header">
              <div style="display:flex; align-items:center; gap:8px;">
                 <span style="width:8px;height:8px;border-radius:50%;background:${sc};"></span>
                 ${col}
              </div>
              <span class="kanban-column-count">${items.length}</span>
            </div>
            <div class="kanban-column-body">
              ${cardsHtml}
            </div>
          </div>
        `;
      }).join('');
    }
  
    function renderUniformes() {
      const tbody = document.getElementById('unif-body');
      if (!tbody) return;
      
      const busca = (document.getElementById('filtro-unif-busca')?.value || '').toLowerCase();
      const status = document.getElementById('filtro-unif-status')?.value || '';
      const evento= document.getElementById('filtro-unif-evento')?.value || '';
      
      let list = UNIFORMES;
      if (busca) list = list.filter(u => (u.cor||'').toLowerCase().includes(busca) || (u.obs||'').toLowerCase().includes(busca));
      if (status) list = list.filter(u => u.status === status);
      if (evento) list = list.filter(u => u.evento_id === evento);
  
      if (window.currentUnifView === 'kanban') {
        renderUniformesKanban(list);
        return;
      }
  
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:32px;color:var(--muted);">Nenhum uniforme encontrado.</td></tr>';
        return;
      }
      
      tbody.innerHTML = list.map(u => {
        const qtd   = parseInt(u.qtd) || 0;
        const vlr   = parseFloat(u.vlr_unit) || 0;
        const total = qtd * vlr;
        const totalPill = total > 0
          ? `<span class="valor-total-pill">${fmtBRL(total)}</span>`
          : `<span class="valor-total-pill zero">—</span>`;
        const dataFmt = u.data_pedido ? new Date(u.data_pedido+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}) : '—';
        const prevFmt = u.data_prevista ? new Date(u.data_prevista+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}) : '—';
        const isNew = window.lastSavedId === u.id ? 'flash-green' : '';
        const anexoIco = u.anexo_url ? `<a href="${u.anexo_url}" target="_blank" title="Ver Anexo" style="margin-left:8px; text-decoration:none;" onclick="event.stopPropagation()">📎</a>` : '';
  
        return `<tr class="${isNew}">
          <td style="font-weight:700">${qtd > 0 ? qtd : '—'}</td>
          <td>${u.cor ? `<span style="display:inline-flex;align-items:center;gap:6px;font-weight:600">${u.tamanho && u.tamanho !== 'Único' ? `<span style="font-size:0.7rem;padding:2px 4px;background:var(--accent);color:#fff;border-radius:4px;">${u.tamanho}</span>` : ''} ${highlight(u.cor, busca)}</span>` : '<span style="color:var(--muted)">—</span>'}${anexoIco}</td>
          <td style="font-weight:600">${vlr > 0 ? fmtBRL(vlr) : '—'}</td>
          <td>${totalPill}</td>
          <td style="font-size:0.75rem;color:var(--muted)">${dataFmt}</td>
          <td style="font-size:0.75rem;font-weight:600;color:var(--text)">${prevFmt}</td>
          <td>${unifStatusBadge(u.status)}</td>
          <td style="font-size:0.78rem">${fornNome(u.fornecedor_id)}</td>
          <td style="font-size:0.78rem;color:var(--accent);font-weight:600">${u.evento_id ? escapeHtml(eventoNome(u.evento_id)) : '<span style="color:var(--muted)">—</span>'}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:0.78rem;" title="${escapeHtml(u.obs||'')}">${highlight(u.obs||'—', busca)}</td>
          <td style="text-align:right;white-space:nowrap;">
            <button class="tbl-action edit" onclick="window.editUnif('${u.id}')" title="Editar"><i data-lucide="edit-2"></i></button>
            <button class="tbl-action del" onclick="window.deleteUnif('${u.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>
          </td>
        </tr>`;
      }).join('');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  
    function renderUniformesSummary() {
      const el = document.getElementById('uniformes-summary');
      if (!el) return;
      const total    = UNIFORMES.reduce((s,u) => s + (parseFloat(u.vlr_unit)||0) * (parseInt(u.qtd)||0), 0);
      const qtdTot   = UNIFORMES.reduce((s,u) => s + (parseInt(u.qtd)||0), 0);
      const entregue = UNIFORMES.filter(u=>u.status==='Entregue').length;
      el.innerHTML = `
        <div class="gestao-summary-card"><div class="gestao-summary-label">Pedidos</div><div class="gestao-summary-value">${UNIFORMES.length}</div></div>
        <div class="gestao-summary-card"><div class="gestao-summary-label">Quantidade Total</div><div class="gestao-summary-value">${qtdTot.toLocaleString('pt-BR')}</div></div>
        <div class="gestao-summary-card"><div class="gestao-summary-label">Custo Total</div><div class="gestao-summary-value" style="color:var(--green)">${fmtBRL(total)}</div></div>
        <div class="gestao-summary-card"><div class="gestao-summary-label">Entregues</div><div class="gestao-summary-value" style="color:var(--teal)">${entregue}</div></div>`;
    }
  
    window.autofillUnif = function() {
      const eid = document.getElementById('unif-estoque-id').value;
      const e = ESTOQUE.find(x => x.id === eid);
      const lbl = document.getElementById('lbl-saldo-unif');
      if (!e) {
        if (!document.getElementById('unif-id').value) {
          document.getElementById('unif-cor').value = '';
          document.getElementById('unif-tamanho').value = 'Único';
          document.getElementById('unif-vlr').value = '';
        }
        if(lbl) lbl.innerHTML = 'Saldo: —';
        return;
      }
      const isNew = !document.getElementById('unif-id').value;
      if (isNew) {
        document.getElementById('unif-cor').value = e.cor || e.nome;
        document.getElementById('unif-tamanho').value = e.tamanho || 'Único';
        document.getElementById('unif-vlr').value = e.vlr_unit || 0;
        if (e.fornecedor_id) document.getElementById('unif-fornecedor').value = e.fornecedor_id;
      }
      const saldo = (parseInt(e.qtd_inicial)||0) - getEstoqueAlocado(e.id);
      if(lbl) lbl.innerHTML = `Saldo em Estoque: <b style="color:${saldo <= 0 ? 'var(--red)' : 'var(--green)'}">${saldo}</b>`;
    };
  
    window.editUnif = (id) => {
      const u = UNIFORMES.find(x => x.id === id); if(!u) return;
      document.getElementById('unif-id').value = id;
      document.getElementById('unif-estoque-id').value = u.estoque_id || '';
      document.getElementById('unif-qtd').value = u.qtd || '';
      document.getElementById('unif-tamanho').value = u.tamanho || 'Único';
      document.getElementById('unif-cor').value = u.cor || '';
      document.getElementById('unif-vlr').value = u.vlr_unit || '';
      document.getElementById('unif-data').value = u.data_pedido || '';
      document.getElementById('unif-data-prevista').value = u.data_prevista || '';
      document.getElementById('unif-status').value = u.status || 'Pedido';
      document.getElementById('unif-fornecedor').value = u.fornecedor_id || '';
      document.getElementById('unif-evento').value = u.evento_id || '';
      document.getElementById('unif-obs').value = u.obs || '';
      // Restaurar anexo existente
      if (document.getElementById('unif-anexo-url')) document.getElementById('unif-anexo-url').value = u.anexo_url || '';
      if (document.getElementById('unif-anexo-name')) document.getElementById('unif-anexo-name').innerHTML = u.anexo_url ? `<a href="${u.anexo_url}" target="_blank">Ver anexo atual</a>` : '';
      document.getElementById('btn-save-unif').textContent = 'Salvar Alterações';
      document.getElementById('btn-cancel-unif').style.display = 'inline-block';
      
      // Apenas atualiza saldo — não sobrescreve campos já preenchidos
      const lbl = document.getElementById('lbl-saldo-unif');
      const estItem = ESTOQUE.find(x => x.id === u.estoque_id);
      if (estItem && lbl) {
        const saldo = (parseInt(estItem.qtd_inicial)||0) - getEstoqueAlocado(estItem.id);
        lbl.innerHTML = `Saldo em Estoque: <b style="color:${saldo <= 0 ? 'var(--red)' : 'var(--green)'}">${saldo}</b>`;
      }
      document.getElementById('unif-qtd').dispatchEvent(new Event('input'));
      const form = document.getElementById('unif-add-form');
      if(form) form.scrollIntoView({behavior:'smooth', block:'nearest'});
    };
  
    document.getElementById('btn-cancel-unif').onclick = () => {
      document.getElementById('unif-id').value = '';
      ['unif-estoque-id','unif-qtd','unif-cor','unif-vlr','unif-data','unif-data-prevista','unif-obs','unif-fornecedor','unif-evento'].forEach(id => {let el=document.getElementById(id); if(el) el.value = '';});
      document.getElementById('unif-tamanho').value = 'Único';
      document.getElementById('unif-status').value = 'Pedido';
      if (document.getElementById('unif-anexo')) document.getElementById('unif-anexo').value = '';
      if (document.getElementById('unif-anexo-url')) document.getElementById('unif-anexo-url').value = '';
      if (document.getElementById('unif-anexo-name')) document.getElementById('unif-anexo-name').innerHTML = '';
      document.getElementById('btn-save-unif').textContent = '+ Adicionar';
      document.getElementById('btn-cancel-unif').style.display = 'none';
      const lbl = document.getElementById('lbl-saldo-unif');
      if(lbl) lbl.innerHTML = 'Saldo: —';
      document.getElementById('unif-qtd').dispatchEvent(new Event('input'));
    };
  
    document.getElementById('btn-save-unif').onclick = async () => {
      const id = document.getElementById('unif-id').value;
      const estId = document.getElementById('unif-estoque-id').value;
      if (!estId) { showToast('Selecione um Uniforme mestre do Almoxarifado.', 'warning'); return; }
      
      const qtd = parseInt(document.getElementById('unif-qtd').value) || 0;
      if (!qtd) { showToast('Informe a quantidade de saídas (alocações).', 'warning'); return; }
      const btn = document.getElementById('btn-save-unif');
      btn.textContent = 'Salvando...'; btn.disabled = true;
      const vlr = parseFloat(document.getElementById('unif-vlr').value) || 0;
      
      const payload = {
          estoque_id:    estId,
          qtd,
          tamanho:       document.getElementById('unif-tamanho').value,
          cor:           document.getElementById('unif-cor').value.trim(),
          vlr_unit:      vlr,
          data_pedido:   document.getElementById('unif-data').value || '',
          data_prevista: document.getElementById('unif-data-prevista').value || '',
          status:        document.getElementById('unif-status').value,
          fornecedor_id: document.getElementById('unif-fornecedor').value || '',
          evento_id:     document.getElementById('unif-evento').value || '',
          obs:           document.getElementById('unif-obs').value.trim()
      };
      
      // Preservar anexo existente se não selecionar novo arquivo
      const fileInputUnif = document.getElementById('unif-anexo');
      if (fileInputUnif && fileInputUnif.files[0]) {
        const url = await window.uploadAnexoHelper(fileInputUnif.files[0], 'uniformes');
        if (url) payload.anexo_url = url;
      } else {
        const existingUrl = document.getElementById('unif-anexo-url')?.value;
        if (existingUrl) payload.anexo_url = existingUrl;
      }
  
      try {
        if (id) {
          await db.collection("uniformes").doc(id).update(payload);
          showToast('Uniforme atualizado!', 'success');
          window.lastSavedId = id;
        } else {
          payload.criado_em = firebase.firestore.FieldValue.serverTimestamp();
          const docRef = await db.collection("uniformes").add(payload);
          showToast('Uniforme cadastrado! 👕', 'success');
          window.lastSavedId = docRef.id;
        }
        document.getElementById('btn-cancel-unif').click();
        await loadUniformes();
        setTimeout(() => window.lastSavedId = null, 3000);
      } catch(e) { showToast('Erro ao salvar uniforme.', 'error'); }
      finally { btn.textContent = id ? 'Salvar Alterações' : '+ Adicionar'; btn.disabled = false; }
    };
  
    window.deleteUnif = async (id) => {
      const ok = await showConfirm('Excluir uniforme?', 'Remover este registro de uniforme permanentemente?');
      if (!ok) return;
      try { await db.collection("uniformes").doc(id).delete(); showToast('Uniforme excluído.', 'warning'); await loadUniformes(); } catch(e) { showToast('Erro ao excluir.', 'error'); }
    };
  
    // ── Cálculo automático de valor total ao digitar ──
    function bindValorTotal(qtdId, vlrId, displayId) {
      const calcAndShow = () => {
        const qtd = parseInt(document.getElementById(qtdId)?.value) || 0;
        const vlr = parseFloat(document.getElementById(vlrId)?.value) || 0;
        const el  = document.getElementById(displayId);
        if (el) el.textContent = qtd > 0 && vlr > 0 ? `Total: ${fmtBRL(qtd*vlr)}` : '';
      };
      document.getElementById(qtdId)?.addEventListener('input', calcAndShow);
      document.getElementById(vlrId)?.addEventListener('input', calcAndShow);
    }
    // Criar containers de preview abaixo dos campos
    function injectTotalPreview(afterElId, previewId) {
      const el = document.getElementById(afterElId);
      if (!el) return;
      let prev = document.getElementById(previewId);
      if (!prev) {
        prev = document.createElement('div');
        prev.id = previewId;
        prev.style.cssText = 'font-size:0.75rem;font-weight:700;color:var(--green);margin-top:4px;height:14px;';
        el.closest('.gestao-add-bar')?.appendChild(prev);
      }
    }
    injectTotalPreview('brinde-vlr', 'brinde-total-preview');
    injectTotalPreview('unif-vlr',   'unif-total-preview');
    bindValorTotal('brinde-qtd','brinde-vlr','brinde-total-preview');
    bindValorTotal('unif-qtd','unif-vlr','unif-total-preview');
  
    // ── Brindes no modal de evento (somente admin) ──
    function renderBrindesNoEvento(eventoId) {
      const block = document.getElementById('block-brindes-evento');
      const list  = document.getElementById('brindes-evento-list');
      const count = document.getElementById('brindes-evento-count');
      if (!block || !isAdmin) { if(block) block.style.display='none'; return; }
  
      const itens = BRINDES.filter(b => b.evento_id === eventoId);
      if (!itens.length) {
        block.style.display = 'none';
        return;
      }
      block.style.display = 'block';
      count.textContent = `${itens.length} item${itens.length!==1?'s':''}`;
      list.innerHTML = itens.map(b => {
        const qtd   = parseInt(b.qtd) || 0;
        const vlr   = parseFloat(b.vlr_unit) || 0;
        const total = qtd * vlr;
        return `<div class="brinde-row">
          <div>
            <div class="brinde-name">${escapeHtml(b.titulo||'')} ${nivelBadge(b.nivel)}</div>
            <div class="brinde-detail">${escapeHtml(b.descricao||'')}${b.fornecedor_id ? ' · ' + fornNome(b.fornecedor_id) : ''}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-weight:700;font-size:0.8rem">${qtd > 0 ? qtd + ' un.' : '—'}</div>
            ${total > 0 ? `<div class="valor-total-pill" style="margin-top:4px;">${fmtBRL(total)}</div>` : ''}
          </div>
        </div>`;
      }).join('');
    }
  
    // ── Patch openEventView para incluir brindes ──
    const _openEventViewOrig = window.openEventView;
    window.openEventView = function(id) {
      _openEventViewOrig(id);
      // Renderiza brindes vinculados (apenas se admin e dados já carregados)
      if (isAdmin && BRINDES.length >= 0) renderBrindesNoEvento(id);
      else { const b=document.getElementById('block-brindes-evento'); if(b) b.style.display='none'; }
    };
  
    // ── Carrega tudo ao entrar no painel admin ──
    // Ao invés de capturar a função anterior (que pode não estar definida ainda),
    // ── NAVEGAÇÃO ENTRE SEÇÕES DO ADMIN ──
    window.switchAdminSection = function(section, btn) {
      // Ativar botão nav
      document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      // Ativar seção
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      const target = document.getElementById('asec-' + section);
      if (target) target.classList.add('active');
      // Carregar módulos operacionais na primeira visita
      if (section === 'operacional') {
        loadGestaoModules();
      }
      // Re-renderizar charts quando Dashboard for ativado
      if (section === 'dashboard') {
        setTimeout(() => {
          if (typeof renderDashboardAdmin === 'function') renderDashboardAdmin();
        }, 50);
      }
      if (section === 'configuracoes') {
        if (typeof loadAdminResponsaveis === 'function') loadAdminResponsaveis();
        if (typeof loadPendingUsers === 'function') loadPendingUsers();
      }
    };
  
    // usamos um flag para carregar os módulos da primeira vez que o painel for renderizado.
    let _fornLoaded=false, _estoqueLoaded=false, _brindesLoaded=false, _unifLoaded=false;
  
    let _kitsLoaded = false;
    function loadGestaoModules() {
      if (userRole !== 'admin') return;
      if (!_fornLoaded)     { _fornLoaded=true;     loadFornecedores(); }
      if (!_estoqueLoaded)  { _estoqueLoaded=true;  loadEstoque(); }
      if (!_brindesLoaded)  { _brindesLoaded=true;  loadBrindes(); }
      if (!_unifLoaded)     { _unifLoaded=true;      loadUniformes(); }
      if (!_kitsLoaded)     { _kitsLoaded=true;      loadKits(); }
    }
  
    // Helper de Upload de Arquivos
    window.uploadAnexoHelper = async function(file, folder) {
      if (!file) return null;
      try {
        showToast('Fazendo upload do anexo...', 'info');
        const storageRef = firebase.storage().ref();
        const ext = file.name.split('.').pop();
        const fileName = `${new Date().getTime()}_${Math.random().toString(36).substring(2,8)}.${ext}`;
        const fileRef = storageRef.child(`anexos/${folder}/${fileName}`);
        await fileRef.put(file);
        return await fileRef.getDownloadURL();
      } catch(err) {
        console.error('Erro no upload', err);
        showToast('Erro ao fazer upload do anexo.', 'error');
        return null;
      }
    };
  
    // ── GESTÃO DE KITS DE EQUIPE ──
    async function loadKits() {
      try {
        const snap = await db.collection("kits").get();
        KITS = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderKitsList();
      } catch(e) { console.error('Erro carregando kits', e); }
    }
    
    function renderKitsList() {
      const list = document.getElementById('kits-list');
      if (!list) return;
      if (!KITS.length) {
        list.innerHTML = '<div style="color:var(--muted);text-align:center;padding:20px;">Nenhum kit configurado.</div>';
        return;
      }
      list.innerHTML = KITS.map(k => {
        const q = (k.itens || []).length;
        return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:700;font-size:0.9rem;">${escapeHtml(k.nome)}</div>
            <div style="font-size:0.75rem;color:var(--muted);">${q} item(ns)</div>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn-icon" onclick="window.editKit('${k.id}')" title="Editar">✏️</button>
            <button class="btn-icon" onclick="window.deleteKit('${k.id}')" title="Excluir" style="color:var(--red);">🗑️</button>
          </div>
        </div>`;
      }).join('');
      
      // Atualiza selects de kits
      const kitSel = document.getElementById('deploy-kit-id');
      if(kitSel) {
        kitSel.innerHTML = '<option value="">— Selecione um Kit —</option>' + KITS.map(k => `<option value="${k.id}">${escapeHtml(k.nome)}</option>`).join('');
      }
    }
  
    window.openModalKits = async function() {
      document.getElementById('modal-kits-overlay').classList.add('open');
      if(KITS.length === 0) await loadKits(); // Garante q estao carregados
      else renderKitsList();
    };
    
    window.newKit = function() {
      document.getElementById('kit-id').value = '';
      document.getElementById('kit-nome').value = '';
      document.getElementById('kit-items-container').innerHTML = '';
      document.getElementById('kit-form-panel').style.display = 'block';
      window.addKitItemField(); 
    };
    
    window.editKit = function(id) {
      const k = KITS.find(x => x.id === id); if(!k) return;
      document.getElementById('kit-id').value = id;
      document.getElementById('kit-nome').value = k.nome || '';
      document.getElementById('kit-items-container').innerHTML = '';
      (k.itens || []).forEach(it => {
         window.addKitItemField(it.estoque_id, it.qtd);
      });
      document.getElementById('kit-form-panel').style.display = 'block';
    };
    
    window.addKitItemField = function(estId='', q=1) {
      const cont = document.getElementById('kit-items-container');
      const div = document.createElement('div');
      div.className = 'kit-item-row';
      
      let optHtml = '<option value="">— Selecionar Item do Almoxarifado —</option>';
      ESTOQUE.forEach(e => {
         const tipo = e.tipo==='brinde'?'🎁 Brinde':'👕 Uniforme';
         optHtml += `<option value="${e.id}" ${e.id===estId?'selected':''}>${tipo} - ${escapeHtml(e.nome)}</option>`;
      });
      
      div.innerHTML = `
        <select class="gestao-input kit-item-select" style="flex:1;min-width:120px;">
          ${optHtml}
        </select>
        <input type="number" class="gestao-input kit-item-qtd" value="${q}" min="1" style="width:70px;" placeholder="Qtd">
        <button class="btn-icon" onclick="this.parentElement.remove()" style="color:var(--red);">✕</button>
      `;
      cont.appendChild(div);
    };
    
    window.saveKit = async function() {
      const id = document.getElementById('kit-id').value;
      const nome = document.getElementById('kit-nome').value.trim();
      if(!nome) { showToast('Escreva o nome do Kit!', 'warning'); return; }
      
      const rows = document.querySelectorAll('.kit-item-row');
      const itens = [];
      rows.forEach(r => {
         const estId = r.querySelector('.kit-item-select').value;
         const qtd = parseInt(r.querySelector('.kit-item-qtd').value) || 0;
         if(estId && qtd > 0) itens.push({ estoque_id: estId, qtd });
      });
      if(!itens.length) { showToast('Inclua ao menos um item válido.', 'warning'); return; }
      
      document.getElementById('btn-save-kit').textContent = 'Salvando...'; 
      document.getElementById('btn-save-kit').disabled = true;
      try {
        if(id) {
           await db.collection("kits").doc(id).update({ nome, itens });
           showToast('Kit atualizado.', 'success');
        } else {
           await db.collection("kits").add({ nome, itens, criado_em: firebase.firestore.FieldValue.serverTimestamp() });
           showToast('Kit criado!', 'success');
        }
        document.getElementById('kit-form-panel').style.display = 'none';
        await loadKits();
      } catch(e) {
        showToast('Erro ao salvar o Kit.', 'error');
      } finally {
        document.getElementById('btn-save-kit').textContent = 'Salvar Kit';
        document.getElementById('btn-save-kit').disabled = false;
      }
    };
    
    window.deleteKit = async function(id) {
      if(!await showConfirm('Excluir Kit?', 'Certeza que deseja deletar permanentemente este modelo de Kit?')) return;
      try {
         await db.collection("kits").doc(id).delete();
         showToast('Kit deletado.', 'success');
         await loadKits();
      } catch(e) { showToast('Erro ao excluir o Kit.', 'error'); }
    };
  
    // ── ALOCAÇÃO DE KITS ──
    window.openDeployKitModal = async function() {
       document.getElementById('modal-deploy-kit-overlay').classList.add('open');
       if(KITS.length === 0) await loadKits();
       
       const evSel = document.getElementById('deploy-kit-evento');
       evSel.innerHTML = '<option value="">— Selecione o Evento —</option>' + EVENTS.map(e => `<option value="${e.id}">${escapeHtml(e.evento)}</option>`).join('');
       document.getElementById('deploy-kit-qtd').value = 1;
    };
  
    window.deployKit = async function() {
       const eventoId = document.getElementById('deploy-kit-evento').value;
       const kitId = document.getElementById('deploy-kit-id').value;
       const mult = parseInt(document.getElementById('deploy-kit-qtd').value) || 0;
       
       if(!eventoId || !kitId || mult < 1) { showToast('Preencha Evento, Kit e Qtd!', 'warning'); return; }
       
       const k = KITS.find(x => x.id === kitId);
       if(!k || !k.itens || !k.itens.length) return;
       
       document.getElementById('btn-deploy-kit').textContent = 'Alocando...';
       document.getElementById('btn-deploy-kit').disabled = true;
       
       try {
         for(const it of k.itens) {
           const e = ESTOQUE.find(x => x.id === it.estoque_id);
           if(!e) continue;
           
           const payload = {
             estoque_id: e.id,
             evento_id: eventoId,
             fornecedor_id: e.fornecedor_id || '',
             qtd: it.qtd * mult,
             vlr_unit: e.vlr_unit || 0,
             criado_em: firebase.firestore.FieldValue.serverTimestamp(),
             status: 'Pedido' // Status inicial padrão na alocação
           };
           
           if(e.tipo === 'brinde') {
              payload.titulo = e.nome;
              payload.descricao = 'Alocado via Kit: ' + k.nome;
              payload.nivel = e.nivel || 'Massa';
              payload.status = 'Cotação'; 
              await db.collection("brindes").add(payload);
           } else if(e.tipo === 'uniforme') {
              payload.cor = e.cor || e.nome;
              payload.tamanho = e.tamanho || 'Único';
              payload.obs = 'Alocado via Kit: ' + k.nome;
              payload.data_pedido = new Date().toISOString().split('T')[0];
              await db.collection("uniformes").add(payload);
           }
         }
         showToast(`Kit '${k.nome}' alocado com sucesso!`, 'success');
         document.getElementById('modal-deploy-kit-overlay').classList.remove('open');
         
         // Atualizar as visões globais
         await loadBrindes();
         await loadUniformes();
         await loadEstoque();
       } catch(err) {
         console.error(err);
         showToast('Ocorreu um erro na alocação.', 'error');
       }
       
       document.getElementById('btn-deploy-kit').textContent = 'Alocar no Evento';
       document.getElementById('btn-deploy-kit').disabled = false;
    };
  
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof lucide !== 'undefined') lucide.createIcons();
      // ── KEYBOARD SHORTCUTS (UX PRO) ──
      document.addEventListener('keydown', (e) => {
        // ESC - Fechar modais
        if (e.key === 'Escape') {
          const cModal = document.getElementById('confirm-modal');
          if (cModal && cModal.classList.contains('open')) {
            if (typeof window.closeConfirm === 'function') window.closeConfirm(false);
          } else {
            document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
          }
        }
        // CTRL+S - Salvar Formulário Admin (se estiver aberto e visível)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          const modalOpen = document.getElementById('modal-overlay').classList.contains('open');
          const isEditMode = !document.getElementById('mode-edit').classList.contains('hide');
          if (modalOpen && isEditMode) {
            e.preventDefault();
            window.saveAdminForm(); 
          }
        }
      });
    });
  </script>
  </body>
  </html>
