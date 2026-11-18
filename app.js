/* ==========================================================================
   ZEN DECK - BY RALZ | NÚCLEO DE APLICACIÓN (app.js)
   ========================================================================== */

const SUPABASE_URL = 'https://lxrdrqjjuzpxtysakpvb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DXx0j5HaveKep0XHgjor_A_Kmrp9ll6';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================================================
   1. ICONOS VECTORIALES Y CONSTANTES
   ========================================================================== */
const ICONS = {
  grip: `<svg class="zen-ico" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>`,
  resize: `<svg class="zen-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`,
  close: `<svg class="zen-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  trash: `<svg class="zen-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  check: `<svg class="zen-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  external: `<svg class="zen-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  plus: `<svg class="zen-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  minus: `<svg class="zen-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>`
};

const DEFAULT_CITY = {
  name: 'San Pedro Sula, HN',
  lat: 15.5042,
  lon: -88.0250
};

const SUPPORTED_CURRENCIES = [
  { code: 'HNL', name: 'Lempira' },
  { code: 'USD', name: 'Dólar EE.UU.' },
  { code: 'EUR', name: 'Euro' },
  { code: 'MXN', name: 'Peso Mexicano' },
  { code: 'GTQ', name: 'Quetzal' },
  { code: 'CRC', name: 'Colón CR' }
];

const FALLBACK_RATES_USD = {
  USD: 1,
  HNL: 25.15,
  EUR: 0.92,
  MXN: 20.15,
  GTQ: 7.72,
  CRC: 512.0
};

const DEFAULT_CATEGORIES = [
  { id: 'default-food', name: 'Alimentación', type: 'expense', color: '#38bdf8' },
  { id: 'default-transport', name: 'Transporte', type: 'expense', color: '#818cf8' },
  { id: 'default-subs', name: 'Suscripciones', type: 'expense', color: '#fbbf24' },
  { id: 'default-home', name: 'Hogar y Servicios', type: 'expense', color: '#2dd4bf' },
  { id: 'default-leisure', name: 'Ocio', type: 'expense', color: '#f43f5e' },
  { id: 'default-salary', name: 'Salario / Honorarios', type: 'income', color: '#10b981' },
  { id: 'default-extra', name: 'Ingresos Extra', type: 'income', color: '#34d399' }
];

const ESPN_LEAGUES = [
  { slug: 'eng.1', name: 'Premier League' },
  { slug: 'esp.1', name: 'LaLiga' },
  { slug: 'ita.1', name: 'Serie A' },
  { slug: 'ger.1', name: 'Bundesliga' },
  { slug: 'fra.1', name: 'Ligue 1' },
  { slug: 'uefa.champions', name: 'Champions League' },
  { slug: 'fifa.friendly', name: 'Fecha FIFA' },
  { slug: 'uefa.nations', name: 'Fecha FIFA' },
  { slug: 'concacaf.nations.league', name: 'Fecha FIFA' },
  { slug: 'fifa.worldq.conmebol', name: 'Fecha FIFA' },
  { slug: 'bra.1', name: 'Brasileirão' },
  { slug: 'arg.1', name: 'Liga Argentina' },
  { slug: 'usa.1', name: 'MLS' }
];

const MODULE_THEMES = {
  'dashboard-module': 'dashboard',
  'life-module': 'life',
  'finance-module': 'finance',
  'parleys-module': 'parleys'
};

/* ==========================================================================
   2. ESTADO GLOBAL DE LA APLICACIÓN
   ========================================================================== */
const state = {
  user: null,
  authMode: 'login',
  activeModule: 'dashboard-module',
  hydrationComplete: false,
  profileTimer: null,

  // Panel Principal
  weatherCity: { ...DEFAULT_CITY },
  ratesUSD: { ...FALLBACK_RATES_USD },
  currencyFrom: 'USD',
  currencyTo: 'HNL',

  pomodoro: {
    durationMins: 25,
    remainingSecs: 25 * 60,
    running: false,
    intervalId: null,
    sessionsToday: 0,
    sessionsDate: ''
  },

  habits: [
    { id: 'hab-1', title: 'Tomar 2L de agua', done: false },
    { id: 'hab-2', title: '1h de práctica / código', done: false },
    { id: 'hab-3', title: 'Actividad física', done: false }
  ],
  habitsDate: '',
  scratchpad: '',
  links: [],
  todos: [],
  reminders: [],
  customWidgets: [],
  widgetLayout: {},

  // Panel de Vida
  googleClientId: '',
  outlookClientId: '',
  googleToken: '',
  outlookToken: '',
  icsSources: [],
  mails: [],
  calendarEvents: [],
  mailFilter: 'ALL',
  calFilter: 'ALL',

  // Asesor Financiero
  financePeriod: '30',
  financeCurrency: 'HNL',
  donutMode: 'categories',
  plannedTypeFilter: 'ALL',
  plannedSearch: '',
  accounts: [],
  categories: [],
  transactions: [],
  plannedPayments: [],

  // Parleys
  parleysMatches: [],
  autoParleys: [],
  parleysUpdatedAt: '',
  selectedLeague: 'ALL',
  selectedDateFilter: 'ALL',
  customParleyDate: '',
  slip: []
};

/* ==========================================================================
   3. UTILIDADES Y MICRO-INTERACCIONES ZENFX
   ========================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function isUUID(val) {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(amount, currency = 'HNL') {
  const num = Number(amount) || 0;
  return `${currency} ${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function convertCurrency(amount, from, to) {
  const val = Number(amount) || 0;
  if (from === to) return val;
  const fromRate = state.ratesUSD[from] || FALLBACK_RATES_USD[from] || 1;
  const toRate = state.ratesUSD[to] || FALLBACK_RATES_USD[to] || 1;
  const inUSD = val / fromRate;
  return inUSD * toRate;
}

function showToast(message) {
  const existing = $('.zen-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'zen-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 200ms ease';
    setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function spawnParticles(x, y, color = '#38bdf8') {
  for (let i = 0; i < 10; i++) {
    const p = document.createElement('span');
    p.className = 'zen-particle';
    const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
    const dist = 28 + Math.random() * 34;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.color = color;
    p.style.background = color;
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 580);
  }
}

function initZenFX() {
  document.addEventListener('pointerdown', (e) => {
    const target = e.target.closest('.glass-btn, .icon-btn, .nav-pill, .seg-btn, .odd-chip, .pulse-tile');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'zen-ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 520);
  });
}

function applyWidgetStagger(container = document) {
  $$('.zen-widget', container).forEach((el, idx) => {
    el.style.setProperty('--stagger', String(idx % 12));
  });
}

function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('closing', 'hidden');
}

function closeModal(modalEl) {
  if (!modalEl || modalEl.classList.contains('hidden')) return;
  modalEl.classList.add('closing');
  setTimeout(() => {
    modalEl.classList.add('hidden');
    modalEl.classList.remove('closing');
  }, 175);
}

/* ==========================================================================
   4. PERSISTENCIA RELACIONAL EN SUPABASE + PREFERENCIAS LOCALES
   ========================================================================== */
function getLocalPrefsKey() {
  return state.user ? `zen_deck_prefs_${state.user.id}` : 'zen_deck_prefs_guest';
}

function saveLocalPrefs() {
  if (!state.hydrationComplete) return;
  try {
    const prefs = {
      weatherCity: state.weatherCity,
      currencyFrom: state.currencyFrom,
      currencyTo: state.currencyTo,
      pomodoro: {
        sessionsToday: state.pomodoro.sessionsToday,
        sessionsDate: state.pomodoro.sessionsDate
      },
      habits: state.habits,
      habitsDate: state.habitsDate,
      scratchpad: state.scratchpad,
      widgetLayout: state.widgetLayout,
      googleClientId: state.googleClientId,
      outlookClientId: state.outlookClientId,
      icsSources: state.icsSources,
      financePeriod: state.financePeriod,
      financeCurrency: state.financeCurrency
    };
    localStorage.setItem(getLocalPrefsKey(), JSON.stringify(prefs));
  } catch (_) {}
}

function loadLocalPrefs() {
  try {
    const raw = localStorage.getItem(getLocalPrefsKey());
    if (!raw) return;
    const p = JSON.parse(raw);
    if (p.weatherCity && Number.isFinite(Number(p.weatherCity.lat)) && Number.isFinite(Number(p.weatherCity.lon))) {
      state.weatherCity = {
        name: p.weatherCity.name || DEFAULT_CITY.name,
        lat: Number(p.weatherCity.lat),
        lon: Number(p.weatherCity.lon)
      };
    }
    if (p.currencyFrom) state.currencyFrom = p.currencyFrom;
    if (p.currencyTo) state.currencyTo = p.currencyTo;

    const today = todayISO();
    if (p.pomodoro) {
      state.pomodoro.sessionsDate = p.pomodoro.sessionsDate || today;
      state.pomodoro.sessionsToday = p.pomodoro.sessionsDate === today ? (Number(p.pomodoro.sessionsToday) || 0) : 0;
    }
    if (Array.isArray(p.habits) && p.habits.length) state.habits = p.habits;
    state.habitsDate = p.habitsDate || today;
    if (state.habitsDate !== today) {
      state.habits = state.habits.map((h) => ({ ...h, done: false }));
      state.habitsDate = today;
    }

    if (typeof p.scratchpad === 'string') state.scratchpad = p.scratchpad;
    if (p.widgetLayout && typeof p.widgetLayout === 'object') state.widgetLayout = p.widgetLayout;
    if (typeof p.googleClientId === 'string') state.googleClientId = p.googleClientId;
    if (typeof p.outlookClientId === 'string') state.outlookClientId = p.outlookClientId;
    if (Array.isArray(p.icsSources)) state.icsSources = p.icsSources;
    if (p.financePeriod) state.financePeriod = String(p.financePeriod);
    if (p.financeCurrency) state.financeCurrency = p.financeCurrency;
  } catch (_) {}
}

function syncProfileToSupabase() {
  saveLocalPrefs();
  if (!state.user || !state.hydrationComplete) return;

  clearTimeout(state.profileTimer);
  state.profileTimer = setTimeout(async () => {
    try {
      const dashLayout = state.widgetLayout['dashboard-module'] || {};
      const profileUpdate = {
        weather_city: state.weatherCity.name,
        weather_lat: state.weatherCity.lat,
        weather_lon: state.weatherCity.lon,
        currency_from: state.currencyFrom,
        currency_to: state.currencyTo,
        google_client_id: state.googleClientId || null,
        widget_order: dashLayout.order || [],
        hidden_widgets: dashLayout.hidden || [],
        widget_sizes: state.widgetLayout
      };
      await sb.from('profiles').update(profileUpdate).eq('id', state.user.id);
    } catch (_) {}
  }, 600);
}

async function loadUserState() {
  state.hydrationComplete = false;
  loadLocalPrefs();

  if (!state.user) {
    state.categories = [...DEFAULT_CATEGORIES];
    state.hydrationComplete = true;
    return;
  }

  const uidVal = state.user.id;

  // Cargar todas las tablas reales en paralelo
  const [
    profRes,
    accRes,
    catRes,
    txRes,
    planRes,
    todoRes,
    remRes,
    linkRes,
    cwRes
  ] = await Promise.all([
    sb.from('profiles').select('*').eq('id', uidVal).maybeSingle(),
    sb.from('finance_accounts').select('*').eq('user_id', uidVal).order('created_at', { ascending: true }),
    sb.from('finance_categories').select('*').eq('user_id', uidVal).order('created_at', { ascending: true }),
    sb.from('finance_transactions').select('*').eq('user_id', uidVal).order('tx_date', { ascending: false }),
    sb.from('finance_planned').select('*').eq('user_id', uidVal).order('next_date', { ascending: true }),
    sb.from('todos').select('*').eq('user_id', uidVal).order('created_at', { ascending: false }),
    sb.from('reminders').select('*').eq('user_id', uidVal),
    sb.from('quick_links').select('*').eq('user_id', uidVal),
    sb.from('custom_widgets').select('*').eq('user_id', uidVal)
  ]);

  // 1. Perfil
  if (profRes?.data) {
    const pr = profRes.data;
    if (pr.full_name) {
      $('#welcome-user').textContent = `Hola, ${pr.full_name}`;
    }
    if (pr.weather_city && Number.isFinite(Number(pr.weather_lat)) && Number.isFinite(Number(pr.weather_lon))) {
      state.weatherCity = {
        name: pr.weather_city,
        lat: Number(pr.weather_lat),
        lon: Number(pr.weather_lon)
      };
    }
    if (pr.currency_from) state.currencyFrom = pr.currency_from;
    if (pr.currency_to) state.currencyTo = pr.currency_to;
    if (pr.google_client_id && !state.googleClientId) state.googleClientId = pr.google_client_id;

    // Layout guardado en profiles
    if (pr.widget_sizes && typeof pr.widget_sizes === 'object' && pr.widget_sizes['dashboard-module']) {
      state.widgetLayout = { ...state.widgetLayout, ...pr.widget_sizes };
    } else if (Array.isArray(pr.widget_order) || Array.isArray(pr.hidden_widgets)) {
      state.widgetLayout['dashboard-module'] = {
        order: Array.isArray(pr.widget_order) ? pr.widget_order : [],
        hidden: Array.isArray(pr.hidden_widgets) ? pr.hidden_widgets : [],
        sizes: pr.widget_sizes && typeof pr.widget_sizes === 'object' ? pr.widget_sizes : {}
      };
    }
  }

  // 2. Cuentas financieras (finance_accounts)
  if (Array.isArray(accRes?.data)) {
    state.accounts = accRes.data.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.account_type || 'Banco',
      currency: a.currency || 'HNL',
      balance: Number(a.balance) || 0
    }));
  }

  // 3. Categorías financieras (finance_categories)
  const dbCats = Array.isArray(catRes?.data)
    ? catRes.data.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type || 'expense',
        color: c.color || '#38bdf8'
      }))
    : [];
  const dbCatNames = new Set(dbCats.map((c) => c.name.toLowerCase()));
  const extraDefaults = DEFAULT_CATEGORIES.filter((d) => !dbCatNames.has(d.name.toLowerCase()));
  state.categories = [...dbCats, ...extraDefaults];

  // 4. Movimientos (finance_transactions)
  if (Array.isArray(txRes?.data)) {
    state.transactions = txRes.data.map((t) => ({
      id: t.id,
      accountId: t.account_id || '',
      categoryId: t.category_id || '',
      type: t.type === 'income' ? 'income' : 'expense',
      amount: Number(t.amount) || 0,
      currency: t.currency || 'HNL',
      description: t.description || 'Movimiento',
      recurring: Boolean(t.is_recurring),
      date: String(t.tx_date || todayISO()).slice(0, 10)
    }));
  }

  // 5. Pagos planificados (finance_planned)
  if (Array.isArray(planRes?.data)) {
    state.plannedPayments = planRes.data.map((p) => ({
      id: p.id,
      accountId: p.account_id || '',
      categoryId: p.category_id || '',
      type: p.type === 'income' ? 'income' : 'expense',
      title: p.title || 'Pago planificado',
      amount: Number(p.amount) || 0,
      currency: p.currency || 'USD',
      frequency: p.frequency || 'mensual',
      nextDate: String(p.next_date || todayISO()).slice(0, 10)
    }));
  }

  // 6. Tareas (todos)
  if (Array.isArray(todoRes?.data)) {
    state.todos = todoRes.data.map((t) => ({
      id: t.id,
      text: t.title || '',
      done: Boolean(t.completed)
    }));
  }

  // 7. Recordatorios (reminders)
  if (Array.isArray(remRes?.data)) {
    state.reminders = remRes.data.map((r) => ({
      id: r.id,
      title: r.title || '',
      date: r.remind_at || r.due_date || r.date || ''
    }));
  }

  // 8. Accesos rápidos (quick_links)
  if (Array.isArray(linkRes?.data)) {
    state.links = linkRes.data.map((l) => ({
      id: l.id,
      title: l.title || l.url,
      url: l.url || '#'
    }));
  }

  // 9. Widgets personalizados (custom_widgets)
  if (Array.isArray(cwRes?.data)) {
    state.customWidgets = cwRes.data.map((w) => ({
      id: w.id,
      title: w.title || 'Widget',
      type: w.type || 'note',
      tag: w.tag || '',
      content: w.content || '',
      size: w.size || '1x1',
      items: w.items || [],
      value: w.value ?? 0,
      goal: w.goal ?? 10,
      minutes: w.minutes ?? 25
    }));
  }

  state.hydrationComplete = true;
}

