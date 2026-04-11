/* ============================================================
   PS CAFE MANAGER — app.js  (Backend Connected)
   ============================================================ */

// ==================== API ENDPOINTS ====================
const API_SESSIONS = 'sessions.php';
const API_AUTH     = 'auth.php';
const API_SETTINGS = 'settings.php';
const API_EXPENSES = 'expenses.php';

// ==================== STATE ====================
let cfg = { rate: 20, drink: 15, chips: 10, choc: 10 };

const devState = Array.from({ length: 8 }, (_, i) => ({
  id:        i + 1,
  active:    false,
  startTime: null,
  sessionId: null,
  cons:      { drink: 0, chips: 0, choc: 0 }
}));

let curRpt    = 'today';
let todayStats = { sessions: 0, revenue: 0, avgMins: null };

// ==================== API HELPER ====================
async function api(url, data) {
  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data)
    });
    return await res.json();
  } catch (e) {
    console.error('API Error:', e);
    return { ok: false, msg: 'خطأ في الاتصال بالسيرفر' };
  }
}

// ==================== UTILS ====================
function fmtT(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function tStr(ts) {
  return new Date(ts).toLocaleTimeString('ar-EG', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

// تاريخ اليوم بصيغة YYYY-MM-DD للباك اند
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function calcTimeCost(secs) {
  return (secs / 3600) * cfg.rate;
}

function calcConsCost(cons) {
  return cons.drink * cfg.drink + cons.chips * cfg.chips + cons.choc * cfg.choc;
}

// ==================== CLOCK ====================
setInterval(() => {
  const n = new Date();
  document.getElementById('tb-clock').textContent =
    [n.getHours(), n.getMinutes(), n.getSeconds()]
      .map(v => String(v).padStart(2, '0')).join(':');
}, 1000);

// ==================== AUTH ====================
async function doLogin() {
  const val = document.getElementById('pw-in').value;
  const err = document.getElementById('lerr');

  const res = await api(API_AUTH, { action: 'login', password: val });

  if (res.ok) {
    // تحميل الإعدادات من الباك اند
    cfg = { ...cfg, ...res.settings };

    document.getElementById('login-screen').classList.add('hide');
    document.getElementById('app').classList.add('show');
    setTimeout(() => document.getElementById('login-screen').style.display = 'none', 450);

    await initApp();
  } else {
    err.textContent = res.msg || 'كلمة السر غلط، حاول مرة تانية';
    document.getElementById('pw-in').value = '';
    document.getElementById('pw-in').focus();
    setTimeout(() => err.textContent = '', 2500);
  }
}

async function doLogout() {
  await api(API_AUTH, { action: 'logout' });
  location.reload();
}

// ==================== INIT ====================
async function initApp() {
  await loadActiveSessions(); // استرجاع الجلسات الشغالة من الباك اند
  await fetchTodayStats();
  renderDevices();
}

// استرجاع الجلسات الشغالة عند فتح التطبيق
async function loadActiveSessions() {
  const res = await api(API_SESSIONS, { action: 'active' });
  if (!res.ok) return;

  res.data.forEach(s => {
    const d = devState[s.device_id - 1];
    if (!d) return;
    d.active    = true;
    d.sessionId = parseInt(s.id);
    d.startTime = new Date(s.started_at).getTime();
    d.cons = {
      drink: parseInt(s.cons_drink) || 0,
      chips: parseInt(s.cons_chips) || 0,
      choc:  parseInt(s.cons_choc)  || 0
    };
  });
}

// ==================== NAVIGATION ====================
function gotoPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  btn.classList.add('active');

  if (id === 'reports')  renderReport();
  if (id === 'settings') loadSettings();
  if (id === 'expenses') renderExpenses();
}

// ==================== DEVICES ====================
function conLabel(key) {
  return key === 'drink' ? '🥤' : key === 'chips' ? '🍟' : '🍫';
}

function renderDevices() {
  const g = document.getElementById('dgrid');
  g.innerHTML = devState.map(d => `
    <div class="dcard ${d.active ? 'active' : ''}" id="dc-${d.id}">
      <div class="dbar"></div>

      <div class="dhead">
        <span class="dnum">PS ${d.id}</span>
        <span class="dbadge ${d.active ? 'on' : 'off'}">
          <span class="dot ${d.active ? 'pulse' : ''}"></span>
          ${d.active ? 'شغال' : 'متوقف'}
        </span>
      </div>

      <div class="dicon">
        <div class="ps-wrap">
          <svg class="ps-svg" viewBox="0 0 24 24">
            <path d="M8.984 2.596v15.252l3.67 1.17V6.38c0-.806.35-1.362 1.156-1.113.806.248.904.956.904
            1.762v4.927c2.73.867 5.28-.124 5.28-3.565 0-3.44-2.07-5.01-5.124-6.012-1.507-.496-3.284-.992-5.886-1.783z
            M3 18.016l5.984 1.98V17.8L4.88 16.662v-.03l4.104 1.01V15.49L3 13.553v4.463z
            m18-.516-5.98 1.98V17.3l4.104-1.138v-.03l-4.104 1.01V15l5.98 1.983v.516z"/>
          </svg>
        </div>
      </div>

      <div class="dtimes">
        <div class="dtimer" id="dt-${d.id}">${d.active ? fmtT(Math.floor((Date.now() - d.startTime) / 1000)) : '00:00:00'}</div>
        <div class="dtimer-price" id="dp-${d.id}">0.00 جنيه</div>
      </div>

      <div class="cons-panel">
        <div class="cons-row">
          ${['drink', 'chips', 'choc'].map(k => `
            <button class="con-btn" id="cb-${d.id}-${k}"
              onclick="addCon(${d.id},'${k}')"
              oncontextmenu="resetCon(event,${d.id},'${k}')">
              <span class="con-icon">${conLabel(k)}</span>
              <span class="con-count" id="cc-${d.id}-${k}">×${d.cons[k]}</span>
            </button>
          `).join('')}
        </div>
        <div class="cons-total" id="ctot-${d.id}">
          ${calcConsCost(d.cons) > 0 ? '+' + calcConsCost(d.cons).toFixed(2) + ' جنيه مشتريات' : ''}
        </div>
      </div>

      <div class="dactions">
        <button class="btn-start" onclick="startDev(${d.id})" ${d.active ? 'style="display:none"' : ''}>▶ تشغيل</button>
        <button class="btn-stop"  onclick="stopDev(${d.id})"  ${!d.active ? 'style="display:none"' : ''}>■ إيقاف وحساب</button>
      </div>
    </div>
  `).join('');

  renderStats();
}

// --- إضافة مشتريات ---
function addCon(id, key) {
  const d = devState[id - 1];
  if (!d.active) return;
  d.cons[key]++;
  document.getElementById('cc-' + id + '-' + key).textContent = '×' + d.cons[key];
  updateConsTotal(id);
}

function resetCon(e, id, key) {
  e.preventDefault();
  devState[id - 1].cons[key] = 0;
  document.getElementById('cc-' + id + '-' + key).textContent = '×0';
  updateConsTotal(id);
}

function updateConsTotal(id) {
  const t  = calcConsCost(devState[id - 1].cons);
  const el = document.getElementById('ctot-' + id);
  el.textContent = t > 0 ? '+' + t.toFixed(2) + ' جنيه مشتريات' : '';
}

// --- تشغيل جهاز (يتكلم مع الباك اند) ---
async function startDev(id) {
  const d   = devState[id - 1];
  if (d.active) return;

  const btn = document.querySelector(`#dc-${id} .btn-start`);
  btn.disabled    = true;
  btn.textContent = '...جاري';

  const res = await api(API_SESSIONS, {
    action:    'start',
    device_id: id,
    rate:      cfg.rate
  });

  btn.disabled    = false;
  btn.textContent = '▶ تشغيل';

  if (!res.ok) { showAlert(res.msg); return; }

  // تحديث الحالة المحلية بعد نجاح الباك اند
  d.active    = true;
  d.startTime = Date.now();
  d.sessionId = res.session_id;
  d.cons      = { drink: 0, chips: 0, choc: 0 };

  const card = document.getElementById('dc-' + id);
  card.classList.add('active');
  card.querySelector('.dbadge').className = 'dbadge on';
  card.querySelector('.dbadge').innerHTML = '<span class="dot pulse"></span> شغال';
  card.querySelector('.btn-start').style.display = 'none';
  card.querySelector('.btn-stop').style.display  = 'block';

  ['drink', 'chips', 'choc'].forEach(k => {
    document.getElementById('cc-' + id + '-' + k).textContent = '×0';
  });
  document.getElementById('ctot-' + id).textContent = '';
  renderStats();
}

// --- إيقاف جهاز وحساب الفاتورة (يتكلم مع الباك اند) ---
async function stopDev(id) {
  const d = devState[id - 1];
  if (!d.active) return;

  const btn = document.querySelector(`#dc-${id} .btn-stop`);
  btn.disabled    = true;
  btn.textContent = '...جاري';

  const res = await api(API_SESSIONS, {
    action:     'stop',
    session_id: d.sessionId,
    cons_drink: d.cons.drink,
    cons_chips: d.cons.chips,
    cons_choc:  d.cons.choc
  });

  btn.disabled    = false;
  btn.textContent = '■ إيقاف وحساب';

  if (!res.ok) { showAlert(res.msg); return; }

  // عرض الفاتورة بالبيانات القادمة من الباك اند
  showReceipt({
    device:     id,
    start:      d.startTime,
    end:        Date.now(),
    secs:       res.data.duration_s,
    rate:       cfg.rate,
    timeCost:   parseFloat(res.data.time_cost),
    consCost:   parseFloat(res.data.cons_cost),
    amount:     parseFloat(res.data.total),
    cons:       { ...d.cons },
    consPrices: { drink: cfg.drink, chips: cfg.chips, choc: cfg.choc }
  });

  // ريست حالة الجهاز
  d.active    = false;
  d.startTime = null;
  d.sessionId = null;
  d.cons      = { drink: 0, chips: 0, choc: 0 };

  const card = document.getElementById('dc-' + id);
  card.classList.remove('active');
  card.querySelector('.dbadge').className = 'dbadge off';
  card.querySelector('.dbadge').innerHTML = '<span class="dot"></span> متوقف';
  card.querySelector('.btn-start').style.display = '';
  card.querySelector('.btn-stop').style.display  = 'none';
  document.getElementById('dt-' + id).textContent = '00:00:00';
  document.getElementById('dp-' + id).textContent = '0.00 جنيه';
  ['drink', 'chips', 'choc'].forEach(k => {
    document.getElementById('cc-' + id + '-' + k).textContent = '×0';
  });
  document.getElementById('ctot-' + id).textContent = '';

  await fetchTodayStats(); // تحديث الإحصائيات بعد إغلاق الجلسة
}

// --- تحديث العدادات كل ثانية (بدون API calls) ---
setInterval(() => {
  const now = Date.now();
  devState.forEach(d => {
    if (!d.active) return;
    const s  = Math.floor((now - d.startTime) / 1000);
    const te = document.getElementById('dt-' + d.id);
    const pe = document.getElementById('dp-' + d.id);
    if (te) te.textContent = fmtT(s);
    if (pe) pe.textContent = (calcTimeCost(s) + calcConsCost(d.cons)).toFixed(2) + ' جنيه';
  });
  // تحديث عداد الأجهزة الشغالة بدون API call
  const actEl = document.getElementById('st-act');
  if (actEl) actEl.textContent = devState.filter(d => d.active).length;
}, 1000);

// --- إحصائيات اليوم (API call) ---
async function fetchTodayStats() {
  const res = await api(API_SESSIONS, { action: 'history', date: todayISO() });
  if (!res.ok) return;

  const sess = res.data;
  todayStats.sessions = sess.length;
  todayStats.revenue  = sess.reduce((a, s) => a + parseFloat(s.total || 0), 0);
  todayStats.avgMins  = sess.length
    ? Math.round(sess.reduce((a, s) => a + parseInt(s.duration_s || 0), 0) / sess.length / 60)
    : null;

  renderStats();
}

function renderStats() {
  const actEl = document.getElementById('st-act');
  if (actEl) actEl.textContent = devState.filter(d => d.active).length;

  const revEl = document.getElementById('st-rev');
  if (revEl) revEl.textContent = todayStats.revenue.toFixed(2) + ' جنيه';

  const sessEl = document.getElementById('st-sess');
  if (sessEl) sessEl.textContent = todayStats.sessions;

  const avgEl = document.getElementById('st-avg');
  if (avgEl) avgEl.textContent = todayStats.avgMins !== null ? todayStats.avgMins + '' : '—';
}

// ==================== RECEIPT MODAL ====================
function showReceipt(s) {
  document.getElementById('m-dev').textContent = 'جهاز ' + s.device;
  document.getElementById('m-s').textContent   = tStr(s.start);
  document.getElementById('m-e').textContent   = tStr(s.end);
  document.getElementById('m-d').textContent   = fmtT(s.secs);
  document.getElementById('m-r').textContent   = s.rate + ' جنيه/ساعة';
  document.getElementById('m-tc').textContent  = s.timeCost.toFixed(2) + ' جنيه';

  const hasCons = s.cons.drink || s.cons.chips || s.cons.choc;
  let csHtml = '';
  if (hasCons) {
    csHtml = '<div class="cons-receipt-title">🛒 المشتريات</div>';
    if (s.cons.drink) csHtml += `
      <div class="cons-receipt-row">
        <span class="rl">🥤 مشروب ×${s.cons.drink}</span>
        <span class="rv">${(s.cons.drink * s.consPrices.drink).toFixed(2)} جنيه</span>
      </div>`;
    if (s.cons.chips) csHtml += `
      <div class="cons-receipt-row">
        <span class="rl">🍟 شيبسي ×${s.cons.chips}</span>
        <span class="rv">${(s.cons.chips * s.consPrices.chips).toFixed(2)} جنيه</span>
      </div>`;
    if (s.cons.choc) csHtml += `
      <div class="cons-receipt-row">
        <span class="rl">🍫 شكولاتة ×${s.cons.choc}</span>
        <span class="rv">${(s.cons.choc * s.consPrices.choc).toFixed(2)} جنيه</span>
      </div>`;
    csHtml += `
      <div class="cons-receipt-row" style="border-top:.5px solid var(--border);margin-top:4px;padding-top:6px">
        <span class="rl" style="font-weight:700">مجموع المشتريات</span>
        <span class="rv" style="color:var(--amber)">${s.consCost.toFixed(2)} جنيه</span>
      </div>`;
  }
  document.getElementById('m-cons-section').innerHTML = csHtml;
  document.getElementById('m-total').textContent = s.amount.toFixed(2) + ' جنيه';
  document.getElementById('modal').classList.add('show');
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

// ==================== REPORTS ====================
function setRpt(type, btn) {
  curRpt = type;
  document.querySelectorAll('#page-reports .nb').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderReport();
}

async function renderReport() {
  let date = null;
  let month = null;

  if (curRpt === 'today') {
    date = todayISO();
  } else {
    // شهر كامل - نجيب أول وآخر يوم
    const now = new Date();
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const res = await api(API_SESSIONS, {
    action: 'history',
    date:   date,
    month:  month
  });

  if (!res.ok) return;
  const filtered = res.data;

  const rev      = filtered.reduce((a, s) => a + parseFloat(s.total || 0), 0);
  const mins     = Math.round(filtered.reduce((a, s) => a + parseInt(s.duration_s || 0), 0) / 60);
  const consTotal= filtered.reduce((a, s) => a + parseFloat(s.cons_cost || 0), 0);

  document.getElementById('rpt-stats').innerHTML = `
    <div class="sbox sa"><div class="slbl">عدد الجلسات</div><div class="sval">${filtered.length}</div></div>
    <div class="sbox sg"><div class="slbl">الإيراد الكلي</div><div class="sval g">${rev.toFixed(2)} جنيه</div></div>
    <div class="sbox sb"><div class="slbl">وقت التشغيل</div><div class="sval a">${mins} دقيقة</div></div>
    <div class="sbox sr"><div class="slbl">مشتريات</div><div class="sval r">${consTotal.toFixed(2)} جنيه</div></div>
  `;

  const tbody = document.getElementById('rpt-body');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-s"><div>📋</div><p>لا توجد جلسات</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td><span class="ptag">PS ${s.device_id}</span></td>
      <td>${fmtDateTime(s.started_at)}</td>
      <td>${fmtDateTime(s.ended_at)}</td>
      <td class="dur">${fmtT(parseInt(s.duration_s))}</td>
      <td class="amt">${parseFloat(s.time_cost).toFixed(2)} جنيه</td>
      <td class="cons-amt">${parseFloat(s.cons_cost) > 0 ? parseFloat(s.cons_cost).toFixed(2) + ' جنيه' : '—'}</td>
      <td class="amt">${parseFloat(s.total).toFixed(2)} جنيه</td>
    </tr>
  `).join('');
}

function fmtDateTime(mysqlDt) {
  if (!mysqlDt) return '—';
  return new Date(mysqlDt).toLocaleTimeString('ar-EG', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

// ==================== EXPENSES ====================
async function addExp() {
  const name   = document.getElementById('exp-n').value.trim();
  const amount = parseFloat(document.getElementById('exp-a').value);
  const note   = document.getElementById('exp-note').value.trim();
  const msg    = document.getElementById('exp-msg');

  if (!name)              { showMsg(msg, '❌ أدخل اسم المصروف', 'var(--red)'); return; }
  if (!amount || amount < 1) { showMsg(msg, '❌ أدخل مبلغ صحيح', 'var(--red)'); return; }

  const res = await api(API_EXPENSES, { action: 'add', name, amount, note });
  if (!res.ok) { showMsg(msg, '❌ ' + res.msg, 'var(--red)'); return; }

  document.getElementById('exp-n').value    = '';
  document.getElementById('exp-a').value    = '';
  document.getElementById('exp-note').value = '';
  showMsg(msg, '✓ تم إضافة المصروف', 'var(--green)');
  renderExpenses();
}

async function delExp(id) {
  const res = await api(API_EXPENSES, { action: 'delete', id });
  if (res.ok) renderExpenses();
}

async function renderExpenses() {
  const body = document.getElementById('exp-body');
  const tot  = document.getElementById('exp-tot');

  const res = await api(API_EXPENSES, { action: 'list', date: todayISO() });
  if (!res.ok) return;

  const expenses = res.data;

  if (!expenses.length) {
    body.innerHTML     = '<div class="eempty">لا توجد مصاريف مسجلة</div>';
    tot.style.display  = 'none';
    return;
  }

  body.innerHTML = expenses.map(e => `
    <div class="eitem">
      <div>
        <div class="eitem-n">${e.name}</div>
        <div class="eitem-note">${e.note || e.date}</div>
      </div>
      <div class="eitem-r">
        <span class="eamt">${parseFloat(e.amount).toFixed(2)} جنيه</span>
        <button class="btn-del" onclick="delExp(${e.id})">✕</button>
      </div>
    </div>
  `).join('');

  const total = expenses.reduce((a, e) => a + parseFloat(e.amount), 0);
  tot.style.display = 'flex';
  document.getElementById('exp-tot-v').textContent = total.toFixed(2) + ' جنيه';
}

// ==================== SETTINGS ====================
async function loadSettings() {
  const res = await api(API_SETTINGS, { action: 'get' });
  if (!res.ok) return;

  const d = res.data;
  cfg.rate  = parseFloat(d.rate  || 20);
  cfg.drink = parseFloat(d.drink || 15);
  cfg.chips = parseFloat(d.chips || 10);
  cfg.choc  = parseFloat(d.choc  || 10);

  document.getElementById('set-rate').value  = cfg.rate;
  document.getElementById('set-drink').value = cfg.drink;
  document.getElementById('set-chips').value = cfg.chips;
  document.getElementById('set-choc').value  = cfg.choc;
  document.getElementById('set-old').value   = '';
  document.getElementById('set-new').value   = '';
  document.getElementById('set-msg').textContent = '';
}

async function saveSettings() {
  const r   = parseFloat(document.getElementById('set-rate').value);
  const dr  = parseFloat(document.getElementById('set-drink').value);
  const ch  = parseFloat(document.getElementById('set-chips').value);
  const cc  = parseFloat(document.getElementById('set-choc').value);
  const op  = document.getElementById('set-old').value;
  const np  = document.getElementById('set-new').value;
  const msg = document.getElementById('set-msg');

  if ([r, dr, ch, cc].some(v => isNaN(v) || v < 1)) {
    showMsg(msg, '❌ تحقق من الأسعار', 'var(--red)'); return;
  }

  const payload = { action: 'save', rate: r, drink: dr, chips: ch, choc: cc };

  if (op || np) {
    if (np.length < 4) { showMsg(msg, '❌ الكلمة الجديدة 4 أحرف على الأقل', 'var(--red)'); return; }
    payload.old_password = op;
    payload.new_password = np;
  }

  const res = await api(API_SETTINGS, payload);
  if (!res.ok) { showMsg(msg, '❌ ' + res.msg, 'var(--red)'); return; }

  cfg.rate  = r;
  cfg.drink = dr;
  cfg.chips = ch;
  cfg.choc  = cc;

  showMsg(msg, '✓ تم حفظ الإعدادات', 'var(--green)', 3000);
}

// ==================== HELPERS ====================
function showMsg(el, text, color, duration = 2000) {
  el.style.color = color;
  el.textContent = text;
  setTimeout(() => el.textContent = '', duration);
}

function showAlert(msg) {
  // ممكن تبدلها بـ modal أحسن
  alert(msg);
}

// ==================== INIT ====================
document.getElementById('pw-in').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});
document.getElementById('pw-in').focus();