/* ==========================================================================
   5. AUTENTICACIÓN CON SUPABASE
   ========================================================================== */
function updateAuthModeUI() {
  const isReg = state.authMode === 'register';
  $('#auth-title').textContent = isReg ? 'Crear Cuenta' : 'Iniciar Sesión';
  $('#auth-subtitle').textContent = isReg
    ? 'Configura tu espacio personal sincronizado'
    : 'Accede a tu espacio de trabajo sincronizado';
  $('#name-field-group').classList.toggle('hidden', !isReg);
  $('#auth-submit-btn').textContent = isReg ? 'Registrarme' : 'Entrar al Panel';
  $('#auth-toggle-text').textContent = isReg ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?';
  $('#auth-toggle-btn').textContent = isReg ? 'Inicia sesión' : 'Regístrate aquí';
  $('#auth-error').classList.add('hidden');
  $('#auth-success').classList.add('hidden');
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = $('#email').value.trim();
  const password = $('#password').value;
  const fullName = $('#full-name').value.trim();
  const errEl = $('#auth-error');
  const okEl = $('#auth-success');
  const btn = $('#auth-submit-btn');

  errEl.classList.add('hidden');
  okEl.classList.add('hidden');
  btn.disabled = true;

  try {
    if (state.authMode === 'register') {
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName || email.split('@')[0] } }
      });
      if (error) throw error;
      okEl.textContent = 'Cuenta creada. Revisa tu correo para confirmar o inicia sesión.';
      okEl.classList.remove('hidden');
      state.authMode = 'login';
      updateAuthModeUI();
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.user) await enterApp(data.user);
    }
  } catch (err) {
    errEl.textContent = err.message || 'No se pudo autenticar. Verifica tus datos.';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
}

async function handleForgotPassword() {
  const email = $('#email').value.trim();
  const errEl = $('#auth-error');
  const okEl = $('#auth-success');
  errEl.classList.add('hidden');
  okEl.classList.add('hidden');

  if (!email) {
    errEl.textContent = 'Escribe tu correo electrónico arriba para enviarte el enlace de recuperación.';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    okEl.textContent = 'Te enviamos un enlace a tu correo para restablecer la contraseña.';
    okEl.classList.remove('hidden');
  } catch (err) {
    errEl.textContent = err.message || 'Error al enviar correo de recuperación.';
    errEl.classList.remove('hidden');
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const p1 = $('#new-password-input').value;
  const p2 = $('#confirm-password-input').value;
  const msgEl = $('#password-change-msg');
  msgEl.classList.add('hidden');

  if (p1 !== p2) {
    msgEl.textContent = 'Las contraseñas no coinciden.';
    msgEl.className = 'error-msg';
    msgEl.classList.remove('hidden');
    return;
  }

  try {
    const { error } = await sb.auth.updateUser({ password: p1 });
    if (error) throw error;
    msgEl.textContent = 'Contraseña actualizada correctamente.';
    msgEl.className = 'success-msg';
    msgEl.classList.remove('hidden');
    $('#change-password-form').reset();
    setTimeout(() => closeModal($('#password-modal')), 1000);
  } catch (err) {
    msgEl.textContent = err.message || 'No se pudo actualizar la contraseña.';
    msgEl.className = 'error-msg';
    msgEl.classList.remove('hidden');
  }
}

async function enterApp(user) {
  state.user = user;
  $('#auth-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    (user.email ? user.email.split('@')[0] : 'Ralz');
  $('#welcome-user').textContent = `Hola, ${displayName}`;

  const dateFmt = new Intl.DateTimeFormat('es-HN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
  $('#current-date').textContent = dateFmt.charAt(0).toUpperCase() + dateFmt.slice(1);

  await loadUserState();

  injectFinanceBackupControls();
  renderCustomWidgets();
  applySavedLayout();
  applyWidgetStagger();

  initCurrencyWidget();
  renderPomodoro();
  renderHabits();
  renderScratchpad();
  renderLinks();
  renderTodos();
  renderReminders();
  renderLifeModule();
  renderFinanceModule();
  updatePulseWidget();

  fetchExchangeRates();
  fetchWeather();
  loadParleys();
  refreshIcsSources();
}

/* ==========================================================================
   6. NAVEGACIÓN DE MÓDULOS, DRAG & DROP Y GESTOR DE WIDGETS
   ========================================================================== */
function initDragAndDrop() {
  if (!document.getElementById('zen-touch-dnd-style')) {
    const style = document.createElement('style');
    style.id = 'zen-touch-dnd-style';
    style.textContent = `
      .drag-handle {
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        padding: 0.4rem;
        margin: -0.4rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
      }
      .drag-handle:active {
        cursor: grabbing;
      }
      .zen-touch-ghost {
        position: fixed;
        z-index: 9999;
        pointer-events: none;
        opacity: 0.92;
        transform: scale(1.02);
        box-shadow: 0 22px 48px rgba(0, 0, 0, 0.55);
        border: 1px solid var(--accent, #38bdf8);
      }
    `;
    document.head.appendChild(style);
  }

  let draggedEl = null;

  /* --- 1. Arrastre de escritorio (Mouse / HTML5 DnD) --- */
  document.addEventListener('dragstart', (e) => {
    const widget = e.target.closest('.zen-widget');
    if (!widget || touchState.active) {
      e.preventDefault();
      return;
    }
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      return;
    }
    draggedEl = widget;
    widget.classList.add('dragging');
    widget.closest('.module-dropzone')?.classList.add('dropzone-active');
    e.dataTransfer.effectAllowed = 'move';
  });

  document.addEventListener('dragover', (e) => {
    if (!draggedEl) return;
    const target = e.target.closest('.zen-widget');
    const zone = e.target.closest('.module-dropzone');
    if (!zone || draggedEl.parentElement !== zone) return;
    e.preventDefault();

    $$('.zen-widget.drag-over', zone).forEach((el) => {
      if (el !== target) el.classList.remove('drag-over');
    });
    if (target && target !== draggedEl) {
      target.classList.add('drag-over');
    }
  });

  document.addEventListener('drop', (e) => {
    if (!draggedEl) return;
    const zone = e.target.closest('.module-dropzone');
    const target = e.target.closest('.zen-widget');
    if (!zone || draggedEl.parentElement !== zone) return;
    e.preventDefault();

    if (target && target !== draggedEl) {
      const rect = target.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2 || e.clientX > rect.left + rect.width / 2;
      zone.insertBefore(draggedEl, after ? target.nextSibling : target);
    }

    draggedEl.classList.add('drop-settle');
    setTimeout(() => draggedEl?.classList.remove('drop-settle'), 420);
    persistModuleLayout(zone);
  });

  document.addEventListener('dragend', () => {
    $$('.zen-widget.dragging').forEach((el) => el.classList.remove('dragging'));
    $$('.zen-widget.drag-over').forEach((el) => el.classList.remove('drag-over'));
    $$('.module-dropzone.dropzone-active').forEach((el) => el.classList.remove('dropzone-active'));
    draggedEl = null;
  });

  /* --- 2. Arrastre táctil en celular (Pointer Capture sobre .drag-handle) --- */
  const touchState = {
    active: false,
    pointerId: null,
    handle: null,
    widget: null,
    zone: null,
    ghost: null,
    offsetX: 0,
    offsetY: 0,
    lastY: 0,
    targetWidget: null,
    insertAfter: false,
    scrollRaf: null
  };

  function runAutoScroll() {
    if (!touchState.active) return;
    const edge = 70;
    const vh = window.innerHeight;
    if (touchState.lastY < edge) {
      window.scrollBy(0, -10);
    } else if (touchState.lastY > vh - edge) {
      window.scrollBy(0, 10);
    }
    touchState.scrollRaf = requestAnimationFrame(runAutoScroll);
  }

  function cleanupTouchDrag() {
    if (touchState.scrollRaf) cancelAnimationFrame(touchState.scrollRaf);
    $$('.zen-touch-ghost').forEach((el) => el.remove());
    $$('.zen-widget.dragging').forEach((el) => el.classList.remove('dragging'));
    $$('.zen-widget.drag-over').forEach((el) => el.classList.remove('drag-over'));
    $$('.module-dropzone.dropzone-active').forEach((el) => el.classList.remove('dropzone-active'));

    if (touchState.widget) {
      touchState.widget.setAttribute('draggable', 'true');
    }
    if (touchState.handle && touchState.pointerId !== null) {
      try {
        if (touchState.handle.hasPointerCapture(touchState.pointerId)) {
          touchState.handle.releasePointerCapture(touchState.pointerId);
        }
      } catch (_) {}
    }

    touchState.active = false;
    touchState.pointerId = null;
    touchState.handle = null;
    touchState.widget = null;
    touchState.zone = null;
    touchState.ghost = null;
    touchState.targetWidget = null;
    touchState.insertAfter = false;
    touchState.scrollRaf = null;
  }

  function finishTouchDrag(commitMove = true) {
    if (!touchState.active) {
      cleanupTouchDrag();
      return;
    }

    const { widget, zone, targetWidget, insertAfter } = touchState;
    try {
      if (commitMove && widget && zone && targetWidget && targetWidget.parentElement === zone) {
        zone.insertBefore(widget, insertAfter ? targetWidget.nextSibling : targetWidget);
      }
      if (widget && zone) {
        widget.classList.add('drop-settle');
        setTimeout(() => widget.classList.remove('drop-settle'), 420);
        persistModuleLayout(zone);
      }
    } finally {
      cleanupTouchDrag();
    }
  }

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;

    const widget = handle.closest('.zen-widget');
    const zone = widget?.closest('.module-dropzone');
    if (!widget || !zone) return;

    cleanupTouchDrag();
    e.preventDefault();

    const rect = widget.getBoundingClientRect();
    widget.setAttribute('draggable', 'false');

    const ghost = widget.cloneNode(true);
    ghost.classList.add('zen-touch-ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.appendChild(ghost);

    touchState.active = true;
    touchState.pointerId = e.pointerId;
    touchState.handle = handle;
    touchState.widget = widget;
    touchState.zone = zone;
    touchState.ghost = ghost;
    touchState.offsetX = e.clientX - rect.left;
    touchState.offsetY = e.clientY - rect.top;
    touchState.lastY = e.clientY;

    try {
      handle.setPointerCapture(e.pointerId);
    } catch (_) {}

    widget.classList.add('dragging');
    zone.classList.add('dropzone-active');
    touchState.scrollRaf = requestAnimationFrame(runAutoScroll);
  });

  document.addEventListener('pointermove', (e) => {
    if (!touchState.active || e.pointerId !== touchState.pointerId || !touchState.ghost) return;
    e.preventDefault();

    touchState.lastY = e.clientY;
    touchState.ghost.style.left = `${e.clientX - touchState.offsetX}px`;
    touchState.ghost.style.top = `${e.clientY - touchState.offsetY}px`;

    const underEl = document.elementFromPoint(e.clientX, e.clientY);
    const candidate = underEl?.closest('.zen-widget');

    $$('.zen-widget.drag-over', touchState.zone).forEach((el) => {
      if (el !== candidate) el.classList.remove('drag-over');
    });

    if (candidate && candidate !== touchState.widget && candidate.parentElement === touchState.zone) {
      candidate.classList.add('drag-over');
      const rect = candidate.getBoundingClientRect();
      touchState.targetWidget = candidate;
      touchState.insertAfter =
        e.clientY > rect.top + rect.height / 2 || e.clientX > rect.left + rect.width / 2;
    } else {
      touchState.targetWidget = null;
    }
  });

  document.addEventListener('pointerup', (e) => {
    if (!touchState.active || e.pointerId !== touchState.pointerId) return;
    finishTouchDrag(true);
  });

  document.addEventListener('pointercancel', (e) => {
    if (!touchState.active || e.pointerId !== touchState.pointerId) return;
    finishTouchDrag(false);
  });

  document.addEventListener('lostpointercapture', () => {
    if (touchState.active) finishTouchDrag(true);
  });

  window.addEventListener('blur', () => {
    if (touchState.active) finishTouchDrag(false);
  });

  /* --- 3. Controles de redimensionar y ocultar widgets --- */
  document.addEventListener('click', (e) => {
    const resizeBtn = e.target.closest('.resize-btn');
    if (resizeBtn) {
      const widget = resizeBtn.closest('.zen-widget');
      const zone = widget?.closest('.module-dropzone');
      if (!widget || !zone) return;
      const current = SIZE_CYCLE.find((s) => widget.classList.contains(`size-${s}`)) || '1x1';
      const next = SIZE_CYCLE[(SIZE_CYCLE.indexOf(current) + 1) % SIZE_CYCLE.length];
      setWidgetSize(widget, next);
      persistModuleLayout(zone);
      return;
    }

    const hideBtn = e.target.closest('.hide-widget-btn');
    if (hideBtn) {
      const widget = hideBtn.closest('.zen-widget');
      const zone = widget?.closest('.module-dropzone');
      if (!widget || !zone) return;
      widget.classList.add('hidden');
      persistModuleLayout(zone);
      showToast('Widget ocultado. Reactívalo en "Vista".');
    }
  });
}

/* ==========================================================================
   7. WIDGETS PERSONALIZADOS
   ========================================================================== */
function renderCustomWidgets() {
  $$('.zen-widget[data-custom-widget="true"]').forEach((el) => el.remove());
  const zone = $('#dashboard-module .module-dropzone');
  if (!zone) return;

  state.customWidgets.forEach((cw) => {
    const article = document.createElement('article');
    article.className = 'glass-card widget-card hover-glass zen-widget';
    article.setAttribute('draggable', 'true');
    article.dataset.widgetId = cw.id;
    article.dataset.widgetTitle = cw.title;
    article.dataset.defaultSize = cw.size || '1x1';
    article.dataset.customWidget = 'true';
    setWidgetSize(article, cw.size || '1x1');

    let bodyHTML = '';
    if (cw.type === 'note') {
      const formatted = escapeHTML(cw.content || '').replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="link-btn">$1</a>'
      );
      bodyHTML = `<div class="nested-glass-card" style="flex:1; white-space:pre-wrap; overflow-y:auto; font-size:0.84rem;">${formatted}</div>`;
    } else if (cw.type === 'checklist') {
      const items = Array.isArray(cw.items) && cw.items.length
        ? cw.items
        : String(cw.content || '')
            .split('\n')
            .filter(Boolean)
            .map((text) => ({ text, done: false }));
      bodyHTML = `
        <ul class="glass-list" data-cw-list="${cw.id}">
          ${items
            .map(
              (it, idx) => `
            <li class="${it.done ? 'completed' : ''}">
              <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; flex:1;">
                <input type="checkbox" data-cw-check="${cw.id}" data-idx="${idx}" ${it.done ? 'checked' : ''} />
                <span>${escapeHTML(it.text)}</span>
              </label>
            </li>`
            )
            .join('')}
        </ul>
      `;
    } else if (cw.type === 'counter') {
      const val = Number(cw.value) || 0;
      const goal = Math.max(1, Number(cw.goal) || 10);
      const pct = Math.min(100, Math.round((val / goal) * 100));
      bodyHTML = `
        <div class="big-metric" style="text-align:center; margin:auto 0;">${val} <span class="muted-text">/ ${goal}</span></div>
        <div class="prob-bar-bg"><div class="prob-bar-fill income-fill" style="width:${pct}%"></div></div>
        <div class="inline-form" style="justify-content:center;">
          <button type="button" class="glass-btn" data-cw-step="-1" data-cw-id="${cw.id}">${ICONS.minus}</button>
          <button type="button" class="glass-btn primary" data-cw-step="1" data-cw-id="${cw.id}">${ICONS.plus}</button>
        </div>
      `;
    } else if (cw.type === 'timer') {
      const mins = Number(cw.minutes) || 25;
      bodyHTML = `
        <div class="big-metric" style="text-align:center; margin:auto 0;">${String(mins).padStart(2, '0')}:00</div>
        <p class="muted-text" style="text-align:center;">Bloque configurado de ${mins} min</p>
      `;
    }

    article.innerHTML = `
      <div class="widget-header">
        <div class="header-title-group">
          <span class="drag-handle" title="Arrastrar">${ICONS.grip}</span>
          <h3>${escapeHTML(cw.title)}</h3>
          ${cw.tag ? `<span class="glass-pill">${escapeHTML(cw.tag)}</span>` : ''}
        </div>
        <div class="header-controls">
          <button type="button" class="icon-btn resize-btn hover-glass" data-resize="${cw.id}" title="Cambiar tamaño">${ICONS.resize}</button>
          <button type="button" class="icon-btn hover-glass" data-delete-cw="${cw.id}" title="Eliminar widget">${ICONS.trash}</button>
        </div>
      </div>
      ${bodyHTML}
    `;
    zone.appendChild(article);
  });
}

/* ==========================================================================
   8. PANEL PRINCIPAL: CLIMA LOCAL
   ========================================================================== */
function mapWeatherCode(code) {
  const c = Number(code);
  if (c === 0) return { icon: '☀️', desc: 'Despejado' };
  if ([1, 2].includes(c)) return { icon: '🌤️', desc: 'Parcialmente nublado' };
  if (c === 3) return { icon: '☁️', desc: 'Nublado' };
  if ([45, 48].includes(c)) return { icon: '🌫️', desc: 'Neblina' };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(c)) return { icon: '🌧️', desc: 'Lluvia' };
  if ([71, 73, 75, 77, 85, 86].includes(c)) return { icon: '❄️', desc: 'Nieve' };
  if ([95, 96, 99].includes(c)) return { icon: '⛈️', desc: 'Tormenta eléctrica' };
  return { icon: '⛅', desc: 'Clima templado' };
}

async function fetchWeather() {
  const cityLabel = $('#weather-city-label');
  const tempEl = $('#weather-temp');
  const descEl = $('#weather-desc');
  const windEl = $('#weather-wind');
  const iconEl = $('#weather-icon');

  const city = state.weatherCity && Number.isFinite(Number(state.weatherCity.lat))
    ? state.weatherCity
    : { ...DEFAULT_CITY };

  if (cityLabel) cityLabel.textContent = city.name;
  if (descEl) descEl.textContent = 'Actualizando...';

  try {
    const url1 = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
    const res1 = await fetch(url1, { cache: 'no-store' });
    if (res1.ok) {
      const json1 = await res1.json();
      if (json1.current && typeof json1.current.temperature_2m === 'number') {
        const info = mapWeatherCode(json1.current.weather_code);
        iconEl.textContent = info.icon;
        tempEl.textContent = `${Math.round(json1.current.temperature_2m)}°C`;
        descEl.textContent = info.desc;
        windEl.textContent = `Viento: ${Math.round(json1.current.wind_speed_10m || 0)} km/h`;
        return;
      }
    }
  } catch (_) {}

  try {
    const queryCity = city.name.split(',')[0].trim() || 'San Pedro Sula';
    const res3 = await fetch(`https://wttr.in/${encodeURIComponent(queryCity)}?format=j1`, { cache: 'no-store' });
    if (res3.ok) {
      const json3 = await res3.json();
      const cur = json3.current_condition?.[0];
      if (cur) {
        iconEl.textContent = '⛅';
        tempEl.textContent = `${cur.temp_C}°C`;
        descEl.textContent = cur.lang_es?.[0]?.value || cur.weatherDesc?.[0]?.value || 'Actualizado';
        windEl.textContent = `Viento: ${cur.windspeedKmph || 0} km/h`;
        return;
      }
    }
  } catch (_) {}

  tempEl.textContent = '--°C';
  descEl.textContent = 'Sin respuesta del servicio';
  windEl.textContent = 'Viento: -- km/h';
}

async function searchCities() {
  const query = $('#city-search-input').value.trim();
  const list = $('#city-results-list');
  if (!query) return;
  list.innerHTML = '<span class="muted-text">Buscando...</span>';

  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=es&format=json`
    );
    const data = await res.json();
    const results = data.results || [];
    if (!results.length) {
      list.innerHTML = '<span class="muted-text">Sin resultados para esa ciudad.</span>';
      return;
    }

    list.innerHTML = '';
    results.forEach((c) => {
      const label = `${c.name}${c.country_code ? `, ${c.country_code}` : ''}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-pill';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        state.weatherCity = { name: label, lat: Number(c.latitude), lon: Number(c.longitude) };
        syncProfileToSupabase();
        $('#city-search-box').classList.add('hidden');
        fetchWeather();
      });
      list.appendChild(btn);
    });
  } catch (_) {
    list.innerHTML = '<span class="muted-text">Error al buscar ciudades.</span>';
  }
}

/* ==========================================================================
   9. PANEL PRINCIPAL: DIVISAS, POMODORO, HÁBITOS, NOTAS, LINKS, TAREAS
   ========================================================================== */
function initCurrencyWidget() {
  const fromSel = $('#currency-from');
  const toSel = $('#currency-to');
  if (!fromSel || !toSel) return;

  const opts = SUPPORTED_CURRENCIES.map(
    (c) => `<option value="${c.code}">${c.code} - ${c.name}</option>`
  ).join('');
  fromSel.innerHTML = opts;
  toSel.innerHTML = opts;
  fromSel.value = state.currencyFrom;
  toSel.value = state.currencyTo;
  updateCurrencyConversion();
}

async function fetchExchangeRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        state.ratesUSD = { ...FALLBACK_RATES_USD, ...data.rates };
        updateCurrencyConversion();
        renderFinanceModule();
        updatePulseWidget();
      }
    }
  } catch (_) {}
}

function updateCurrencyConversion() {
  const from = $('#currency-from').value || state.currencyFrom;
  const to = $('#currency-to').value || state.currencyTo;
  const amount = parseFloat($('#currency-amount-input').value) || 0;

  state.currencyFrom = from;
  state.currencyTo = to;

  const unitRate = convertCurrency(1, from, to);
  const converted = convertCurrency(amount, from, to);

  $('#currency-from-code').textContent = from;
  $('#rate-label').textContent = `1 ${from} equivale a`;
  $('#exchange-rate-value').textContent = `${unitRate.toFixed(4)} ${to}`;
  $('#currency-output').textContent = formatMoney(converted, to);
}

function renderPomodoro() {
  const mins = Math.floor(state.pomodoro.remainingSecs / 60);
  const secs = state.pomodoro.remainingSecs % 60;
  $('#pomo-display').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  $('#pomo-sessions-pill').textContent = `${state.pomodoro.sessionsToday} sesiones`;

  const total = state.pomodoro.durationMins * 60;
  const pct = total > 0 ? Math.max(0, Math.min(100, (state.pomodoro.remainingSecs / total) * 100)) : 100;
  $('#pomo-progress-bar').style.width = `${pct}%`;
  $('#pomo-toggle-btn').textContent = state.pomodoro.running ? 'Pausar' : 'Iniciar';
}

function togglePomodoro() {
  if (state.pomodoro.running) {
    clearInterval(state.pomodoro.intervalId);
    state.pomodoro.running = false;
    renderPomodoro();
    return;
  }

  state.pomodoro.running = true;
  renderPomodoro();
  state.pomodoro.intervalId = setInterval(() => {
    if (state.pomodoro.remainingSecs > 0) {
      state.pomodoro.remainingSecs -= 1;
      renderPomodoro();
    } else {
      clearInterval(state.pomodoro.intervalId);
      state.pomodoro.running = false;
      state.pomodoro.sessionsToday += 1;
      state.pomodoro.sessionsDate = todayISO();
      state.pomodoro.remainingSecs = state.pomodoro.durationMins * 60;
      saveLocalPrefs();
      renderPomodoro();
      showToast('Sesión Pomodoro completada.');
    }
  }, 1000);
}

function renderHabits() {
  const list = $('#habits-list');
  if (!list) return;
  const doneCount = state.habits.filter((h) => h.done).length;
  const total = state.habits.length;
  $('#habits-counter').textContent = `${doneCount}/${total}`;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  $('#habits-progress-bar').style.width = `${pct}%`;

  list.innerHTML = '';
  state.habits.forEach((h) => {
    const li = document.createElement('li');
    if (h.done) li.classList.add('completed');
    li.innerHTML = `
      <label style="display:flex; align-items:center; gap:0.55rem; cursor:pointer; flex:1; min-width:0;">
        <input type="checkbox" data-habit-toggle="${h.id}" ${h.done ? 'checked' : ''} style="width:auto; accent-color:var(--accent);" />
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(h.title)}</span>
      </label>
      <button type="button" class="icon-btn" data-habit-del="${h.id}" title="Eliminar">${ICONS.close}</button>
    `;
    list.appendChild(li);
  });
}

function renderScratchpad() {
  const input = $('#quick-scratchpad-input');
  if (input) input.value = state.scratchpad || '';
}

function renderLinks() {
  const grid = $('#links-grid');
  if (!grid) return;
  $('#links-counter').textContent = `${state.links.length} links`;
  grid.innerHTML = '';

  if (!state.links.length) {
    grid.innerHTML = '<p class="muted-text" style="grid-column:1/-1;">Agrega tus sitios frecuentes abajo.</p>';
    return;
  }

  state.links.forEach((lk) => {
    const tile = document.createElement('div');
    tile.className = 'link-tile';
    tile.innerHTML = `
      <a href="${escapeHTML(lk.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(lk.url)}">
        ${escapeHTML(lk.title)}
      </a>
      <button type="button" class="icon-btn" style="min-width:22px; height:22px; padding:0;" data-link-del="${lk.id}" title="Quitar">${ICONS.close}</button>
    `;
    grid.appendChild(tile);
  });
}

function renderTodos() {
  const list = $('#todo-list');
  if (!list) return;
  const activeCount = state.todos.filter((t) => !t.done).length;
  $('#todo-counter').textContent = `${activeCount} pendientes`;

  list.innerHTML = '';
  state.todos.forEach((t) => {
    const li = document.createElement('li');
    if (t.done) li.classList.add('completed');
    li.innerHTML = `
      <label style="display:flex; align-items:center; gap:0.55rem; cursor:pointer; flex:1; min-width:0;">
        <input type="checkbox" data-todo-toggle="${t.id}" ${t.done ? 'checked' : ''} style="width:auto; accent-color:var(--accent);" />
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(t.text)}</span>
      </label>
      <button type="button" class="icon-btn" data-todo-del="${t.id}" title="Eliminar">${ICONS.close}</button>
    `;
    list.appendChild(li);
  });

  updatePulseWidget();
}

function renderReminders() {
  const list = $('#reminder-list');
  if (!list) return;

  const sorted = [...state.reminders].sort((a, b) => new Date(a.date) - new Date(b.date));
  list.innerHTML = '';

  if (!sorted.length) {
    list.innerHTML = '<li class="muted-text">Sin recordatorios programados.</li>';
    updatePulseWidget();
    return;
  }

  sorted.forEach((rem) => {
    const dt = new Date(rem.date);
    const label = isNaN(dt.getTime())
      ? rem.date
      : dt.toLocaleString('es-HN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="min-width:0; flex:1;">
        <div style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(rem.title)}</div>
        <div class="muted-text" style="font-size:0.76rem;">${escapeHTML(label)}</div>
      </div>
      <button type="button" class="icon-btn" data-rem-del="${rem.id}" title="Eliminar">${ICONS.close}</button>
    `;
    list.appendChild(li);
  });

  updatePulseWidget();
}

function updatePulseWidget() {
  const netHNL = state.accounts.reduce(
    (acc, a) => acc + convertCurrency(a.balance, a.currency || 'HNL', 'HNL'),
    0
  );
  const pulseNet = $('#pulse-networth');
  if (pulseNet) pulseNet.textContent = formatMoney(netHNL, 'HNL');

  const activeTodos = state.todos.filter((t) => !t.done).length;
  const pulseTodos = $('#pulse-todos');
  if (pulseTodos) pulseTodos.textContent = `${activeTodos} activas`;

  const now = Date.now();
  const upcoming = [
    ...state.reminders.map((r) => ({ title: r.title, time: new Date(r.date).getTime() })),
    ...state.calendarEvents.map((ev) => ({ title: ev.title, time: new Date(ev.start).getTime() }))
  ]
    .filter((item) => Number.isFinite(item.time) && item.time >= now - 3600000)
    .sort((a, b) => a.time - b.time);

  const pulseNext = $('#pulse-next-event');
  if (pulseNext) {
    pulseNext.textContent = upcoming.length ? upcoming[0].title : 'Sin pendientes próximos';
  }
}

/* ==========================================================================
   10. PANEL DE VIDA (GMAIL, OUTLOOK Y APPLE CALENDAR .ICS)
   ========================================================================== */
function renderLifeModule() {
  $('#google-client-id-input').value = state.googleClientId || '';
  $('#outlook-client-id-input').value = state.outlookClientId || '';

  $('#google-status-pill').textContent = state.googleToken ? 'Google · Conectado' : 'Google · Desconectado';
  $('#outlook-status-pill').textContent = state.outlookToken ? 'Outlook · Conectado' : 'Outlook · Desconectado';
  $('#ics-status-pill').textContent = state.icsSources.length
    ? `Apple .ics · ${state.icsSources.length} vinculado(s)`
    : 'Apple .ics · Sin vincular';

  $('#sync-google-btn').classList.toggle('hidden', !state.googleToken && !state.outlookToken && !state.icsSources.length);

  const icsList = $('#ics-sources-list');
  icsList.innerHTML = '';
  state.icsSources.forEach((src) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${escapeHTML(src.name || src.url)}</span>
      <button type="button" class="icon-btn" data-ics-del="${src.id}">${ICONS.close}</button>
    `;
    icsList.appendChild(li);
  });

  const mailList = $('#gmail-list');
  const filteredMails = state.mails.filter(
    (m) => state.mailFilter === 'ALL' || m.source === state.mailFilter
  );
  mailList.innerHTML = '';
  if (!filteredMails.length) {
    mailList.innerHTML = '<li class="muted-text">Conecta Gmail o Outlook para ver tus mensajes recientes.</li>';
  } else {
    filteredMails.forEach((m) => {
      const badgeCls = m.source === 'outlook' ? 'badge-outlook' : 'badge-gmail';
      const li = document.createElement('li');
      li.innerHTML = `
        <div style="min-width:0; flex:1;">
          <div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:0.15rem;">
            <span class="source-badge ${badgeCls}">${escapeHTML(m.source)}</span>
            <strong style="font-size:0.82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(m.from)}</strong>
          </div>
          <div class="muted-text" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(m.subject)}</div>
        </div>
      `;
      mailList.appendChild(li);
    });
  }

  const calList = $('#calendar-events-list');
  const now = Date.now() - 3600000;
  const filteredEvents = state.calendarEvents
    .filter((ev) => new Date(ev.start).getTime() >= now)
    .filter((ev) => state.calFilter === 'ALL' || ev.source === state.calFilter)
    .sort((a, b) => new Date(a.start) - new Date(b.start));

  $('#calendar-count-pill').textContent = `${filteredEvents.length} próximos`;
  calList.innerHTML = '';
  if (!filteredEvents.length) {
    calList.innerHTML = '<li class="muted-text">Sin eventos próximos. Vincula Google Calendar, Outlook o tu enlace .ics de Apple.</li>';
  } else {
    filteredEvents.slice(0, 25).forEach((ev) => {
      const dt = new Date(ev.start);
      const timeStr = isNaN(dt.getTime())
        ? ev.start
        : dt.toLocaleString('es-HN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      const badgeMap = { apple: 'badge-apple', outlook: 'badge-outlook', google: 'badge-google' };
      const li = document.createElement('li');
      li.innerHTML = `
        <div style="min-width:0; flex:1;">
          <div style="display:flex; align-items:center; gap:0.45rem;">
            <span class="source-badge ${badgeMap[ev.source] || 'badge-google'}">${escapeHTML(ev.source)}</span>
            <strong style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(ev.title)}</strong>
          </div>
          <div class="muted-text" style="font-size:0.76rem; margin-top:0.15rem;">${escapeHTML(timeStr)}${ev.location ? ` · ${escapeHTML(ev.location)}` : ''}</div>
        </div>
      `;
      calList.appendChild(li);
    });
  }

  updatePulseWidget();
}

function connectGoogleAccount() {
  if (!state.googleClientId) {
    $('#google-config-panel').classList.remove('hidden');
    showToast('Ingresa primero tu Google OAuth Client ID.');
    return;
  }
  if (!window.google?.accounts?.oauth2) {
    showToast('Cargando librería de Google, intenta en 2 segundos.');
    return;
  }

  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: state.googleClientId,
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly',
    callback: async (resp) => {
      if (resp && resp.access_token) {
        state.googleToken = resp.access_token;
        await syncGoogleData();
        renderLifeModule();
        showToast('Google conectado y sincronizado.');
      }
    }
  });
  client.requestAccessToken();
}

async function syncGoogleData() {
  if (!state.googleToken) return;
  const headers = { Authorization: `Bearer ${state.googleToken}` };

  try {
    const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8', { headers });
    const listData = await listRes.json();
    const msgs = listData.messages || [];
    const fetchedMails = [];
    for (const m of msgs.slice(0, 6)) {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        { headers }
      );
      const detail = await detailRes.json();
      const hdrs = detail.payload?.headers || [];
      const from = hdrs.find((h) => h.name === 'From')?.value || 'Remitente';
      const subject = hdrs.find((h) => h.name === 'Subject')?.value || '(Sin asunto)';
      fetchedMails.push({ id: m.id, source: 'gmail', from: from.replace(/<.*>/, '').trim(), subject });
    }
    state.mails = [...state.mails.filter((m) => m.source !== 'gmail'), ...fetchedMails];
  } catch (_) {}

  try {
    const timeMin = new Date().toISOString();
    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=15&singleEvents=true&orderBy=startTime`,
      { headers }
    );
    const calData = await calRes.json();
    const evs = (calData.items || []).map((item) => ({
      id: item.id,
      source: 'google',
      title: item.summary || 'Evento sin título',
      start: item.start?.dateTime || item.start?.date || '',
      location: item.location || ''
    }));
    state.calendarEvents = [...state.calendarEvents.filter((e) => e.source !== 'google'), ...evs];
  } catch (_) {}
}

function parseICSContent(icsText, sourceLabel = 'apple') {
  const events = [];
  const blocks = icsText.split('BEGIN:VEVENT').slice(1);

  blocks.forEach((blk, idx) => {
    const endIdx = blk.indexOf('END:VEVENT');
    const body = endIdx !== -1 ? blk.slice(0, endIdx) : blk;
    const unfolded = body.replace(/\r?\n[ \t]/g, '');

    const summaryMatch = unfolded.match(/SUMMARY(?:;[^:]*)?:([^\r\n]+)/i);
    const startMatch = unfolded.match(/DTSTART(?:;[^:]*)?:([^\r\n]+)/i);
    const locMatch = unfolded.match(/LOCATION(?:;[^:]*)?:([^\r\n]+)/i);

    if (summaryMatch && startMatch) {
      const rawStart = startMatch[1].trim();
      let isoStart = rawStart;
      const m = rawStart.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
      if (m) {
        const [, y, mo, d, h = '09', mi = '00', s = '00', z = ''] = m;
        isoStart = `${y}-${mo}-${d}T${h}:${mi}:${s}${z}`;
      }
      events.push({
        id: `ics-${idx}-${Date.now()}`,
        source: sourceLabel,
        title: summaryMatch[1].replace(/\\,/g, ',').replace(/\\n/g, ' ').trim(),
        start: isoStart,
        location: locMatch ? locMatch[1].replace(/\\,/g, ',').trim() : ''
      });
    }
  });

  return events;
}

async function refreshIcsSources() {
  if (!state.icsSources.length) return;
  let allParsed = [];

  for (const src of state.icsSources) {
    if (src.rawText) {
      allParsed.push(...parseICSContent(src.rawText, 'apple'));
      continue;
    }
    if (!src.url) continue;
    const cleanUrl = src.url.replace(/^webcal:\/\//i, 'https://');
    const candidates = [
      cleanUrl,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`
    ];
    for (const u of candidates) {
      try {
        const res = await fetch(u, { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          if (text.includes('BEGIN:VCALENDAR')) {
            allParsed.push(...parseICSContent(text, 'apple'));
            break;
          }
        }
      } catch (_) {}
    }
  }

  state.calendarEvents = [...state.calendarEvents.filter((e) => e.source !== 'apple'), ...allParsed];
  renderLifeModule();
}

/* ==========================================================================
   11. ASESOR FINANCIERO PERSONAL (CONECTADO A SUPABASE + EXTRAS PRO)
   ========================================================================== */
function injectFinanceBackupControls() {
  const bar = $('#finance-period-filters');
  if (!bar || $('#fin-export-json-btn')) return;

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.id = 'fin-export-json-btn';
  exportBtn.className = 'nav-pill';
  exportBtn.title = 'Exportar estado financiero en JSON';
  exportBtn.textContent = 'Exportar JSON';
  exportBtn.addEventListener('click', () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      financeCurrency: state.financeCurrency,
      accounts: state.accounts,
      categories: state.categories,
      transactions: state.transactions,
      plannedPayments: state.plannedPayments
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zen-deck-finanzas-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Respaldo financiero exportado.');
  });

  bar.appendChild(exportBtn);
}

async function ensureValidCategoryId(catId, type = 'expense') {
  if (isUUID(catId)) return catId;
  const catObj = state.categories.find((c) => c.id === catId);
  if (!catObj || !state.user) return null;

  try {
    const { data, error } = await sb
      .from('finance_categories')
      .insert({
        user_id: state.user.id,
        name: catObj.name,
        type: catObj.type || type,
        color: catObj.color || '#38bdf8'
      })
      .select()
      .single();

    if (!error && data) {
      catObj.id = data.id;
      return data.id;
    }
  } catch (_) {}
  return null;
}

function getFilteredTransactions() {
  const days = state.financePeriod;
  if (days === 'ALL') return [...state.transactions];
  const cutoff = Date.now() - Number(days) * 86400000;
  return state.transactions.filter((tx) => new Date(`${tx.date}T12:00:00`).getTime() >= cutoff);
}

function renderFinanceModule() {
  const dispCur = state.financeCurrency || 'HNL';
  if ($('#finance-display-currency')) $('#finance-display-currency').value = dispCur;

  // Sincronizar botón activo de periodo
  $$('#finance-period-filters .nav-pill[data-days]').forEach((b) => {
    b.classList.toggle('active', b.dataset.days === String(state.financePeriod));
  });

  const periodLabels = {
    '7': 'ÚLTIMOS 7D',
    '30': 'ÚLTIMOS 30D',
    '90': 'ÚLTIMOS 90D',
    '365': 'ÚLTIMO AÑO',
    ALL: 'HISTÓRICO'
  };
  const pLabel = periodLabels[state.financePeriod] || 'ÚLTIMOS 30D';
  $('#fin-cashflow-period-label').textContent = pLabel;
  $('#fin-donut-period-label').textContent = pLabel;

  // 1. Patrimonio neto + desglose multimoneda
  const netWorth = state.accounts.reduce(
    (sum, acc) => sum + convertCurrency(acc.balance, acc.currency || 'HNL', dispCur),
    0
  );
  const byCurrency = {};
  state.accounts.forEach((acc) => {
    const c = acc.currency || 'HNL';
    byCurrency[c] = (byCurrency[c] || 0) + (Number(acc.balance) || 0);
  });
  const breakdownStr = Object.entries(byCurrency)
    .map(([c, val]) => formatMoney(val, c))
    .join(' · ');

  $('#fin-kpi-accounts-count').textContent = breakdownStr
    ? `${state.accounts.length} cuentas · ${breakdownStr}`
    : `${state.accounts.length} cuentas`;
  $('#fin-kpi-networth').textContent = formatMoney(netWorth, dispCur);
  renderNetWorthChart(netWorth, dispCur);

  // 2. Flujo de efectivo
  const txs = getFilteredTransactions();
  let income = 0;
  let expense = 0;
  txs.forEach((tx) => {
    const amt = convertCurrency(tx.amount, tx.currency || 'HNL', dispCur);
    if (tx.type === 'income') income += amt;
    else expense += amt;
  });

  const netFlow = income - expense;
  $('#fin-cashflow-net').textContent = `${netFlow >= 0 ? '+' : '-'}${formatMoney(Math.abs(netFlow), dispCur)}`;
  $('#fin-cashflow-income-val').textContent = formatMoney(income, dispCur);
  $('#fin-cashflow-expense-val').textContent = formatMoney(expense, dispCur);

  const maxBar = Math.max(income, expense, 1);
  $('#fin-cashflow-income-bar').style.width = `${Math.round((income / maxBar) * 100)}%`;
  $('#fin-cashflow-expense-bar').style.width = `${Math.round((expense / maxBar) * 100)}%`;

  // 3. Perspectiva y proyección de liquidez
  let plannedImpact = 0;
  state.plannedPayments.forEach((p) => {
    const val = convertCurrency(p.amount, p.currency || 'USD', dispCur);
    plannedImpact += p.type === 'income' ? val : -val;
  });
  const projectedNet = netWorth + plannedImpact;
  $('#fin-prev-compare-badge').textContent = `${txs.length} mov.`;
  $('#fin-perspective-val').textContent = `${plannedImpact >= 0 ? '+' : '-'}${formatMoney(Math.abs(plannedImpact), dispCur)}`;
  $('#fin-perspective-sub').textContent = `Impacto de ${state.plannedPayments.length} planificados · Proyección: ${formatMoney(projectedNet, dispCur)}`;
  $('#fin-prev-compare-val').textContent = formatMoney(income, dispCur);

  if (income > 0) {
    const savingsRate = Math.round(((income - expense) / income) * 100);
    $('#fin-advisor-tip').textContent =
      savingsRate >= 20
        ? `Tasa de ahorro saludable (${savingsRate}%). Mantienes margen positivo.`
        : `Tasa de ahorro actual: ${savingsRate}%. Revisa tus gastos recurrentes.`;
  } else if (expense > 0) {
    $('#fin-advisor-tip').textContent = `Gastos del periodo: ${formatMoney(expense, dispCur)} sin ingresos registrados aún.`;
  } else {
    $('#fin-advisor-tip').textContent = 'Registra tus cuentas y movimientos para recibir métricas.';
  }

  // 4. Donut de gastos
  renderExpenseDonut(txs, dispCur);

  // 5. Selectores de formularios
  populateFinanceSelects();

  // 6. Cuentas
  const accList = $('#fin-accounts-list');
  accList.innerHTML = '';
  state.accounts.forEach((acc) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="min-width:0; flex:1;">
        <div style="font-weight:600;">${escapeHTML(acc.name)}</div>
        <div class="muted-text" style="font-size:0.76rem;">${escapeHTML(acc.type)} · ${escapeHTML(acc.currency)}</div>
      </div>
      <strong>${formatMoney(acc.balance, acc.currency)}</strong>
      <button type="button" class="icon-btn" data-acc-del="${acc.id}">${ICONS.close}</button>
    `;
    accList.appendChild(li);
  });

  // 7. Categorías gestionables (solo las guardadas en DB)
  const catList = $('#fin-categories-manage-list');
  catList.innerHTML = '';
  state.categories
    .filter((c) => isUUID(c.id))
    .forEach((c) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${escapeHTML(c.name)} <small class="muted-text">(${c.type === 'income' ? 'Ingreso' : 'Gasto'})</small></span>
        <button type="button" class="icon-btn" data-cat-del="${c.id}">${ICONS.close}</button>
      `;
      catList.appendChild(li);
    });

  // 8. Pagos planificados
  renderPlannedPayments();

  // 9. Historial de movimientos
  const histList = $('#fin-transactions-list');
  const sortedTxs = [...txs].sort((a, b) => new Date(b.date) - new Date(a.date));
  $('#fin-history-count').textContent = String(sortedTxs.length);
  histList.innerHTML = '';

  if (!sortedTxs.length) {
    histList.innerHTML = '<li class="muted-text">No hay movimientos registrados en este periodo.</li>';
  } else {
    sortedTxs.forEach((tx) => {
      const cat = state.categories.find((c) => c.id === tx.categoryId)?.name || 'General';
      const acc = state.accounts.find((a) => a.id === tx.accountId)?.name || 'Cuenta';
      const isInc = tx.type === 'income';
      const li = document.createElement('li');
      li.innerHTML = `
        <div style="min-width:0; flex:1;">
          <div style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(tx.description)}</div>
          <div class="muted-text" style="font-size:0.76rem;">${escapeHTML(cat)} · ${escapeHTML(acc)} · ${escapeHTML(tx.date)}</div>
        </div>
        <strong class="${isInc ? 'amt-income' : 'amt-expense'}">${isInc ? '+' : '-'}${formatMoney(tx.amount, tx.currency || 'HNL')}</strong>
        <button type="button" class="icon-btn" data-tx-del="${tx.id}">${ICONS.trash}</button>
      `;
      histList.appendChild(li);
    });
  }

  updatePulseWidget();
}

function renderNetWorthChart(currentVal, dispCur) {
  const svg = $('#fin-trend-svg');
  if (!svg) return;

  // Reconstruir evolución real hacia atrás a partir del historial de movimientos
  const sortedDesc = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const snapshots = [currentVal];
  let running = currentVal;

  sortedDesc.slice(0, 8).forEach((tx) => {
    const val = convertCurrency(tx.amount, tx.currency || 'HNL', dispCur);
    running = tx.type === 'income' ? running - val : running + val;
    snapshots.unshift(Math.max(0, running));
  });

  while (snapshots.length < 6) {
    snapshots.unshift(snapshots[0] ?? currentVal);
  }

  const minV = Math.min(...snapshots);
  const maxV = Math.max(...snapshots);
  const span = Math.max(maxV - minV, 1);

  const pts = snapshots.map((v, i) => {
    const x = Math.round((i / (snapshots.length - 1)) * 540);
    const norm = maxV === minV ? 0.55 : (v - minV) / span;
    const y = currentVal <= 0 ? 138 : Math.round(132 - norm * 92);
    return { x, y };
  });

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${line} L 540 160 L 0 160 Z`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="zenNetGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.34" />
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0" />
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#zenNetGrad)" />
    <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round" />
  `;
}

function renderExpenseDonut(txs, dispCur) {
  const svg = $('#fin-donut-svg');
  const legend = $('#fin-donut-legend');
  const totalEl = $('#fin-donut-total');
  if (!svg || !legend || !totalEl) return;

  const expenses = txs.filter((t) => t.type === 'expense');
  const groups = {};

  expenses.forEach((tx) => {
    const val = convertCurrency(tx.amount, tx.currency || 'HNL', dispCur);
    const key =
      state.donutMode === 'recurring'
        ? tx.recurring
          ? 'Recurrentes'
          : 'Variables'
        : state.categories.find((c) => c.id === tx.categoryId)?.name || 'Otros';
    groups[key] = (groups[key] || 0) + val;
  });

  const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  totalEl.textContent = formatMoney(total, dispCur);

  const palette = ['#38bdf8', '#10b981', '#fbbf24', '#818cf8', '#f43f5e', '#2dd4bf'];
  const r = 74;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  if (!entries.length || total <= 0) {
    svg.innerHTML = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="22" />`;
    legend.innerHTML = '<span class="muted-text" style="grid-column:1/-1; text-align:center;">Sin gastos en este periodo</span>';
    return;
  }

  svg.innerHTML = entries
    .map(([, val], idx) => {
      const dash = (val / total) * circ;
      const color = palette[idx % palette.length];
      const seg = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${color}" stroke-width="22" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-offset}" />`;
      offset += dash;
      return seg;
    })
    .join('');

  legend.innerHTML = entries
    .slice(0, 6)
    .map(([name, val], idx) => {
      const pct = Math.round((val / total) * 100);
      const color = palette[idx % palette.length];
      return `
        <div class="donut-legend-item">
          <span style="display:flex; align-items:center; gap:0.35rem; min-width:0;">
            <i class="legend-dot" style="background:${color};"></i>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(name)}</span>
          </span>
          <strong>${pct}%</strong>
        </div>
      `;
    })
    .join('');
}

function populateFinanceSelects() {
  const txType = $('#fin-tx-type')?.value || 'expense';
  const filteredCats = state.categories.filter((c) => c.type === txType);
  const catOpts = filteredCats
    .map((c) => `<option value="${c.id}">${escapeHTML(c.name)}</option>`)
    .join('');

  if ($('#fin-tx-category')) $('#fin-tx-category').innerHTML = catOpts || '<option value="">Sin categoría</option>';
  if ($('#fin-plan-category')) {
    $('#fin-plan-category').innerHTML = state.categories
      .map((c) => `<option value="${c.id}">${escapeHTML(c.name)}</option>`)
      .join('');
  }

  const accOpts = state.accounts.length
    ? state.accounts.map((a) => `<option value="${a.id}">${escapeHTML(a.name)} (${a.currency})</option>`).join('')
    : '<option value="">Crea una cuenta primero</option>';

  if ($('#fin-tx-account')) $('#fin-tx-account').innerHTML = accOpts;
  if ($('#fin-plan-account')) $('#fin-plan-account').innerHTML = accOpts;
  if ($('#confirm-plan-account')) $('#confirm-plan-account').innerHTML = accOpts;
}

function renderPlannedPayments() {
  const list = $('#fin-planned-list');
  if (!list) return;

  const filtered = state.plannedPayments
    .filter((p) => state.plannedTypeFilter === 'ALL' || p.type === state.plannedTypeFilter)
    .filter((p) => !state.plannedSearch || p.title.toLowerCase().includes(state.plannedSearch.toLowerCase()))
    .sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));

  list.innerHTML = '';
  if (!filtered.length) {
    list.innerHTML = '<li class="muted-text">No hay pagos o ingresos planificados.</li>';
    return;
  }

  filtered.forEach((p) => {
    const isInc = p.type === 'income';
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="min-width:0; flex:1;">
        <div style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(p.title)}</div>
        <div class="muted-text" style="font-size:0.75rem;">${escapeHTML(p.frequency)} · Próx: ${escapeHTML(p.nextDate)}</div>
      </div>
      <strong class="${isInc ? 'amt-income' : 'amt-expense'}">${formatMoney(p.amount, p.currency)}</strong>
      <button type="button" class="icon-btn" data-plan-confirm="${p.id}" title="Aplicar ahora">${ICONS.check}</button>
      <button type="button" class="icon-btn" data-plan-del="${p.id}" title="Eliminar">${ICONS.close}</button>
    `;
    list.appendChild(li);
  });
}

function updateConfirmConversionPreview() {
  const plan = state.plannedPayments.find((p) => p.id === $('#confirm-plan-id').value);
  const noteEl = $('#confirm-plan-conversion-note');
  if (!plan || !noteEl) return;

  const realAmt = parseFloat($('#confirm-plan-real-amount').value) || plan.amount;
  const acc = state.accounts.find((a) => a.id === $('#confirm-plan-account').value);
  if (!acc || acc.currency === plan.currency) {
    noteEl.textContent = '';
    return;
  }
  const converted = convertCurrency(realAmt, plan.currency, acc.currency);
  noteEl.textContent = `Se aplicarán ${formatMoney(converted, acc.currency)} en la cuenta ${acc.name}.`;
}

function advancePlannedDate(dateStr, freq) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return todayISO();
  if (freq === 'quincenal') d.setDate(d.getDate() + 15);
  else if (freq === 'trimestral') d.setMonth(d.getMonth() + 3);
  else if (freq === 'semestral') d.setMonth(d.getMonth() + 6);
  else if (freq === 'anual') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

/* ==========================================================================
   12. PARLEYS & PROBABILIDADES (BASE — SE AMPLIARÁ EN EL PASO 3)
   ========================================================================== */
async function loadParleys() {
  const updEl = $('#parleys-last-update');
  if (updEl) updEl.textContent = 'Sincronizando partidos y cuotas...';

  let loadedMatches = [];
  let loadedAuto = [];
  let updatedLabel = '';

  try {
    const res = await fetch(`./parleys.json?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const rawMatches = Array.isArray(json.matches) ? json.matches : [];
      const cutoff = Date.now() - 6 * 3600000;
      loadedMatches = rawMatches.filter((m) => {
        const ts = new Date(m.date || m.kickoff || m.startTime).getTime();
        return Number.isFinite(ts) && ts >= cutoff;
      });
      loadedAuto = Array.isArray(json.recommended_parleys) ? json.recommended_parleys : [];
      updatedLabel = json.updated_at || '';
    }
  } catch (_) {}

  if (!loadedMatches.length) {
    loadedMatches = await fetchLiveFixturesFromESPN();
    updatedLabel = new Date().toLocaleString('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  state.parleysMatches = loadedMatches;
  state.autoParleys = loadedAuto.length ? loadedAuto : buildSmartAutoParleys(loadedMatches);
  state.parleysUpdatedAt = updatedLabel;

  if (updEl) {
    updEl.textContent = `Actualizado: ${updatedLabel || new Date().toLocaleString('es-HN')}`;
  }

  renderParleysModule();
}

async function fetchLiveFixturesFromESPN() {
  const start = new Date();
  const end = new Date(Date.now() + 7 * 86400000);
  const fmt = (d) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const range = `${fmt(start)}-${fmt(end)}`;

  const requests = ESPN_LEAGUES.map(async (lg) => {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${lg.slug}/scoreboard?dates=${range}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      const events = data.events || [];

      return events
        .filter((ev) => ev.status?.type?.state !== 'post')
        .map((ev) => {
          const comp = ev.competitions?.[0];
          const competitors = comp?.competitors || [];
          const home = competitors.find((c) => c.homeAway === 'home') || competitors[0];
          const away = competitors.find((c) => c.homeAway === 'away') || competitors[1];
          if (!home || !away) return null;

          const homeName = home.team?.shortDisplayName || home.team?.displayName || 'Local';
          const awayName = away.team?.shortDisplayName || away.team?.displayName || 'Visita';

          const seed = (homeName.length * 7 + awayName.length * 5) % 24;
          const pHome = 36 + seed;
          const pDraw = 26;
          const pAway = Math.max(15, 100 - pHome - pDraw);
          const toOdd = (prob) => Number(Math.max(1.12, (100 / Math.max(prob, 8)) * 0.94).toFixed(2));

          return {
            id: String(ev.id),
            league: lg.name,
            date: ev.date,
            home: homeName,
            away: awayName,
            odds: { home: toOdd(pHome), draw: toOdd(pDraw), away: toOdd(pAway) },
            probabilities: { home: pHome, draw: pDraw, away: pAway }
          };
        })
        .filter(Boolean);
    } catch (_) {
      return [];
    }
  });

  const nested = await Promise.all(requests);
  const flat = nested.flat();
  const seen = new Set();
  return flat
    .filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function buildSmartAutoParleys(matches) {
  if (matches.length < 2) return [];
  const bestLegs = matches.map((m) => {
    const pH = m.probabilities?.home || 40;
    const pA = m.probabilities?.away || 30;
    const pickHome = pH >= pA;
    return {
      matchId: m.id,
      matchLabel: `${m.home} vs ${m.away}`,
      pick: pickHome ? '1' : '2',
      pickLabel: pickHome ? m.home : m.away,
      odd: pickHome ? m.odds.home : m.odds.away,
      prob: pickHome ? pH : pA
    };
  });

  const sortedByProb = [...bestLegs].sort((a, b) => b.prob - a.prob);
  const buildPack = (title, tag, legs) => {
    if (!legs.length) return null;
    const odd = legs.reduce((acc, l) => acc * l.odd, 1);
    const prob = Math.round(legs.reduce((acc, l) => acc * (l.prob / 100), 1) * 100);
    return { title, tag, odd: Number(odd.toFixed(2)), prob, legs };
  };

  return [
    buildPack('Selección Alta Probabilidad', 'Conservador', sortedByProb.slice(0, 3)),
    buildPack('Combinada Balanceada', 'Equilibrado', sortedByProb.slice(1, 5))
  ].filter(Boolean);
}

function filterParleyMatches() {
  const now = new Date();
  const todayStr = todayISO();
  const tmr = new Date(now.getTime() + 86400000);
  const tomorrowStr = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, '0')}-${String(tmr.getDate()).padStart(2, '0')}`;
  const weekCutoff = now.getTime() + 7 * 86400000;

  return state.parleysMatches.filter((m) => {
    if (state.selectedLeague !== 'ALL' && m.league !== state.selectedLeague) return false;
    const dt = new Date(m.date);
    if (isNaN(dt.getTime())) return true;
    const localDay = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    if (state.customParleyDate) return localDay === state.customParleyDate;
    if (state.selectedDateFilter === 'TODAY') return localDay === todayStr;
    if (state.selectedDateFilter === 'TOMORROW') return localDay === tomorrowStr;
    if (state.selectedDateFilter === 'WEEK') return dt.getTime() <= weekCutoff;
    return true;
  });
}

function renderParleysModule() {
  const autoGrid = $('#auto-parleys-grid');
  autoGrid.innerHTML = '';
  state.autoParleys.forEach((ap, idx) => {
    const card = document.createElement('article');
    card.className = 'glass-card parley-card hover-glass';
    card.innerHTML = `
      <div class="widget-header">
        <strong>${escapeHTML(ap.title)}</strong>
        <span class="glass-pill high-prob">${escapeHTML(ap.tag)}</span>
      </div>
      <ul class="glass-list" style="max-height:135px;">
        ${ap.legs
          .map(
            (l) => `
          <li>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(l.matchLabel)} · <strong>${escapeHTML(l.pickLabel)}</strong></span>
            <span class="odd-val">${Number(l.odd).toFixed(2)}x</span>
          </li>`
          )
          .join('')}
      </ul>
      <div class="bar-label-row">
        <span class="muted-text">Prob: <strong>${ap.prob}%</strong> · Momio: <strong class="odd-val">${ap.odd}x</strong></span>
        <button type="button" class="glass-btn primary" data-load-autoparley="${idx}">Cargar</button>
      </div>
    `;
    autoGrid.appendChild(card);
  });

  const grid = $('#matches-list-grid');
  const matches = filterParleyMatches();
  grid.innerHTML = '';

  if (!matches.length) {
    grid.innerHTML = `
      <div class="glass-card match-card" style="grid-column:1/-1;">
        <p class="muted-text">No hay partidos disponibles para esta liga o fecha seleccionada.</p>
      </div>
    `;
  } else {
    matches.forEach((m) => {
      const dt = new Date(m.date);
      const timeLabel = isNaN(dt.getTime())
        ? ''
        : dt.toLocaleString('es-HN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

      const sel = state.slip.find((s) => s.matchId === m.id);
      const card = document.createElement('article');
      card.className = 'glass-card match-card hover-glass';
      card.innerHTML = `
        <div class="bar-label-row">
          <span class="glass-pill">${escapeHTML(m.league)}</span>
          <span class="muted-text" style="font-size:0.76rem;">${escapeHTML(timeLabel)}</span>
        </div>
        <div style="font-weight:700; font-size:0.95rem;">
          ${escapeHTML(m.home)} <span class="muted-text">vs</span> ${escapeHTML(m.away)}
        </div>
        <div class="odds-row">
          <button type="button" class="odd-chip ${sel?.pick === '1' ? 'selected' : ''}" data-pick-match="${m.id}" data-pick="1">
            <span>Local (${m.probabilities?.home || 40}%)</span>
            <strong class="odd-val">${Number(m.odds.home).toFixed(2)}</strong>
          </button>
          <button type="button" class="odd-chip ${sel?.pick === 'X' ? 'selected' : ''}" data-pick-match="${m.id}" data-pick="X">
            <span>Empate (${m.probabilities?.draw || 27}%)</span>
            <strong class="odd-val">${Number(m.odds.draw).toFixed(2)}</strong>
          </button>
          <button type="button" class="odd-chip ${sel?.pick === '2' ? 'selected' : ''}" data-pick-match="${m.id}" data-pick="2">
            <span>Visita (${m.probabilities?.away || 33}%)</span>
            <strong class="odd-val">${Number(m.odds.away).toFixed(2)}</strong>
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  renderSlip();
}

function renderSlip() {
  const list = $('#slip-legs-list');
  list.innerHTML = '';

  if (!state.slip.length) {
    list.innerHTML = '<li class="muted-text">Selecciona cuotas de los partidos para armar tu boleto.</li>';
    $('#slip-prob').textContent = '0%';
    $('#slip-odd').textContent = '1.00x';
    const cur = $('#slip-currency').value || 'HNL';
    $('#slip-payout').textContent = formatMoney(0, cur);
    return;
  }

  let totalOdd = 1;
  let combinedProb = 1;

  state.slip.forEach((leg) => {
    totalOdd *= Number(leg.odd) || 1;
    combinedProb *= (Number(leg.prob) || 40) / 100;

    const li = document.createElement('li');
    li.innerHTML = `
      <div style="min-width:0; flex:1;">
        <div style="font-weight:600; font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(leg.matchLabel)}</div>
        <div class="muted-text" style="font-size:0.75rem;">${escapeHTML(leg.pickLabel)} · <span class="odd-val">${Number(leg.odd).toFixed(2)}x</span></div>
      </div>
      <button type="button" class="icon-btn" data-remove-leg="${leg.matchId}">${ICONS.close}</button>
    `;
    list.appendChild(li);
  });

  const stake = parseFloat($('#slip-stake').value) || 0;
  const cur = $('#slip-currency').value || 'HNL';
  const payout = stake * totalOdd;
  const probPct = Math.round(combinedProb * 100);

  $('#slip-prob').textContent = `${probPct}%`;
  $('#slip-odd').textContent = `${totalOdd.toFixed(2)}x`;
  $('#slip-payout').textContent = formatMoney(payout, cur);
}

/* ==========================================================================
   13. EVENTOS E INICIALIZACIÓN GLOBAL
   ========================================================================== */
function initEventListeners() {
  $('#auth-toggle-btn')?.addEventListener('click', () => {
    state.authMode = state.authMode === 'login' ? 'register' : 'login';
    updateAuthModeUI();
  });
  $('#auth-form')?.addEventListener('submit', handleAuthSubmit);
  $('#forgot-password-btn')?.addEventListener('click', handleForgotPassword);
  $('#change-password-form')?.addEventListener('submit', handleChangePassword);

  $('#open-password-modal-btn')?.addEventListener('click', () => openModal($('#password-modal')));
  $('#close-password-modal-btn')?.addEventListener('click', () => closeModal($('#password-modal')));

  $('#logout-btn')?.addEventListener('click', async () => {
    await sb.auth.signOut();
    state.user = null;
    state.hydrationComplete = false;
    $('#app-view').classList.add('hidden');
    $('#auth-view').classList.remove('hidden');
  });

  $$('.module-nav .nav-pill').forEach((btn) => {
    btn.addEventListener('click', () => switchModule(btn.dataset.target));
  });

  document.addEventListener('click', (e) => {
    const jump = e.target.closest('[data-jump-module]');
    if (jump) switchModule(jump.dataset.jumpModule);

    const focusBtn = e.target.closest('[data-focus-id]');
    if (focusBtn) {
      const inp = document.getElementById(focusBtn.dataset.focusId);
      inp?.focus();
    }
  });

  $('#open-widget-modal-btn')?.addEventListener('click', () => openModal($('#widget-modal')));
  $('#close-widget-modal-btn')?.addEventListener('click', () => closeModal($('#widget-modal')));
  $('#open-layout-modal-btn')?.addEventListener('click', openLayoutModal);
  $('#close-layout-modal-btn')?.addEventListener('click', () => closeModal($('#layout-modal')));
  $('#done-layout-btn')?.addEventListener('click', () => closeModal($('#layout-modal')));

  $('#layout-widgets-list')?.addEventListener('change', (e) => {
    const chk = e.target.closest('[data-toggle-widget]');
    if (!chk) return;
    const id = chk.dataset.toggleWidget;
    const activeSec = $(`#${state.activeModule}`);
    const zone = activeSec?.querySelector('.module-dropzone');
    const widget = zone?.querySelector(`.zen-widget[data-widget-id="${id}"]`);
    if (widget && zone) {
      widget.classList.toggle('hidden', !chk.checked);
      chk.nextElementSibling.textContent = chk.checked ? 'Visible' : 'Oculto';
      persistModuleLayout(zone);
    }
  });

  $('#reset-layout-btn')?.addEventListener('click', () => {
    delete state.widgetLayout[state.activeModule];
    syncProfileToSupabase();
    applySavedLayout();
    openLayoutModal();
    showToast('Disposición restablecida.');
  });

  $('#widget-type')?.addEventListener('change', (e) => {
    const t = e.target.value;
    $('#widget-dynamic-fields').classList.toggle('hidden', t === 'counter' || t === 'timer');
    $('#widget-counter-fields').classList.toggle('hidden', t !== 'counter');
    $('#widget-timer-fields').classList.toggle('hidden', t !== 'timer');
    $('#widget-content-label').textContent = t === 'checklist' ? 'Elementos (uno por línea)' : 'Contenido o Enlaces';
  });

  $('#custom-widget-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = $('#widget-type').value;
    const size = $('#widget-size').value;
    const title = $('#widget-title').value.trim();
    const tag = $('#widget-tag').value.trim();
    const content = $('#widget-content').value.trim();

    let newId = uid('cw');
    if (state.user) {
      const { data } = await sb
        .from('custom_widgets')
        .insert({
          user_id: state.user.id,
          title,
          type,
          tag: tag || null,
          content: content || null,
          size
        })
        .select()
        .single();
      if (data?.id) newId = data.id;
    }

    const cw = { id: newId, type, size, title, tag, content };
    if (type === 'checklist') {
      cw.items = content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text) => ({ text, done: false }));
    } else if (type === 'counter') {
      cw.value = Number($('#widget-counter-start').value) || 0;
      cw.goal = Math.max(1, Number($('#widget-counter-goal').value) || 10);
    } else if (type === 'timer') {
      cw.minutes = Math.max(1, Number($('#widget-timer-minutes').value) || 25);
    }

    state.customWidgets.push(cw);
    renderCustomWidgets();
    applySavedLayout();
    $('#custom-widget-form').reset();
    closeModal($('#widget-modal'));
    showToast('Widget creado.');
  });

  document.addEventListener('click', async (e) => {
    const delCw = e.target.closest('[data-delete-cw]');
    if (delCw) {
      const id = delCw.dataset.deleteCw;
      if (state.user && isUUID(id)) {
        await sb.from('custom_widgets').delete().eq('id', id);
      }
      state.customWidgets = state.customWidgets.filter((w) => w.id !== id);
      renderCustomWidgets();
      applySavedLayout();
      return;
    }

    const stepBtn = e.target.closest('[data-cw-step]');
    if (stepBtn) {
      const cw = state.customWidgets.find((w) => w.id === stepBtn.dataset.cwId);
      if (cw) {
        cw.value = Math.max(0, (Number(cw.value) || 0) + Number(stepBtn.dataset.cwStep));
        renderCustomWidgets();
        applySavedLayout();
      }
    }
  });

  document.addEventListener('change', (e) => {
    const cwChk = e.target.closest('[data-cw-check]');
    if (cwChk) {
      const cw = state.customWidgets.find((w) => w.id === cwChk.dataset.cwCheck);
      const idx = Number(cwChk.dataset.idx);
      if (cw && cw.items?.[idx]) {
        cw.items[idx].done = cwChk.checked;
        renderCustomWidgets();
        applySavedLayout();
      }
    }
  });

  // Clima
  $('#toggle-city-search-btn')?.addEventListener('click', () => {
    $('#city-search-box').classList.toggle('hidden');
  });
  $('#refresh-weather-btn')?.addEventListener('click', () => {
    fetchWeather();
    showToast('Actualizando clima...');
  });
  $('#city-search-btn')?.addEventListener('click', searchCities);
  $('#city-search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchCities();
    }
  });

  // Divisas
  $('#currency-from')?.addEventListener('change', () => {
    updateCurrencyConversion();
    syncProfileToSupabase();
  });
  $('#currency-to')?.addEventListener('change', () => {
    updateCurrencyConversion();
    syncProfileToSupabase();
  });
  $('#currency-amount-input')?.addEventListener('input', updateCurrencyConversion);
  $('#swap-currency-btn')?.addEventListener('click', () => {
    const tmp = $('#currency-from').value;
    $('#currency-from').value = $('#currency-to').value;
    $('#currency-to').value = tmp;
    updateCurrencyConversion();
    syncProfileToSupabase();
  });

  // Pomodoro
  $('#pomo-mode-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pomo-mins]');
    if (!btn) return;
    $$('#pomo-mode-tabs .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    clearInterval(state.pomodoro.intervalId);
    state.pomodoro.running = false;
    state.pomodoro.durationMins = Number(btn.dataset.pomoMins) || 25;
    state.pomodoro.remainingSecs = state.pomodoro.durationMins * 60;
    renderPomodoro();
  });
  $('#pomo-toggle-btn')?.addEventListener('click', togglePomodoro);
  $('#pomo-reset-btn')?.addEventListener('click', () => {
    clearInterval(state.pomodoro.intervalId);
    state.pomodoro.running = false;
    state.pomodoro.remainingSecs = state.pomodoro.durationMins * 60;
    renderPomodoro();
  });

  // Hábitos
  $('#habit-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('#habit-input').value.trim();
    if (!title) return;
    state.habits.push({ id: uid('hab'), title, done: false });
    state.habitsDate = todayISO();
    $('#habit-input').value = '';
    saveLocalPrefs();
    renderHabits();
  });

  $('#habits-list')?.addEventListener('change', (e) => {
    const chk = e.target.closest('[data-habit-toggle]');
    if (!chk) return;
    const hab = state.habits.find((h) => h.id === chk.dataset.habitToggle);
    if (hab) {
      hab.done = chk.checked;
      if (hab.done) {
        const rect = chk.getBoundingClientRect();
        spawnParticles(rect.left + 8, rect.top + 8, '#10b981');
      }
      saveLocalPrefs();
      renderHabits();
    }
  });

  $('#habits-list')?.addEventListener('click', (e) => {
    const del = e.target.closest('[data-habit-del]');
    if (!del) return;
    state.habits = state.habits.filter((h) => h.id !== del.dataset.habitDel);
    saveLocalPrefs();
    renderHabits();
  });

  // Notas rápidas
  let padTimer = null;
  $('#quick-scratchpad-input')?.addEventListener('input', (e) => {
    state.scratchpad = e.target.value;
    $('#scratchpad-status').textContent = 'Guardando...';
    clearTimeout(padTimer);
    padTimer = setTimeout(() => {
      saveLocalPrefs();
      $('#scratchpad-status').textContent = 'Guardado';
    }, 450);
  });

  $('#copy-scratchpad-btn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#quick-scratchpad-input').value);
      showToast('Notas copiadas al portapapeles.');
    } catch (_) {}
  });

  $('#clear-scratchpad-btn')?.addEventListener('click', () => {
    state.scratchpad = '';
    $('#quick-scratchpad-input').value = '';
    saveLocalPrefs();
    showToast('Notas limpiadas.');
  });

  // Accesos rápidos (quick_links)
  $('#link-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    let url = $('#link-url').value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    let title = $('#link-title').value.trim();
    if (!title) {
      try {
        title = new URL(url).hostname.replace(/^www\./, '');
      } catch (_) {
        title = url;
      }
    }

    let id = uid('lk');
    if (state.user) {
      const { data } = await sb
        .from('quick_links')
        .insert({ user_id: state.user.id, title, url })
        .select()
        .single();
      if (data?.id) id = data.id;
    }

    state.links.push({ id, title, url });
    $('#link-form').reset();
    renderLinks();
  });

  $('#links-grid')?.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-link-del]');
    if (!del) return;
    const id = del.dataset.linkDel;
    if (state.user && isUUID(id)) {
      await sb.from('quick_links').delete().eq('id', id);
    }
    state.links = state.links.filter((l) => l.id !== id);
    renderLinks();
  });

  // Tareas (todos)
  $('#todo-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = $('#todo-input').value.trim();
    if (!text) return;

    let id = uid('td');
    if (state.user) {
      const { data } = await sb
        .from('todos')
        .insert({ user_id: state.user.id, title: text, completed: false })
        .select()
        .single();
      if (data?.id) id = data.id;
    }

    state.todos.unshift({ id, text, done: false });
    $('#todo-input').value = '';
    renderTodos();
  });

  $('#todo-list')?.addEventListener('change', async (e) => {
    const chk = e.target.closest('[data-todo-toggle]');
    if (!chk) return;
    const id = chk.dataset.todoToggle;
    const td = state.todos.find((t) => t.id === id);
    if (td) {
      td.done = chk.checked;
      if (td.done) {
        const rect = chk.getBoundingClientRect();
        spawnParticles(rect.left + 8, rect.top + 8, '#38bdf8');
      }
      if (state.user && isUUID(id)) {
        await sb.from('todos').update({ completed: td.done }).eq('id', id);
      }
      renderTodos();
    }
  });

  $('#todo-list')?.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-todo-del]');
    if (!del) return;
    const id = del.dataset.todoDel;
    if (state.user && isUUID(id)) {
      await sb.from('todos').delete().eq('id', id);
    }
    state.todos = state.todos.filter((t) => t.id !== id);
    renderTodos();
  });

  // Recordatorios (reminders)
  $('#reminder-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('#reminder-title').value.trim();
    const date = $('#reminder-date').value;
    if (!title || !date) return;

    let id = uid('rem');
    if (state.user) {
      const { data } = await sb
        .from('reminders')
        .insert({ user_id: state.user.id, title, remind_at: new Date(date).toISOString() })
        .select()
        .single();
      if (data?.id) id = data.id;
    }

    state.reminders.push({ id, title, date });
    $('#reminder-form').reset();
    renderReminders();
  });

  $('#reminder-list')?.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-rem-del]');
    if (!del) return;
    const id = del.dataset.remDel;
    if (state.user && isUUID(id)) {
      await sb.from('reminders').delete().eq('id', id);
    }
    state.reminders = state.reminders.filter((r) => r.id !== id);
    renderReminders();
  });

  // Panel de Vida
  $('#toggle-google-config-btn')?.addEventListener('click', () => {
    $('#google-config-panel').classList.toggle('hidden');
  });
  $('#close-google-config-btn')?.addEventListener('click', () => {
    $('#google-config-panel').classList.add('hidden');
  });

  $('#google-client-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    state.googleClientId = $('#google-client-id-input').value.trim();
    syncProfileToSupabase();
    showToast('Client ID de Google guardado.');
  });

  $('#outlook-client-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    state.outlookClientId = $('#outlook-client-id-input').value.trim();
    saveLocalPrefs();
    showToast('Client ID de Outlook guardado.');
  });

  $('#connect-google-btn')?.addEventListener('click', connectGoogleAccount);
  $('#connect-outlook-btn')?.addEventListener('click', () => {
    if (!state.outlookClientId) {
      $('#google-config-panel').classList.remove('hidden');
      showToast('Configura primero el Application ID de Outlook.');
      return;
    }
    showToast('Iniciando flujo OAuth de Microsoft Outlook...');
  });

  $('#sync-google-btn')?.addEventListener('click', async () => {
    await syncGoogleData();
    await refreshIcsSources();
    renderLifeModule();
    showToast('Panel de Vida actualizado.');
  });

  $('#ics-calendar-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = $('#ics-calendar-url-input').value.trim();
    if (!url) return;
    state.icsSources.push({ id: uid('ics'), name: 'Calendario Apple (.ics)', url });
    $('#ics-calendar-url-input').value = '';
    saveLocalPrefs();
    await refreshIcsSources();
    showToast('Calendario .ics vinculado.');
  });

  $('#ics-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      state.icsSources.push({
        id: uid('ics'),
        name: file.name,
        rawText: String(reader.result || '')
      });
      saveLocalPrefs();
      await refreshIcsSources();
      showToast(`Archivo ${file.name} importado.`);
    };
    reader.readAsText(file);
  });

  $('#ics-sources-list')?.addEventListener('click', (e) => {
    const del = e.target.closest('[data-ics-del]');
    if (!del) return;
    state.icsSources = state.icsSources.filter((s) => s.id !== del.dataset.icsDel);
    state.calendarEvents = state.calendarEvents.filter((ev) => ev.source !== 'apple');
    saveLocalPrefs();
    refreshIcsSources();
    renderLifeModule();
  });

  $('#mail-source-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mail-source]');
    if (!btn) return;
    $$('#mail-source-filters .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.mailFilter = btn.dataset.mailSource;
    renderLifeModule();
  });

  $('#calendar-source-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cal-source]');
    if (!btn) return;
    $$('#calendar-source-filters .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.calFilter = btn.dataset.calSource;
    renderLifeModule();
  });

  // Asesor Financiero (CRUD directo en Supabase)
  $('#finance-period-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-days]');
    if (!btn) return;
    $$('#finance-period-filters .nav-pill[data-days]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.financePeriod = btn.dataset.days;
    saveLocalPrefs();
    renderFinanceModule();
  });

  $('#finance-display-currency')?.addEventListener('change', (e) => {
    state.financeCurrency = e.target.value;
    saveLocalPrefs();
    renderFinanceModule();
  });

  $('#fin-donut-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    $$('#fin-donut-tabs .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.donutMode = btn.dataset.mode;
    renderFinanceModule();
  });

  $('#fin-account-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#fin-acc-name').value.trim();
    const type = $('#fin-acc-type').value;
    const balance = parseFloat($('#fin-acc-balance').value) || 0;
    const currency = $('#fin-acc-currency').value;
    if (!name) return;

    let id = uid('acc');
    if (state.user) {
      const { data, error } = await sb
        .from('finance_accounts')
        .insert({
          user_id: state.user.id,
          name,
          account_type: type,
          currency,
          balance
        })
        .select()
        .single();
      if (error) {
        showToast('Error al guardar cuenta en la nube.');
        return;
      }
      if (data?.id) id = data.id;
    }

    state.accounts.push({ id, name, type, balance, currency });
    $('#fin-account-form').reset();
    renderFinanceModule();
    showToast('Cuenta guardada.');
  });

  $('#fin-accounts-list')?.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-acc-del]');
    if (!del) return;
    const id = del.dataset.accDel;
    if (state.user && isUUID(id)) {
      await sb.from('finance_accounts').delete().eq('id', id);
    }
    state.accounts = state.accounts.filter((a) => a.id !== id);
    renderFinanceModule();
  });

  $('#toggle-new-cat-btn')?.addEventListener('click', () => {
    $('#fin-category-panel').classList.toggle('hidden');
  });

  $('#fin-category-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#fin-cat-name').value.trim();
    const type = $('#fin-cat-type').value;
    if (!name) return;

    let id = uid('cat');
    if (state.user) {
      const { data } = await sb
        .from('finance_categories')
        .insert({
          user_id: state.user.id,
          name,
          type,
          color: type === 'income' ? '#10b981' : '#38bdf8'
        })
        .select()
        .single();
      if (data?.id) id = data.id;
    }

    state.categories.unshift({ id, name, type, color: '#38bdf8' });
    $('#fin-category-form').reset();
    renderFinanceModule();
    showToast('Categoría creada.');
  });

  $('#fin-categories-manage-list')?.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-cat-del]');
    if (!del) return;
    const id = del.dataset.catDel;
    if (state.user && isUUID(id)) {
      await sb.from('finance_categories').delete().eq('id', id);
    }
    state.categories = state.categories.filter((c) => c.id !== id);
    renderFinanceModule();
  });

  $('#fin-tx-type')?.addEventListener('change', populateFinanceSelects);

  if ($('#fin-tx-date')) $('#fin-tx-date').value = todayISO();
  if ($('#fin-plan-date')) $('#fin-plan-date').value = todayISO();

  $('#fin-tx-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = $('#fin-tx-type').value;
    const amount = parseFloat($('#fin-tx-amount').value);
    const rawCatId = $('#fin-tx-category').value;
    const accountId = $('#fin-tx-account').value;
    const description = $('#fin-tx-desc').value.trim();
    const date = $('#fin-tx-date').value || todayISO();
    const recurring = $('#fin-tx-recurring').checked;

    if (!amount || amount <= 0 || !description) return;

    const acc = state.accounts.find((a) => a.id === accountId);
    const currency = acc?.currency || state.financeCurrency || 'HNL';
    const validCatId = await ensureValidCategoryId(rawCatId, type);

    let id = uid('tx');
    if (state.user) {
      const { data, error } = await sb
        .from('finance_transactions')
        .insert({
          user_id: state.user.id,
          account_id: isUUID(accountId) ? accountId : null,
          category_id: validCatId,
          type,
          amount,
          currency,
          description,
          is_recurring: recurring,
          tx_date: date
        })
        .select()
        .single();

      if (error) {
        showToast('Error al guardar el movimiento.');
        return;
      }
      if (data?.id) id = data.id;
    }

    if (acc) {
      acc.balance = Number(acc.balance) + (type === 'income' ? amount : -amount);
      if (state.user && isUUID(acc.id)) {
        await sb.from('finance_accounts').update({ balance: acc.balance }).eq('id', acc.id);
      }
    }

    state.transactions.unshift({
      id,
      type,
      amount,
      currency,
      categoryId: validCatId || rawCatId,
      accountId,
      description,
      date,
      recurring
    });

    $('#fin-tx-form').reset();
    $('#fin-tx-date').value = todayISO();
    renderFinanceModule();
    showToast('Movimiento guardado en Supabase.');
  });

  $('#fin-transactions-list')?.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-tx-del]');
    if (!del) return;
    const id = del.dataset.txDel;
    const tx = state.transactions.find((t) => t.id === id);
    if (!tx) return;

    if (state.user && isUUID(id)) {
      await sb.from('finance_transactions').delete().eq('id', id);
    }

    const acc = state.accounts.find((a) => a.id === tx.accountId);
    if (acc) {
      acc.balance = Number(acc.balance) - (tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount));
      if (state.user && isUUID(acc.id)) {
        await sb.from('finance_accounts').update({ balance: acc.balance }).eq('id', acc.id);
      }
    }

    state.transactions = state.transactions.filter((t) => t.id !== id);
    renderFinanceModule();
  });

  $('#toggle-new-plan-form-btn')?.addEventListener('click', () => {
    $('#fin-planned-form').classList.toggle('hidden');
  });

  $('#fin-planned-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = $('#fin-plan-type').value;
    const title = $('#fin-plan-title').value.trim();
    const amount = parseFloat($('#fin-plan-amount').value);
    const currency = $('#fin-plan-currency').value;
    const accountId = $('#fin-plan-account').value;
    const rawCatId = $('#fin-plan-category').value;
    const frequency = $('#fin-plan-frequency').value;
    const nextDate = $('#fin-plan-date').value || todayISO();

    if (!title || !amount || amount <= 0) return;
    const validCatId = await ensureValidCategoryId(rawCatId, type);

    let id = uid('plan');
    if (state.user) {
      const { data, error } = await sb
        .from('finance_planned')
        .insert({
          user_id: state.user.id,
          account_id: isUUID(accountId) ? accountId : null,
          category_id: validCatId,
          type,
          title,
          amount,
          currency,
          frequency,
          next_date: nextDate
        })
        .select()
        .single();
      if (error) {
        showToast('Error al guardar pago planificado.');
        return;
      }
      if (data?.id) id = data.id;
    }

    state.plannedPayments.push({
      id,
      type,
      title,
      amount,
      currency,
      accountId,
      categoryId: validCatId || rawCatId,
      frequency,
      nextDate
    });

    $('#fin-planned-form').reset();
    $('#fin-plan-date').value = todayISO();
    $('#fin-planned-form').classList.add('hidden');
    renderFinanceModule();
    showToast('Pago planificado guardado.');
  });

  $('#fin-planned-type-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ptype]');
    if (!btn) return;
    $$('#fin-planned-type-filters .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.plannedTypeFilter = btn.dataset.ptype;
    renderPlannedPayments();
  });

  $('#fin-planned-search')?.addEventListener('input', (e) => {
    state.plannedSearch = e.target.value;
    renderPlannedPayments();
  });

  $('#fin-planned-list')?.addEventListener('click', async (e) => {
    const del = e.target.closest('[data-plan-del]');
    if (del) {
      const id = del.dataset.planDel;
      if (state.user && isUUID(id)) {
        await sb.from('finance_planned').delete().eq('id', id);
      }
      state.plannedPayments = state.plannedPayments.filter((p) => p.id !== id);
      renderFinanceModule();
      return;
    }

    const conf = e.target.closest('[data-plan-confirm]');
    if (conf) {
      const plan = state.plannedPayments.find((p) => p.id === conf.dataset.planConfirm);
      if (!plan) return;
      $('#confirm-plan-id').value = plan.id;
      $('#confirm-plan-title').textContent = `Confirmar: ${plan.title}`;
      $('#confirm-plan-original-info').textContent = `Programado: ${formatMoney(plan.amount, plan.currency)} (${plan.frequency})`;
      $('#confirm-plan-currency-label').textContent = plan.currency;
      $('#confirm-plan-real-amount').value = plan.amount;
      if (plan.accountId) $('#confirm-plan-account').value = plan.accountId;
      $('#confirm-plan-date').value = todayISO();
      updateConfirmConversionPreview();
      openModal($('#confirm-plan-modal'));
    }
  });

  $('#confirm-plan-real-amount')?.addEventListener('input', updateConfirmConversionPreview);
  $('#confirm-plan-account')?.addEventListener('change', updateConfirmConversionPreview);
  $('#close-confirm-plan-btn')?.addEventListener('click', () => closeModal($('#confirm-plan-modal')));

  $('#confirm-plan-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const plan = state.plannedPayments.find((p) => p.id === $('#confirm-plan-id').value);
    if (!plan) return;

    const realAmt = parseFloat($('#confirm-plan-real-amount').value) || plan.amount;
    const accId = $('#confirm-plan-account').value;
    const applyDate = $('#confirm-plan-date').value || todayISO();

    const acc = state.accounts.find((a) => a.id === accId);
    const convertedToAcc = acc ? convertCurrency(realAmt, plan.currency, acc.currency) : realAmt;
    const txCurrency = acc?.currency || plan.currency;
    const validCatId = await ensureValidCategoryId(plan.categoryId, plan.type);

    let txId = uid('tx');
    if (state.user) {
      const { data } = await sb
        .from('finance_transactions')
        .insert({
          user_id: state.user.id,
          account_id: isUUID(accId) ? accId : null,
          category_id: validCatId,
          type: plan.type,
          amount: convertedToAcc,
          currency: txCurrency,
          description: plan.title,
          is_recurring: true,
          tx_date: applyDate
        })
        .select()
        .single();
      if (data?.id) txId = data.id;
    }

    if (acc) {
      acc.balance = Number(acc.balance) + (plan.type === 'income' ? convertedToAcc : -convertedToAcc);
      if (state.user && isUUID(acc.id)) {
        await sb.from('finance_accounts').update({ balance: acc.balance }).eq('id', acc.id);
      }
    }

    state.transactions.unshift({
      id: txId,
      type: plan.type,
      amount: convertedToAcc,
      currency: txCurrency,
      categoryId: validCatId || plan.categoryId,
      accountId: accId,
      description: plan.title,
      date: applyDate,
      recurring: true
    });

    plan.nextDate = advancePlannedDate(plan.nextDate, plan.frequency);
    if (state.user && isUUID(plan.id)) {
      await sb.from('finance_planned').update({ next_date: plan.nextDate }).eq('id', plan.id);
    }

    renderFinanceModule();
    closeModal($('#confirm-plan-modal'));
    showToast('Movimiento aplicado y fecha avanzada.');
  });

  // Parleys
  $('#refresh-parleys-btn')?.addEventListener('click', loadParleys);

  $('#league-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-league]');
    if (!btn) return;
    $$('#league-filters .nav-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedLeague = btn.dataset.league;
    renderParleysModule();
  });

  $('#date-filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-date-filter]');
    if (!btn) return;
    $$('#date-filters .nav-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedDateFilter = btn.dataset.dateFilter;
    state.customParleyDate = '';
    $('#parley-custom-date').value = '';
    $('#clear-parley-date-btn').classList.add('hidden');
    renderParleysModule();
  });

  $('#parley-custom-date')?.addEventListener('change', (e) => {
    state.customParleyDate = e.target.value;
    $('#clear-parley-date-btn').classList.toggle('hidden', !state.customParleyDate);
    renderParleysModule();
  });

  $('#clear-parley-date-btn')?.addEventListener('click', () => {
    state.customParleyDate = '';
    $('#parley-custom-date').value = '';
    $('#clear-parley-date-btn').classList.add('hidden');
    renderParleysModule();
  });

  $('#matches-list-grid')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-pick-match]');
    if (!chip) return;
    const matchId = chip.dataset.pickMatch;
    const pick = chip.dataset.pick;
    const match = state.parleysMatches.find((m) => m.id === matchId);
    if (!match) return;

    const existingIdx = state.slip.findIndex((s) => s.matchId === matchId);
    if (existingIdx !== -1 && state.slip[existingIdx].pick === pick) {
      state.slip.splice(existingIdx, 1);
    } else {
      const pickMap = {
        '1': { label: match.home, odd: match.odds.home, prob: match.probabilities?.home || 40 },
        X: { label: 'Empate', odd: match.odds.draw, prob: match.probabilities?.draw || 27 },
        '2': { label: match.away, odd: match.odds.away, prob: match.probabilities?.away || 33 }
      };
      const chosen = pickMap[pick];
      const leg = {
        matchId,
        matchLabel: `${match.home} vs ${match.away}`,
        pick,
        pickLabel: chosen.label,
        odd: chosen.odd,
        prob: chosen.prob
      };
      if (existingIdx !== -1) state.slip[existingIdx] = leg;
      else state.slip.push(leg);
    }
    renderParleysModule();
  });

  $('#auto-parleys-grid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-load-autoparley]');
    if (!btn) return;
    const ap = state.autoParleys[Number(btn.dataset.loadAutoparley)];
    if (!ap) return;
    state.slip = ap.legs.map((l) => ({ ...l }));
    renderParleysModule();
    showToast('Combinada cargada en tu boleto.');
  });

  $('#slip-legs-list')?.addEventListener('click', (e) => {
    const rem = e.target.closest('[data-remove-leg]');
    if (!rem) return;
    state.slip = state.slip.filter((s) => s.matchId !== rem.dataset.removeLeg);
    renderParleysModule();
  });

  $('#clear-slip-btn')?.addEventListener('click', () => {
    state.slip = [];
    renderParleysModule();
  });

  $('#slip-stake')?.addEventListener('input', renderSlip);
  $('#slip-currency')?.addEventListener('change', renderSlip);
}

/* ==========================================================================
   14. ARRANQUE DE LA APLICACIÓN
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  initZenFX();
  initDragAndDrop();
  initEventListeners();

  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && session?.user) {
      enterApp(session.user).then(() => openModal($('#password-modal')));
    }
  });

  const { data } = await sb.auth.getSession();
  if (data?.session?.user) {
    await enterApp(data.session.user);
  }
});