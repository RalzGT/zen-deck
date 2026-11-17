/* ==========================================================================
   ZEN DECK - BY RALZ | NÚCLEO DE APLICACIÓN (app.js)
   ========================================================================== */

const SUPABASE_URL = 'https://lxrdrqjjuzpxtysakpvb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DXx0j5HaveKep0XHgjor_A_Kmrp9ll6';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================================================
   1. ESTADO GLOBAL DE LA APLICACIÓN
   ========================================================================== */
const state = {
  user: null,
  authMode: 'login',
  activeModule: localStorage.getItem('zendeck_active_module') || 'dashboard-module',

  // Clima & Divisas
  weatherCity: JSON.parse(localStorage.getItem('zendeck_weather_city') || 'null') || {
    name: 'San Pedro Sula, HN',
    lat: 15.5042,
    lon: -88.025
  },
  rates: {
    USD: 1, HNL: 25.15, EUR: 0.92, MXN: 20.1, GTQ: 7.72, CRC: 512,
    NIO: 36.8, COP: 4350, ARS: 1010, BRL: 5.78, GBP: 0.79, CAD: 1.39,
    JPY: 154, CHF: 0.88
  },

  // Panel Principal (9 widgets)
  links: [],
  todos: [],
  reminders: [],
  habits: [],
  pomo: {
    modeMins: 25,
    remainingSecs: 25 * 60,
    intervalId: null,
    sessionsToday: 0
  },
  customWidgets: [],
  timerIntervals: {},

  // Panel de Vida (Gmail + Outlook + Apple .ics)
  googleClientId: localStorage.getItem('zendeck_google_client_id') || '',
  googleToken: null,
  outlookClientId: localStorage.getItem('zendeck_outlook_client_id') || '',
  outlookToken: null,
  icsUrls: JSON.parse(localStorage.getItem('zendeck_ics_urls') || '[]'),
  localIcsEvents: JSON.parse(localStorage.getItem('zendeck_local_ics_events') || '[]'),
  mails: [],
  calendarEvents: [],
  mailSourceFilter: 'ALL',
  calSourceFilter: 'ALL',

  // Asesor Financiero
  finPeriodDays: '30',
  finDisplayCurrency: localStorage.getItem('zendeck_fin_currency') || 'HNL',
  finDonutMode: 'categories',
  finPlannedTypeFilter: 'ALL',
  finPlannedSearch: '',
  accounts: [],
  categories: [],
  transactions: [],
  planned: [],

  // Parleys
  parleysData: { updated_at: '', matches: [], auto_parleys: [] },
  parleyLeagueFilter: 'ALL',
  parleyDateFilter: 'ALL',
  parleyCustomDate: '',
  slip: []
};

const CURRENCY_NAMES = {
  USD: 'USD - Dólar EE.UU.',
  HNL: 'HNL - Lempira',
  EUR: 'EUR - Euro',
  MXN: 'MXN - Peso Mexicano',
  GTQ: 'GTQ - Quetzal',
  CRC: 'CRC - Colón CR',
  NIO: 'NIO - Córdoba',
  COP: 'COP - Peso Col.',
  ARS: 'ARS - Peso Arg.',
  BRL: 'BRL - Real',
  GBP: 'GBP - Libra',
  CAD: 'CAD - Dólar Can.',
  JPY: 'JPY - Yen',
  CHF: 'CHF - Franco Suizo'
};

const DEFAULT_CATEGORIES = [
  { name: 'Alimentación', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
  { name: 'Servicios', type: 'expense' },
  { name: 'Suscripciones', type: 'expense' },
  { name: 'Entretenimiento', type: 'expense' },
  { name: 'Salud', type: 'expense' },
  { name: 'Salario', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Otros', type: 'expense' }
];

/* ==========================================================================
   2. UTILIDADES Y MOTOR VISUAL ZENFX (CLICS, MODALES, ARRASTRE)
   ========================================================================== */
const $ = (id) => document.getElementById(id);

function spawnZenParticles(x, y, count = 8) {
  const paletteByTheme = {
    dashboard: ['#38bdf8', '#10b981', '#e0f2fe'],
    life: ['#10b981', '#38bdf8', '#a7f3d0'],
    finance: ['#f59e0b', '#10b981', '#fde68a'],
    parleys: ['#818cf8', '#10b981', '#c7d2fe']
  };
  const theme = document.body.dataset.moduleTheme || 'dashboard';
  const colors = paletteByTheme[theme] || paletteByTheme.dashboard;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'zen-particle';
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 24 + Math.random() * 34;
    const color = colors[i % colors.length];
    p.style.left = `${x - 3}px`;
    p.style.top = `${y - 3}px`;
    p.style.color = color;
    p.style.backgroundColor = color;
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 600);
  }
}

function initZenFX() {
  document.addEventListener('click', (e) => {
    const interactive = e.target.closest(
      '.glass-btn, .icon-btn, .nav-pill, .seg-btn, .odd-chip, .pulse-tile'
    );
    if (!interactive) return;

    // 1. Onda expansiva (ripple) dentro del botón
    const rect = interactive.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'zen-ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    interactive.appendChild(ripple);
    setTimeout(() => ripple.remove(), 540);

    // 2. Destello de partículas ZenFX
    if (e.clientX > 0 && e.clientY > 0) {
      spawnZenParticles(e.clientX, e.clientY, 6);
    }
  });

  // Cerrar modales al hacer clic fuera de la tarjeta o presionar Escape
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach((m) => {
        closeModal(m.id);
      });
    }
  });
}

function openModal(modalId) {
  const modal = $(modalId);
  if (!modal) return;
  modal.classList.remove('closing', 'hidden');
}

function closeModal(modalId) {
  const modal = $(modalId);
  if (!modal || modal.classList.contains('hidden')) return;
  modal.classList.add('closing');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('closing');
  }, 185);
}

function applyCascadeDelays(container = document) {
  container.querySelectorAll('.zen-widget:not(.hidden)').forEach((card, idx) => {
    card.style.setProperty('--stagger', idx);
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = '';
  });
}

function showToast(message) {
  const existing = document.querySelector('.zen-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'zen-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3400);
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function convertAmount(amount, fromCurr, toCurr) {
  const num = Number(amount) || 0;
  if (fromCurr === toCurr) return num;
  const fromRate = state.rates[fromCurr] || 1;
  const toRate = state.rates[toCurr] || 1;
  return (num / fromRate) * toRate;
}

function formatMoney(amount, currency = 'HNL') {
  const val = Number(amount) || 0;
  return `${currency} ${val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().split('T')[0];
}

function updateTopbarClock() {
  const el = $('current-date');
  if (!el) return;
  const now = new Date();
  const formatted = now.toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  el.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/* ==========================================================================
   3. AUTENTICACIÓN CON SUPABASE
   ========================================================================== */
function initAuth() {
  const authForm = $('auth-form');
  const toggleBtn = $('auth-toggle-btn');
  const forgotBtn = $('forgot-password-btn');
  const logoutBtn = $('logout-btn');

  toggleBtn.addEventListener('click', () => {
    state.authMode = state.authMode === 'login' ? 'register' : 'login';
    const isReg = state.authMode === 'register';
    $('name-field-group').classList.toggle('hidden', !isReg);
    $('auth-title').textContent = isReg ? 'Crear Cuenta' : 'Iniciar Sesión';
    $('auth-subtitle').textContent = isReg
      ? 'Configura tu espacio Zen Deck en la nube'
      : 'Ingresa a tu espacio personal sincronizado';
    $('auth-submit-btn').textContent = isReg ? 'Registrarme' : 'Entrar al Panel';
    $('auth-toggle-text').textContent = isReg ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?';
    toggleBtn.textContent = isReg ? 'Inicia sesión' : 'Regístrate aquí';
    $('auth-error').classList.add('hidden');
    $('auth-success').classList.add('hidden');
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('email').value.trim();
    const password = $('password').value;
    const fullName = $('full-name').value.trim();
    const errEl = $('auth-error');
    const okEl = $('auth-success');
    errEl.classList.add('hidden');
    okEl.classList.add('hidden');

    try {
      if (state.authMode === 'register') {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName || email.split('@')[0] } }
        });
        if (error) throw error;
        if (data.session) {
          onUserAuthenticated(data.user);
        } else {
          okEl.textContent = 'Cuenta creada. Revisa tu correo para confirmar o inicia sesión.';
          okEl.classList.remove('hidden');
        }
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onUserAuthenticated(data.user);
      }
    } catch (err) {
      errEl.textContent = err.message || 'Error de autenticación';
      errEl.classList.remove('hidden');
    }
  });

  forgotBtn.addEventListener('click', async () => {
    const email = $('email').value.trim();
    const errEl = $('auth-error');
    const okEl = $('auth-success');
    errEl.classList.add('hidden');
    okEl.classList.add('hidden');

    if (!email) {
      errEl.textContent = 'Escribe tu correo electrónico arriba para enviarte el enlace de recuperación.';
      errEl.classList.remove('hidden');
      return;
    }

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });

    if (error) {
      errEl.textContent = error.message;
      errEl.classList.remove('hidden');
    } else {
      okEl.textContent = 'Enlace de recuperación enviado a tu correo.';
      okEl.classList.remove('hidden');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await sb.auth.signOut();
    state.user = null;
    $('app-view').classList.add('hidden');
    $('auth-view').classList.remove('hidden');
  });

  $('open-password-modal-btn').addEventListener('click', () => {
    $('password-change-msg').classList.add('hidden');
    $('change-password-form').reset();
    openModal('password-modal');
  });

  $('close-password-modal-btn').addEventListener('click', () => {
    closeModal('password-modal');
  });

  $('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const p1 = $('new-password-input').value;
    const p2 = $('confirm-password-input').value;
    const msgEl = $('password-change-msg');

    if (p1 !== p2) {
      msgEl.textContent = 'Las contraseñas no coinciden.';
      msgEl.className = 'error-msg';
      msgEl.classList.remove('hidden');
      return;
    }

    const { error } = await sb.auth.updateUser({ password: p1 });
    if (error) {
      msgEl.textContent = error.message;
      msgEl.className = 'error-msg';
      msgEl.classList.remove('hidden');
    } else {
      closeModal('password-modal');
      showToast('Contraseña actualizada correctamente');
    }
  });

  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && session?.user) {
      onUserAuthenticated(session.user);
      $('password-modal-subtitle').textContent = 'Establece tu nueva contraseña de acceso.';
      openModal('password-modal');
    } else if (session?.user && !state.user) {
      onUserAuthenticated(session.user);
    }
  });
}

async function onUserAuthenticated(user) {
  state.user = user;
  $('auth-view').classList.add('hidden');
  $('app-view').classList.remove('hidden');

  const displayName =
    user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';
  $('welcome-user').textContent = `Hola, ${displayName}`;

  updateTopbarClock();
  initScratchpadAndHabits();
  switchModule(state.activeModule);

  await fetchExchangeRates();
  initCurrencyWidget();
  fetchWeather();

  await Promise.all([
    loadQuickLinks(),
    loadTodos(),
    loadReminders(),
    loadCustomWidgets(),
    loadFinanceData(),
    loadParleys()
  ]);

  applySavedLayout();
  applyCascadeDelays($(state.activeModule) || document);
  renderLifeConnectionsUI();
  renderCalendarEvents();
  updatePulseWidget();
}

/* ==========================================================================
   4. NAVEGACIÓN DE MÓDULOS Y GESTIÓN DE WIDGETS (DRAG CON EFECTOS, RESIZE)
   ========================================================================== */
function switchModule(moduleId) {
  const validModules = ['dashboard-module', 'life-module', 'finance-module', 'parleys-module'];
  if (!validModules.includes(moduleId)) moduleId = 'dashboard-module';

  state.activeModule = moduleId;
  localStorage.setItem('zendeck_active_module', moduleId);

  validModules.forEach((id) => {
    const sec = $(id);
    if (!sec) return;
    if (id === moduleId) {
      sec.classList.remove('hidden', 'module-enter');
      void sec.offsetWidth;
      sec.classList.add('module-enter');
      applyCascadeDelays(sec);
    } else {
      sec.classList.add('hidden');
      sec.classList.remove('module-enter');
    }
  });

  document.querySelectorAll('.module-nav .nav-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.target === moduleId);
  });

  const themeMap = {
    'dashboard-module': 'dashboard',
    'life-module': 'life',
    'finance-module': 'finance',
    'parleys-module': 'parleys'
  };
  document.body.dataset.moduleTheme = themeMap[moduleId] || 'dashboard';
}

function initNavigationAndLayout() {
  document.querySelectorAll('.module-nav .nav-pill').forEach((btn) => {
    btn.addEventListener('click', () => switchModule(btn.dataset.target));
  });

  // Accesos rápidos del widget Pulso del Día
  document.addEventListener('click', (e) => {
    const jumpBtn = e.target.closest('[data-jump-module]');
    if (jumpBtn) {
      switchModule(jumpBtn.dataset.jumpModule);
      return;
    }

    const focusBtn = e.target.closest('[data-focus-id]');
    if (focusBtn) {
      const target = $(focusBtn.dataset.focusId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.focus();
      }
      return;
    }

    const resizeBtn = e.target.closest('.resize-btn');
    if (resizeBtn) {
      const widgetId = resizeBtn.dataset.resize;
      const card = document.querySelector(`.zen-widget[data-widget-id="${widgetId}"]`);
      if (!card) return;
      const sizes = ['1x1', '2x1', '1x2', '2x2'];
      const current = sizes.find((s) => card.classList.contains(`size-${s}`)) || '1x1';
      const next = sizes[(sizes.indexOf(current) + 1) % sizes.length];
      card.classList.remove('size-2x1', 'size-1x2', 'size-2x2', 'drop-settle');
      if (next !== '1x1') card.classList.add(`size-${next}`);
      void card.offsetWidth;
      card.classList.add('drop-settle');
      saveLayoutState();
      return;
    }

    const hideBtn = e.target.closest('.hide-widget-btn');
    if (hideBtn) {
      const widgetId = hideBtn.dataset.hide;
      const card = document.querySelector(`.zen-widget[data-widget-id="${widgetId}"]`);
      if (card) {
        card.classList.add('hidden');
        saveLayoutState();
        showToast('Widget ocultado (reactívalo en ⚙ Widgets)');
      }
    }
  });

  // Drag & Drop entre widgets con halo, inclinación y destello al soltar
  let draggedWidget = null;

  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest('.zen-widget');
    if (!card) return;
    draggedWidget = card;
    card.classList.add('dragging');
    card.parentElement?.classList.add('dropzone-active');
    e.dataTransfer.effectAllowed = 'move';
  });

  document.addEventListener('dragover', (e) => {
    const targetCard = e.target.closest('.zen-widget');
    if (!targetCard || !draggedWidget || targetCard === draggedWidget) return;
    if (targetCard.parentElement !== draggedWidget.parentElement) return;
    e.preventDefault();
    targetCard.classList.add('drag-over');
  });

  document.addEventListener('dragleave', (e) => {
    const targetCard = e.target.closest('.zen-widget');
    if (targetCard && !targetCard.contains(e.relatedTarget)) {
      targetCard.classList.remove('drag-over');
    }
  });

  document.addEventListener('drop', (e) => {
    const targetCard = e.target.closest('.zen-widget');
    if (!targetCard || !draggedWidget || targetCard === draggedWidget) return;
    const container = targetCard.parentElement;
    if (!container || container !== draggedWidget.parentElement) return;
    e.preventDefault();
    targetCard.classList.remove('drag-over');

    const children = Array.from(container.children);
    const draggedIdx = children.indexOf(draggedWidget);
    const targetIdx = children.indexOf(targetCard);

    if (draggedIdx < targetIdx) {
      container.insertBefore(draggedWidget, targetCard.nextSibling);
    } else {
      container.insertBefore(draggedWidget, targetCard);
    }

    // Animación de asentamiento y partículas en el centro de la tarjeta soltada
    draggedWidget.classList.remove('drop-settle');
    void draggedWidget.offsetWidth;
    draggedWidget.classList.add('drop-settle');
    const r = draggedWidget.getBoundingClientRect();
    spawnZenParticles(r.left + r.width / 2, r.top + 28, 10);

    saveLayoutState();
  });

  document.addEventListener('dragend', () => {
    document.querySelectorAll('.module-dropzone').forEach((z) => z.classList.remove('dropzone-active'));
    document.querySelectorAll('.zen-widget').forEach((w) => {
      w.classList.remove('dragging', 'drag-over');
    });
    draggedWidget = null;
  });

  // Modal Gestor de Widgets
  $('open-layout-modal-btn').addEventListener('click', () => {
    renderLayoutManagerList();
    openModal('layout-modal');
  });

  $('close-layout-modal-btn').addEventListener('click', () => closeModal('layout-modal'));
  $('done-layout-btn').addEventListener('click', () => closeModal('layout-modal'));

  $('reset-layout-btn').addEventListener('click', () => {
    if (!state.user) return;
    localStorage.removeItem(`zendeck_layout_${state.user.id}`);
    document.querySelectorAll('.zen-widget').forEach((w) => {
      w.classList.remove('hidden', 'size-2x1', 'size-1x2', 'size-2x2');
      const def = w.dataset.defaultSize;
      if (def && def !== '1x1') w.classList.add(`size-${def}`);
    });
    renderLayoutManagerList();
    applyCascadeDelays($(state.activeModule) || document);
    showToast('Diseño restablecido');
  });

  // Modal Crear Widget Personalizado
  $('open-widget-modal-btn').addEventListener('click', () => {
    $('custom-widget-form').reset();
    toggleCustomWidgetFields('note');
    openModal('widget-modal');
  });

  $('close-widget-modal-btn').addEventListener('click', () => closeModal('widget-modal'));

  $('widget-type').addEventListener('change', (e) => {
    toggleCustomWidgetFields(e.target.value);
  });

  $('custom-widget-form').addEventListener('submit', handleCreateCustomWidget);
}

function toggleCustomWidgetFields(type) {
  const dynFields = $('widget-dynamic-fields');
  const contentInput = $('widget-content');
  const counterFields = $('widget-counter-fields');
  const timerFields = $('widget-timer-fields');

  dynFields.classList.toggle('hidden', type === 'counter' || type === 'timer');
  contentInput.required = !(type === 'counter' || type === 'timer');
  counterFields.classList.toggle('hidden', type !== 'counter');
  timerFields.classList.toggle('hidden', type !== 'timer');

  if (type === 'checklist') {
    $('widget-content-label').textContent = 'Elementos (uno por línea)';
    contentInput.placeholder = 'Revisar backups\nActualizar servidores\nEnviar reporte';
  } else {
    $('widget-content-label').textContent = 'Contenido o Enlaces';
    contentInput.placeholder = 'Escribe notas o pega URLs clicables...';
  }
}

function getLayoutStorageKey() {
  return `zendeck_layout_${state.user?.id || 'guest'}`;
}

function saveLayoutState() {
  const layout = {};
  document.querySelectorAll('.module-dropzone').forEach((zone, idx) => {
    const zoneKey = zone.parentElement?.id || `zone_${idx}`;
    layout[zoneKey] = Array.from(zone.querySelectorAll('.zen-widget')).map((w) => {
      const sizes = ['2x1', '1x2', '2x2'];
      const size = sizes.find((s) => w.classList.contains(`size-${s}`)) || '1x1';
      return {
        id: w.dataset.widgetId,
        hidden: w.classList.contains('hidden'),
        size
      };
    });
  });
  localStorage.setItem(getLayoutStorageKey(), JSON.stringify(layout));
}

function applySavedLayout() {
  const raw = localStorage.getItem(getLayoutStorageKey());
  if (!raw) return;
  try {
    const layout = JSON.parse(raw);
    Object.entries(layout).forEach(([zoneKey, items]) => {
      const parent = $(zoneKey);
      const zone = parent?.classList.contains('module-dropzone')
        ? parent
        : parent?.querySelector('.module-dropzone');
      if (!zone || !Array.isArray(items)) return;

      items.forEach((item) => {
        const card = zone.querySelector(`.zen-widget[data-widget-id="${item.id}"]`);
        if (!card) return;
        card.classList.toggle('hidden', Boolean(item.hidden));
        card.classList.remove('size-2x1', 'size-1x2', 'size-2x2');
        if (item.size && item.size !== '1x1') {
          card.classList.add(`size-${item.size}`);
        }
        zone.appendChild(card);
      });
    });
  } catch {
    // Ignorar layout corrupto
  }
}

function renderLayoutManagerList() {
  const list = $('layout-widgets-list');
  const activeSec = $(state.activeModule);
  const widgets = activeSec ? Array.from(activeSec.querySelectorAll('.zen-widget')) : [];

  list.innerHTML = widgets
    .map((w) => {
      const id = w.dataset.widgetId;
      const title = w.dataset.widgetTitle || id;
      const isHidden = w.classList.contains('hidden');
      return `
        <li>
          <span>${escapeHtml(title)}</span>
          <button type="button" class="glass-btn ${isHidden ? '' : 'primary'}" data-toggle-widget="${escapeHtml(id)}" style="padding:0.3rem 0.7rem;font-size:0.78rem;">
            ${isHidden ? 'Mostrar' : 'Visible'}
          </button>
        </li>
      `;
    })
    .join('');

  list.querySelectorAll('[data-toggle-widget]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = document.querySelector(`.zen-widget[data-widget-id="${btn.dataset.toggleWidget}"]`);
      if (!card) return;
      card.classList.toggle('hidden');
      saveLayoutState();
      renderLayoutManagerList();
    });
  });
}

async function loadCustomWidgets() {
  if (!state.user) return;
  const { data, error } = await sb
    .from('custom_widgets')
    .select('*')
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: true });

  if (!error && Array.isArray(data)) {
    state.customWidgets = data;
  } else {
    state.customWidgets = JSON.parse(
      localStorage.getItem(`zendeck_custom_widgets_${state.user.id}`) || '[]'
    );
  }
  renderCustomWidgets();
}

async function handleCreateCustomWidget(e) {
  e.preventDefault();
  if (!state.user) return;

  const type = $('widget-type').value;
  const size = $('widget-size').value;
  const title = $('widget-title').value.trim();
  const tag = $('widget-tag').value.trim() || 'Personal';
  const rawContent = $('widget-content').value.trim();

  let config = { module: state.activeModule, size, tag };

  if (type === 'note') {
    config.text = rawContent;
  } else if (type === 'checklist') {
    config.items = rawContent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text, done: false }));
  } else if (type === 'counter') {
    config.value = Number($('widget-counter-start').value) || 0;
    config.goal = Math.max(1, Number($('widget-counter-goal').value) || 10);
  } else if (type === 'timer') {
    config.minutes = Math.max(1, Number($('widget-timer-minutes').value) || 25);
  }

  const payload = {
    user_id: state.user.id,
    title,
    type,
    content: JSON.stringify(config)
  };

  const { data, error } = await sb.from('custom_widgets').insert(payload).select().single();

  if (!error && data) {
    state.customWidgets.push(data);
  } else {
    const fallback = { ...payload, id: `local_${Date.now()}` };
    state.customWidgets.push(fallback);
    localStorage.setItem(
      `zendeck_custom_widgets_${state.user.id}`,
      JSON.stringify(state.customWidgets)
    );
  }

  closeModal('widget-modal');
  renderCustomWidgets();
  showToast('Widget creado');
}

function renderCustomWidgets() {
  document.querySelectorAll('.custom-zen-widget').forEach((el) => el.remove());

  state.customWidgets.forEach((w) => {
    let cfg = {};
    try {
      cfg = typeof w.content === 'string' ? JSON.parse(w.content) : w.content || {};
    } catch {
      cfg = { text: String(w.content || '') };
    }

    const targetMod = $(cfg.module || 'dashboard-module') || $('dashboard-module');
    const dropzone = targetMod.classList.contains('module-dropzone')
      ? targetMod
      : targetMod.querySelector('.module-dropzone');
    if (!dropzone) return;

    const wid = `custom-${w.id}`;
    const article = document.createElement('article');
    article.className = `glass-card widget-card hover-glass zen-widget custom-zen-widget ${
      cfg.size && cfg.size !== '1x1' ? `size-${cfg.size}` : ''
    }`;
    article.draggable = true;
    article.dataset.widgetId = wid;
    article.dataset.widgetTitle = w.title;
    article.dataset.defaultSize = cfg.size || '1x1';

    let bodyHtml = '';
    if (w.type === 'note') {
      const formatted = escapeHtml(cfg.text || '').replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="link-btn">$1</a>'
      );
      bodyHtml = `<div style="white-space:pre-wrap;font-size:0.88rem;color:var(--text-secondary);">${formatted}</div>`;
    } else if (w.type === 'checklist') {
      const items = cfg.items || [];
      bodyHtml = `<ul class="glass-list">${items
        .map(
          (it, i) => `
          <li class="${it.done ? 'completed' : ''}">
            <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;flex:1;">
              <input type="checkbox" data-cw-check="${w.id}" data-idx="${i}" ${it.done ? 'checked' : ''} />
              <span>${escapeHtml(it.text)}</span>
            </label>
          </li>`
        )
        .join('')}</ul>`;
    } else if (w.type === 'counter') {
      const val = Number(cfg.value) || 0;
      const goal = Math.max(1, Number(cfg.goal) || 10);
      const pct = Math.min(100, Math.round((val / goal) * 100));
      bodyHtml = `
        <div class="big-metric" style="text-align:center;">${val} <span class="muted-text">/ ${goal}</span></div>
        <div class="prob-bar-bg"><div class="prob-bar-fill" style="width:${pct}%;"></div></div>
        <div class="inline-form" style="justify-content:center;margin-top:auto;">
          <button type="button" class="glass-btn" data-cw-step="${w.id}" data-delta="-1">-1</button>
          <button type="button" class="glass-btn primary" data-cw-step="${w.id}" data-delta="1">+1</button>
        </div>
      `;
    } else if (w.type === 'timer') {
      const secs = (Number(cfg.minutes) || 25) * 60;
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      bodyHtml = `
        <div id="cw-timer-display-${w.id}" class="big-metric" style="text-align:center;font-variant-numeric:tabular-nums;">${mm}:${ss}</div>
        <div class="inline-form" style="justify-content:center;margin-top:auto;">
          <button type="button" class="glass-btn primary" data-cw-timer-start="${w.id}" data-secs="${secs}">Iniciar</button>
          <button type="button" class="glass-btn" data-cw-timer-reset="${w.id}" data-secs="${secs}">Reiniciar</button>
        </div>
      `;
    }

    article.innerHTML = `
      <div class="widget-header">
        <div class="header-title-group">
          <span class="drag-handle" title="Arrastrar">⋮⋮</span>
          <h3>${escapeHtml(w.title)}</h3>
          <span class="glass-pill">${escapeHtml(cfg.tag || 'Personal')}</span>
        </div>
        <div class="header-controls">
          <button type="button" class="icon-btn resize-btn hover-glass" data-resize="${wid}">⤢</button>
          <button type="button" class="icon-btn hover-glass" data-cw-delete="${w.id}" title="Eliminar">🗑</button>
        </div>
      </div>
      ${bodyHtml}
    `;

    dropzone.appendChild(article);
  });

  bindCustomWidgetEvents();
}

function bindCustomWidgetEvents() {
  document.querySelectorAll('[data-cw-delete]').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.cwDelete;
      if (!String(id).startsWith('local_')) {
        await sb.from('custom_widgets').delete().eq('id', id);
      }
      state.customWidgets = state.customWidgets.filter((w) => String(w.id) !== String(id));
      localStorage.setItem(
        `zendeck_custom_widgets_${state.user.id}`,
        JSON.stringify(state.customWidgets)
      );
      renderCustomWidgets();
      showToast('Widget eliminado');
    };
  });

  document.querySelectorAll('[data-cw-check]').forEach((chk) => {
    chk.onchange = async () => {
      const w = state.customWidgets.find((x) => String(x.id) === String(chk.dataset.cwCheck));
      if (!w) return;
      const cfg = JSON.parse(w.content);
      cfg.items[Number(chk.dataset.idx)].done = chk.checked;
      w.content = JSON.stringify(cfg);
      if (!String(w.id).startsWith('local_')) {
        await sb.from('custom_widgets').update({ content: w.content }).eq('id', w.id);
      }
      renderCustomWidgets();
    };
  });

  document.querySelectorAll('[data-cw-step]').forEach((btn) => {
    btn.onclick = async () => {
      const w = state.customWidgets.find((x) => String(x.id) === String(btn.dataset.cwStep));
      if (!w) return;
      const cfg = JSON.parse(w.content);
      cfg.value = Math.max(0, (Number(cfg.value) || 0) + Number(btn.dataset.delta));
      w.content = JSON.stringify(cfg);
      if (!String(w.id).startsWith('local_')) {
        await sb.from('custom_widgets').update({ content: w.content }).eq('id', w.id);
      }
      renderCustomWidgets();
    };
  });

  document.querySelectorAll('[data-cw-timer-start]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.cwTimerStart;
      if (state.timerIntervals[id]) {
        clearInterval(state.timerIntervals[id]);
        delete state.timerIntervals[id];
        btn.textContent = 'Iniciar';
        return;
      }
      let remaining = Number(btn.dataset.currentSecs || btn.dataset.secs);
      btn.textContent = 'Pausar';
      state.timerIntervals[id] = setInterval(() => {
        remaining -= 1;
        btn.dataset.currentSecs = remaining;
        const disp = $(`cw-timer-display-${id}`);
        if (disp) {
          const mm = String(Math.max(0, Math.floor(remaining / 60))).padStart(2, '0');
          const ss = String(Math.max(0, remaining % 60)).padStart(2, '0');
          disp.textContent = `${mm}:${ss}`;
        }
        if (remaining <= 0) {
          clearInterval(state.timerIntervals[id]);
          delete state.timerIntervals[id];
          btn.textContent = 'Iniciar';
          showToast('¡Temporizador finalizado!');
        }
      }, 1000);
    };
  });

  document.querySelectorAll('[data-cw-timer-reset]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.cwTimerReset;
      if (state.timerIntervals[id]) {
        clearInterval(state.timerIntervals[id]);
        delete state.timerIntervals[id];
      }
      const secs = Number(btn.dataset.secs);
      const startBtn = document.querySelector(`[data-cw-timer-start="${id}"]`);
      if (startBtn) {
        startBtn.textContent = 'Iniciar';
        startBtn.dataset.currentSecs = secs;
      }
      const disp = $(`cw-timer-display-${id}`);
      if (disp) {
        const mm = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss = String(secs % 60).padStart(2, '0');
        disp.textContent = `${mm}:${ss}`;
      }
    };
  });
}

/* ==========================================================================
   5. MÓDULO 1: NUEVOS WIDGETS (PULSO, POMODORO, HÁBITOS, BLOC DE NOTAS) + CLIMA/DIVISAS
   ========================================================================== */
function updatePulseWidget() {
  const disp = state.finDisplayCurrency || 'HNL';
  const netWorth = state.accounts.reduce(
    (sum, acc) => sum + convertAmount(acc.balance, acc.currency, disp),
    0
  );
  const nwEl = $('pulse-networth');
  if (nwEl) nwEl.textContent = formatMoney(netWorth, disp);

  const pendingTodos = state.todos.filter((t) => !(t.completed ?? t.is_completed)).length;
  const tdEl = $('pulse-todos');
  if (tdEl) tdEl.textContent = `${pendingTodos} activa${pendingTodos === 1 ? '' : 's'}`;

  const evEl = $('pulse-next-event');
  if (evEl) {
    const nextCal = state.calendarEvents[0];
    const upcomingRem = state.reminders.find((r) => new Date(r.remind_at || r.due_date).getTime() >= Date.now());
    if (nextCal) {
      evEl.textContent = nextCal.title;
    } else if (upcomingRem) {
      evEl.textContent = upcomingRem.title;
    } else {
      evEl.textContent = 'Sin pendientes próximos';
    }
  }
}

function initPomodoroWidget() {
  const renderPomo = () => {
    const total = state.pomo.modeMins * 60;
    const rem = Math.max(0, state.pomo.remainingSecs);
    const mm = String(Math.floor(rem / 60)).padStart(2, '0');
    const ss = String(rem % 60).padStart(2, '0');
    $('pomo-display').textContent = `${mm}:${ss}`;
    $('pomo-progress-bar').style.width = `${Math.round((rem / total) * 100)}%`;
    $('pomo-sessions-pill').textContent = `${state.pomo.sessionsToday} sesion${
      state.pomo.sessionsToday === 1 ? '' : 'es'
    }`;
  };

  $('pomo-mode-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    if (state.pomo.intervalId) {
      clearInterval(state.pomo.intervalId);
      state.pomo.intervalId = null;
      $('pomo-toggle-btn').textContent = '▶ Iniciar';
    }
    state.pomo.modeMins = Number(btn.dataset.pomoMins) || 25;
    state.pomo.remainingSecs = state.pomo.modeMins * 60;
    $('pomo-mode-tabs').querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderPomo();
  });

  $('pomo-toggle-btn').addEventListener('click', () => {
    if (state.pomo.intervalId) {
      clearInterval(state.pomo.intervalId);
      state.pomo.intervalId = null;
      $('pomo-toggle-btn').textContent = '▶ Continuar';
      return;
    }

    $('pomo-toggle-btn').textContent = '⏸ Pausar';
    state.pomo.intervalId = setInterval(() => {
      state.pomo.remainingSecs -= 1;
      if (state.pomo.remainingSecs <= 0) {
        clearInterval(state.pomo.intervalId);
        state.pomo.intervalId = null;
        if (state.pomo.modeMins === 25) state.pomo.sessionsToday += 1;
        state.pomo.remainingSecs = state.pomo.modeMins * 60;
        $('pomo-toggle-btn').textContent = '▶ Iniciar';
        showToast('¡Bloque Pomodoro completado!');
      }
      renderPomo();
    }, 1000);
  });

  $('pomo-reset-btn').addEventListener('click', () => {
    if (state.pomo.intervalId) {
      clearInterval(state.pomo.intervalId);
      state.pomo.intervalId = null;
    }
    state.pomo.remainingSecs = state.pomo.modeMins * 60;
    $('pomo-toggle-btn').textContent = '▶ Iniciar';
    renderPomo();
  });

  renderPomo();
}

function initScratchpadAndHabits() {
  const uid = state.user?.id || 'guest';

  // 1. Bloc de Notas Rápido
  const padKey = `zendeck_scratchpad_${uid}`;
  const padInput = $('quick-scratchpad-input');
  const padStatus = $('scratchpad-status');
  padInput.value = localStorage.getItem(padKey) || '';

  let saveTimer = null;
  padInput.addEventListener('input', () => {
    padStatus.textContent = 'Escribiendo...';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(padKey, padInput.value);
      padStatus.textContent = 'Guardado ✓';
    }, 350);
  });

  $('copy-scratchpad-btn').onclick = async () => {
    if (!padInput.value.trim()) return;
    await navigator.clipboard?.writeText(padInput.value);
    showToast('Notas copiadas al portapapeles');
  };

  $('clear-scratchpad-btn').onclick = () => {
    padInput.value = '';
    localStorage.removeItem(padKey);
    padStatus.textContent = 'Limpio';
  };

  // 2. Hábitos Diarios (reinicia marcas cada día)
  const habitsKey = `zendeck_habits_${uid}`;
  const today = todayISO();
  let stored = JSON.parse(localStorage.getItem(habitsKey) || 'null');

  if (!stored || !Array.isArray(stored.items)) {
    stored = {
      date: today,
      items: [
        { id: 'h1', name: '💧 Tomar 2L de agua', done: false },
        { id: 'h2', name: '💻 1h de práctica / código', done: false },
        { id: 'h3', name: '🏃 Actividad física', done: false }
      ]
    };
  } else if (stored.date !== today) {
    stored.date = today;
    stored.items = stored.items.map((h) => ({ ...h, done: false }));
  }

  state.habits = stored.items;
  const saveHabits = () => {
    localStorage.setItem(habitsKey, JSON.stringify({ date: todayISO(), items: state.habits }));
  };

  const renderHabits = () => {
    const doneCount = state.habits.filter((h) => h.done).length;
    const total = state.habits.length;
    $('habits-counter').textContent = `${doneCount}/${total}`;
    $('habits-progress-bar').style.width = `${total ? Math.round((doneCount / total) * 100) : 0}%`;

    const list = $('habits-list');
    list.innerHTML = state.habits
      .map(
        (h) => `
        <li class="${h.done ? 'completed' : ''}">
          <label style="display:flex;align-items:center;gap:0.55rem;cursor:pointer;flex:1;">
            <input type="checkbox" data-toggle-habit="${escapeHtml(h.id)}" ${h.done ? 'checked' : ''} />
            <span>${escapeHtml(h.name)}</span>
          </label>
          <button type="button" class="icon-btn" data-del-habit="${escapeHtml(h.id)}">✕</button>
        </li>`
      )
      .join('');

    list.querySelectorAll('[data-toggle-habit]').forEach((chk) => {
      chk.addEventListener('change', () => {
        const item = state.habits.find((x) => x.id === chk.dataset.toggleHabit);
        if (item) {
          item.done = chk.checked;
          saveHabits();
          renderHabits();
        }
      });
    });

    list.querySelectorAll('[data-del-habit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.habits = state.habits.filter((x) => x.id !== btn.dataset.delHabit);
        saveHabits();
        renderHabits();
      });
    });
  };

  $('habit-form').onsubmit = (e) => {
    e.preventDefault();
    const name = $('habit-input').value.trim();
    if (!name) return;
    state.habits.push({ id: `h_${Date.now()}`, name, done: false });
    saveHabits();
    renderHabits();
    e.target.reset();
  };

  renderHabits();
}

function initWeatherControls() {
  $('toggle-city-search-btn').addEventListener('click', () => {
    $('city-search-box').classList.toggle('hidden');
  });

  $('city-search-btn').addEventListener('click', async () => {
    const q = $('city-search-input').value.trim();
    if (!q) return;
    const resList = $('city-results-list');
    resList.innerHTML = '<span class="muted-text">Buscando...</span>';

    try {
      const res = await fetch(
        `[https://geocoding-api.open-meteo.com/v1/search?name=$](https://geocoding-api.open-meteo.com/v1/search?name=$){encodeURIComponent(q)}&count=5&language=es`
      );
      const data = await res.json();
      const results = data.results || [];
      if (!results.length) {
        resList.innerHTML = '<span class="muted-text">Sin resultados</span>';
        return;
      }
      resList.innerHTML = results
        .map(
          (c) => `
          <button type="button" class="icon-btn" data-lat="${c.latitude}" data-lon="${c.longitude}" data-name="${escapeHtml(
            `${c.name}, ${c.country_code || ''}`
          )}">
            ${escapeHtml(c.name)} (${escapeHtml(c.country_code || '')})
          </button>`
        )
        .join('');

      resList.querySelectorAll('button').forEach((b) => {
        b.addEventListener('click', () => {
          state.weatherCity = {
            name: b.dataset.name,
            lat: Number(b.dataset.lat),
            lon: Number(b.dataset.lon)
          };
          localStorage.setItem('zendeck_weather_city', JSON.stringify(state.weatherCity));
          $('city-search-box').classList.add('hidden');
          fetchWeather();
        });
      });
    } catch {
      resList.innerHTML = '<span class="muted-text">Error buscando ciudad</span>';
    }
  });
}

async function fetchWeather() {
  const { name, lat, lon } = state.weatherCity;
  $('weather-city-label').textContent = name;
  try {
    const res = await fetch(
      `[https://api.open-meteo.com/v1/forecast?latitude=$](https://api.open-meteo.com/v1/forecast?latitude=$){lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`
    );
    const data = await res.json();
    const cur = data.current;
    if (!cur) return;

    const code = cur.weather_code;
    const map = {
      0: ['☀️', 'Despejado'],
      1: ['🌤️', 'Mayormente despejado'],
      2: ['⛅', 'Parcialmente nublado'],
      3: ['☁️', 'Nublado'],
      45: ['🌫️', 'Neblina'],
      51: ['🌦️', 'Llovizna ligera'],
      61: ['🌧️', 'Lluvia'],
      80: ['🌦️', 'Chubascos'],
      95: ['⛈️', 'Tormenta eléctrica']
    };
    const [icon, desc] = map[code] || (code >= 60 ? ['🌧️', 'Lluvioso'] : ['⛅', 'Templado']);

    $('weather-icon').textContent = icon;
    $('weather-temp').textContent = `${Math.round(cur.temperature_2m)}°C`;
    $('weather-desc').textContent = desc;
    $('weather-wind').textContent = `Viento: ${Math.round(cur.wind_speed_10m)} km/h`;
  } catch {
    $('weather-desc').textContent = 'Sin conexión al clima';
  }
}

async function fetchExchangeRates() {
  const cached = JSON.parse(localStorage.getItem('zendeck_fx_cache') || 'null');
  if (cached && Date.now() - cached.ts < 3600000 && cached.rates) {
    state.rates = { ...state.rates, ...cached.rates };
    return;
  }
  try {
    const res = await fetch('[https://open.er-api.com/v6/latest/USD](https://open.er-api.com/v6/latest/USD)');
    const data = await res.json();
    if (data?.rates) {
      state.rates = { ...state.rates, ...data.rates };
      localStorage.setItem('zendeck_fx_cache', JSON.stringify({ ts: Date.now(), rates: state.rates }));
    }
  } catch {
    // Mantiene tasas de respaldo
  }
}

function initCurrencyWidget() {
  const fromSel = $('currency-from');
  const toSel = $('currency-to');
  const codes = Object.keys(CURRENCY_NAMES);

  const optionsHtml = codes
    .map((c) => `<option value="${c}">${CURRENCY_NAMES[c]}</option>`)
    .join('');
  fromSel.innerHTML = optionsHtml;
  toSel.innerHTML = optionsHtml;
  fromSel.value = 'USD';
  toSel.value = 'HNL';

  const recalc = () => {
    const from = fromSel.value;
    const to = toSel.value;
    const amount = Number($('currency-amount-input').value) || 0;
    const unitRate = convertAmount(1, from, to);
    const total = convertAmount(amount, from, to);

    $('currency-from-code').textContent = from;
    $('rate-label').textContent = `1 ${from} equivale a`;
    $('exchange-rate-value').textContent = `${unitRate.toFixed(4)} ${to}`;
    $('currency-output').textContent = formatMoney(total, to);
  };

  fromSel.addEventListener('change', recalc);
  toSel.addEventListener('change', recalc);
  $('currency-amount-input').addEventListener('input', recalc);
  $('swap-currency-btn').addEventListener('click', () => {
    const tmp = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = tmp;
    recalc();
  });

  recalc();
}

// Accesos Rápidos
async function loadQuickLinks() {
  const { data } = await sb
    .from('quick_links')
    .select('*')
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: true });
  state.links = data || [];
  renderQuickLinks();
}

function renderQuickLinks() {
  const grid = $('links-grid');
  $('links-counter').textContent = `${state.links.length} links`;
  grid.innerHTML = state.links
    .map(
      (l) => `
      <div class="link-tile">
        <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.title)}</a>
        <button type="button" class="icon-btn" data-del-link="${l.id}" style="padding:0.15rem 0.35rem;">✕</button>
      </div>`
    )
    .join('');

  grid.querySelectorAll('[data-del-link]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await sb.from('quick_links').delete().eq('id', btn.dataset.delLink);
      state.links = state.links.filter((x) => String(x.id) !== String(btn.dataset.delLink));
      renderQuickLinks();
    });
  });
}

// Tareas Pendientes
async function loadTodos() {
  const { data } = await sb
    .from('todos')
    .select('*')
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: false });
  state.todos = data || [];
  renderTodos();
}

function renderTodos() {
  const list = $('todo-list');
  const pending = state.todos.filter((t) => !(t.completed ?? t.is_completed)).length;
  $('todo-counter').textContent = `${pending} pendientes`;
  updatePulseWidget();

  list.innerHTML = state.todos
    .map((t) => {
      const done = Boolean(t.completed ?? t.is_completed);
      const label = t.title || t.task || '';
      return `
        <li class="${done ? 'completed' : ''}">
          <label style="display:flex;align-items:center;gap:0.55rem;cursor:pointer;flex:1;">
            <input type="checkbox" data-toggle-todo="${t.id}" ${done ? 'checked' : ''} />
            <span>${escapeHtml(label)}</span>
          </label>
          <button type="button" class="icon-btn" data-del-todo="${t.id}">✕</button>
        </li>`;
    })
    .join('');

  list.querySelectorAll('[data-toggle-todo]').forEach((chk) => {
    chk.addEventListener('change', async () => {
      const todo = state.todos.find((x) => String(x.id) === String(chk.dataset.toggleTodo));
      if (!todo) return;
      const field = 'completed' in todo ? 'completed' : 'is_completed';
      todo[field] = chk.checked;
      await sb.from('todos').update({ [field]: chk.checked }).eq('id', todo.id);
      renderTodos();
    });
  });

  list.querySelectorAll('[data-del-todo]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await sb.from('todos').delete().eq('id', btn.dataset.delTodo);
      state.todos = state.todos.filter((x) => String(x.id) !== String(btn.dataset.delTodo));
      renderTodos();
    });
  });
}

// Recordatorios
async function loadReminders() {
  const { data } = await sb
    .from('reminders')
    .select('*')
    .eq('user_id', state.user.id);
  state.reminders = (data || []).sort(
    (a, b) => new Date(a.remind_at || a.due_date || 0) - new Date(b.remind_at || b.due_date || 0)
  );
  renderReminders();
}

function renderReminders() {
  const list = $('reminder-list');
  updatePulseWidget();
  list.innerHTML = state.reminders
    .map((r) => {
      const dt = new Date(r.remind_at || r.due_date);
      const isPast = dt.getTime() < Date.now();
      const dateStr = isNaN(dt)
        ? ''
        : dt.toLocaleString('es-HN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <li>
          <div>
            <strong>${escapeHtml(r.title)}</strong>
            <div class="muted-text" style="font-size:0.76rem;color:${isPast ? '#fda4af' : 'var(--text-muted)'};">${dateStr}</div>
          </div>
          <button type="button" class="icon-btn" data-del-rem="${r.id}">✕</button>
        </li>`;
    })
    .join('');

  list.querySelectorAll('[data-del-rem]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await sb.from('reminders').delete().eq('id', btn.dataset.delRem);
      state.reminders = state.reminders.filter((x) => String(x.id) !== String(btn.dataset.delRem));
      renderReminders();
    });
  });
}

function initDashboardForms() {
  $('link-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    let url = $('link-url').value.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    let title = $('link-title').value.trim();
    if (!title) {
      try {
        title = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        title = url;
      }
    }

    const { data, error } = await sb
      .from('quick_links')
      .insert({ user_id: state.user.id, title, url })
      .select()
      .single();

    if (!error && data) {
      state.links.push(data);
      renderQuickLinks();
      e.target.reset();
    }
  });

  $('todo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('todo-input').value.trim();
    if (!title) return;

    const { data, error } = await sb
      .from('todos')
      .insert({ user_id: state.user.id, title, completed: false })
      .select()
      .single();

    if (!error && data) {
      state.todos.unshift(data);
      renderTodos();
      e.target.reset();
    }
  });

  $('reminder-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('reminder-title').value.trim();
    const rawDate = $('reminder-date').value;
    if (!title || !rawDate) return;

    const { data, error } = await sb
      .from('reminders')
      .insert({ user_id: state.user.id, title, remind_at: new Date(rawDate).toISOString() })
      .select()
      .single();

    if (!error && data) {
      state.reminders.push(data);
      renderReminders();
      e.target.reset();
    }
  });
}

/* ==========================================================================
   6. MÓDULO 2: PANEL DE VIDA (GMAIL + OUTLOOK + APPLE CALENDAR .ICS)
   ========================================================================== */
function initLifeModule() {
  $('google-client-id-input').value = state.googleClientId;
  $('outlook-client-id-input').value = state.outlookClientId;

  $('toggle-google-config-btn').addEventListener('click', () => {
    $('google-config-panel').classList.toggle('hidden');
  });

  $('close-google-config-btn').addEventListener('click', () => {
    $('google-config-panel').classList.add('hidden');
  });

  $('google-client-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.googleClientId = $('google-client-id-input').value.trim();
    localStorage.setItem('zendeck_google_client_id', state.googleClientId);
    showToast('Google Client ID guardado');
  });

  $('outlook-client-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.outlookClientId = $('outlook-client-id-input').value.trim();
    localStorage.setItem('zendeck_outlook_client_id', state.outlookClientId);
    showToast('Outlook Application ID guardado');
  });

  $('ics-calendar-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    let rawUrl = $('ics-calendar-url-input').value.trim();
    if (!rawUrl) return;
    if (rawUrl.startsWith('webcal://')) {
      rawUrl = rawUrl.replace(/^webcal:\/\//i, 'https://');
    }
    if (!state.icsUrls.includes(rawUrl)) {
      state.icsUrls.push(rawUrl);
      localStorage.setItem('zendeck_ics_urls', JSON.stringify(state.icsUrls));
    }
    $('ics-calendar-url-input').value = '';
    renderLifeConnectionsUI();
    await syncIcsCalendars();
    showToast('Calendario .ics vinculado');
  });

  $('ics-file-input').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseIcsText(String(reader.result || ''), 'apple');
      state.localIcsEvents = parsed;
      localStorage.setItem('zendeck_local_ics_events', JSON.stringify(parsed));
      mergeAndRenderAllCalendarEvents();
      renderLifeConnectionsUI();
      showToast(`${parsed.length} eventos importados desde archivo .ics`);
    };
    reader.readAsText(file);
  });

  $('connect-google-btn').addEventListener('click', () => {
    if (!state.googleClientId) {
      $('google-config-panel').classList.remove('hidden');
      showToast('Ingresa tu Google OAuth Client ID primero');
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      showToast('El SDK de Google aún está cargando, intenta en un segundo');
      return;
    }
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: state.googleClientId,
      scope:
        '[https://www.googleapis.com/auth/gmail.readonly](https://www.googleapis.com/auth/gmail.readonly) [https://www.googleapis.com/auth/calendar.readonly](https://www.googleapis.com/auth/calendar.readonly)',
      callback: async (resp) => {
        if (resp?.access_token) {
          state.googleToken = resp.access_token;
          renderLifeConnectionsUI();
          await syncGoogleData();
          showToast('Google conectado y sincronizado');
        }
      }
    });
    tokenClient.requestAccessToken();
  });

  $('connect-outlook-btn').addEventListener('click', () => {
    if (!state.outlookClientId) {
      $('google-config-panel').classList.remove('hidden');
      showToast('Ingresa tu Microsoft Outlook Client ID primero');
      return;
    }
    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl =
      `[https://login.microsoftonline.com/common/oauth2/v2.0/authorize](https://login.microsoftonline.com/common/oauth2/v2.0/authorize)` +
      `?client_id=${encodeURIComponent(state.outlookClientId)}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent('User.Read Mail.Read Calendars.Read')}` +
      `&prompt=select_account`;

    const popup = window.open(authUrl, 'zen_outlook_auth', 'width=520,height=640');
    const timer = setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(timer);
          return;
        }
        if (popup.location.origin === window.location.origin && popup.location.hash) {
          const params = new URLSearchParams(popup.location.hash.substring(1));
          const token = params.get('access_token');
          if (token) {
            state.outlookToken = token;
            popup.close();
            clearInterval(timer);
            renderLifeConnectionsUI();
            syncOutlookData().then(() => showToast('Outlook conectado y sincronizado'));
          }
        }
      } catch {
        // Esperando redirección al mismo origen
      }
    }, 500);
  });

  $('sync-google-btn').addEventListener('click', async () => {
    showToast('Sincronizando Panel de Vida...');
    await Promise.all([
      state.googleToken ? syncGoogleData() : Promise.resolve(),
      state.outlookToken ? syncOutlookData() : Promise.resolve(),
      state.icsUrls.length ? syncIcsCalendars() : Promise.resolve()
    ]);
    showToast('Sincronización completada');
  });

  $('mail-source-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    state.mailSourceFilter = btn.dataset.mailSource;
    $('mail-source-filters').querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderMails();
  });

  $('calendar-source-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    state.calSourceFilter = btn.dataset.calSource;
    $('calendar-source-filters').querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderCalendarEvents();
  });
}

function renderLifeConnectionsUI() {
  const gPill = $('google-status-pill');
  const oPill = $('outlook-status-pill');
  const iPill = $('ics-status-pill');

  gPill.textContent = state.googleToken ? 'Google • Conectado' : 'Google • Desconectado';
  gPill.classList.toggle('high-prob', Boolean(state.googleToken));

  oPill.textContent = state.outlookToken ? 'Outlook • Conectado' : 'Outlook • Desconectado';
  oPill.classList.toggle('high-prob', Boolean(state.outlookToken));

  const icsCount = state.icsUrls.length + (state.localIcsEvents.length ? 1 : 0);
  iPill.textContent = icsCount ? `Apple .ics • ${icsCount} activo(s)` : 'Apple .ics • Sin vincular';
  iPill.classList.toggle('high-prob', icsCount > 0);

  const anyConnected = Boolean(state.googleToken || state.outlookToken || state.icsUrls.length);
  $('sync-google-btn').classList.toggle('hidden', !anyConnected);

  const icsList = $('ics-sources-list');
  icsList.innerHTML = state.icsUrls
    .map(
      (u, idx) => `
      <li>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:78%;font-size:0.78rem;">${escapeHtml(u)}</span>
        <button type="button" class="icon-btn" data-remove-ics="${idx}">Quitar</button>
      </li>`
    )
    .join('');

  icsList.querySelectorAll('[data-remove-ics]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.icsUrls.splice(Number(btn.dataset.removeIcs), 1);
      localStorage.setItem('zendeck_ics_urls', JSON.stringify(state.icsUrls));
      renderLifeConnectionsUI();
      mergeAndRenderAllCalendarEvents();
    });
  });
}

async function syncGoogleData() {
  if (!state.googleToken) return;
  const headers = { Authorization: `Bearer ${state.googleToken}` };

  try {
    const listRes = await fetch(
      '[https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&labelIds=INBOX](https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&labelIds=INBOX)',
      { headers }
    );
    const listData = await listRes.json();
    const msgs = listData.messages || [];

    const details = await Promise.all(
      msgs.map((m) =>
        fetch(
          `[https://gmail.googleapis.com/gmail/v1/users/me/messages/$](https://gmail.googleapis.com/gmail/v1/users/me/messages/$){m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers }
        ).then((r) => r.json())
      )
    );

    const gmailItems = details.map((d) => {
      const hdrs = d.payload?.headers || [];
      const getH = (name) => hdrs.find((h) => h.name.toLowerCase() === name)?.value || '';
      return {
        id: `gmail_${d.id}`,
        source: 'gmail',
        subject: getH('subject') || '(Sin asunto)',
        from: getH('from').replace(/<.*>/, '').trim() || 'Remitente',
        date: new Date(getH('date') || Date.now()).getTime(),
        url: `[https://mail.google.com/mail/u/0/#inbox/$](https://mail.google.com/mail/u/0/#inbox/$){d.id}`
      };
    });

    state.mails = [...state.mails.filter((m) => m.source !== 'gmail'), ...gmailItems].sort(
      (a, b) => b.date - a.date
    );
    renderMails();
  } catch {
    showToast('Error al leer correos de Gmail');
  }

  try {
    const timeMin = new Date().toISOString();
    const calRes = await fetch(
      `[https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=$](https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=$){encodeURIComponent(
        timeMin
      )}&maxResults=15&singleEvents=true&orderBy=startTime`,
      { headers }
    );
    const calData = await calRes.json();
    state._googleEvents = (calData.items || []).map((ev) => ({
      id: `gcal_${ev.id}`,
      source: 'google',
      title: ev.summary || '(Evento sin título)',
      start: new Date(ev.start?.dateTime || ev.start?.date).getTime(),
      location: ev.location || ''
    }));
    mergeAndRenderAllCalendarEvents();
  } catch {
    showToast('Error al leer Google Calendar');
  }
}

async function syncOutlookData() {
  if (!state.outlookToken) return;
  const headers = { Authorization: `Bearer ${state.outlookToken}` };

  try {
    const res = await fetch(
      '[https://graph.microsoft.com/v1.0/me/messages?$top=10&$select=id,subject,from,receivedDateTime,webLink](https://graph.microsoft.com/v1.0/me/messages?$top=10&$select=id,subject,from,receivedDateTime,webLink)',
      { headers }
    );
    const data = await res.json();
    const outlookItems = (data.value || []).map((m) => ({
      id: `outlook_${m.id}`,
      source: 'outlook',
      subject: m.subject || '(Sin asunto)',
      from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || 'Outlook',
      date: new Date(m.receivedDateTime).getTime(),
      url: m.webLink || '[https://outlook.live.com/mail/](https://outlook.live.com/mail/)'
    }));

    state.mails = [...state.mails.filter((m) => m.source !== 'outlook'), ...outlookItems].sort(
      (a, b) => b.date - a.date
    );
    renderMails();
  } catch {
    showToast('Error al leer correos de Outlook');
  }

  try {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 86400000).toISOString();
    const res = await fetch(
      `[https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=$](https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=$){encodeURIComponent(
        start
      )}&endDateTime=${encodeURIComponent(end)}&$top=15&$select=id,subject,start,location`,
      { headers }
    );
    const data = await res.json();
    state._outlookEvents = (data.value || []).map((ev) => ({
      id: `ocal_${ev.id}`,
      source: 'outlook',
      title: ev.subject || '(Evento Outlook)',
      start: new Date(ev.start?.dateTime + 'Z').getTime(),
      location: ev.location?.displayName || ''
    }));
    mergeAndRenderAllCalendarEvents();
  } catch {
    showToast('Error al leer calendario de Outlook');
  }
}

async function syncIcsCalendars() {
  const remoteEvents = [];
  for (const url of state.icsUrls) {
    const proxies = [
      url,
      `[https://api.allorigins.win/raw?url=$](https://api.allorigins.win/raw?url=$){encodeURIComponent(url)}`,
      `[https://corsproxy.io/?$](https://corsproxy.io/?$){encodeURIComponent(url)}`
    ];
    for (const target of proxies) {
      try {
        const res = await fetch(target);
        if (!res.ok) continue;
        const text = await res.text();
        if (text.includes('BEGIN:VCALENDAR')) {
          remoteEvents.push(...parseIcsText(text, 'apple'));
          break;
        }
      } catch {
        // Probar siguiente proxy
      }
    }
  }
  state._remoteIcsEvents = remoteEvents;
  mergeAndRenderAllCalendarEvents();
}

function parseIcsText(icsText, source = 'apple') {
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  const events = [];
  let cur = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = {};
    } else if (line === 'END:VEVENT' && cur) {
      if (cur.title && cur.start && cur.start >= Date.now() - 86400000) {
        events.push({
          id: `ics_${cur.start}_${cur.title}`,
          source,
          title: cur.title,
          start: cur.start,
          location: cur.location || ''
        });
      }
      cur = null;
    } else if (cur) {
      if (line.startsWith('SUMMARY')) {
        cur.title = line.substring(line.indexOf(':') + 1).replace(/\\,/g, ',').replace(/\\n/g, ' ');
      } else if (line.startsWith('LOCATION')) {
        cur.location = line.substring(line.indexOf(':') + 1).replace(/\\,/g, ',');
      } else if (line.startsWith('DTSTART')) {
        const val = line.substring(line.indexOf(':') + 1).trim();
        cur.start = parseIcsDate(val);
      }
    }
  }
  return events;
}

function parseIcsDate(val) {
  if (/^\d{8}$/.test(val)) {
    const y = Number(val.slice(0, 4));
    const m = Number(val.slice(4, 6)) - 1;
    const d = Number(val.slice(6, 8));
    return new Date(y, m, d).getTime();
  }
  const m = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (m) {
    if (m[7] === 'Z') {
      return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    }
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
  }
  return Date.parse(val) || 0;
}

function mergeAndRenderAllCalendarEvents() {
  const all = [
    ...(state._googleEvents || []),
    ...(state._outlookEvents || []),
    ...(state._remoteIcsEvents || []),
    ...(state.localIcsEvents || [])
  ]
    .filter((ev) => ev.start >= Date.now() - 3600000)
    .sort((a, b) => a.start - b.start);

  state.calendarEvents = all;
  renderCalendarEvents();
  updatePulseWidget();
}

function renderMails() {
  const list = $('gmail-list');
  const filtered =
    state.mailSourceFilter === 'ALL'
      ? state.mails
      : state.mails.filter((m) => m.source === state.mailSourceFilter);

  if (!filtered.length) {
    list.innerHTML =
      '<li class="muted-text">No hay correos cargados para este filtro. Conecta Gmail u Outlook arriba.</li>';
    return;
  }

  list.innerHTML = filtered
    .slice(0, 15)
    .map((m) => {
      const badgeClass = m.source === 'outlook' ? 'badge-outlook' : 'badge-gmail';
      const label = m.source === 'outlook' ? 'Outlook' : 'Gmail';
      const dateStr = new Date(m.date).toLocaleDateString('es-HN', {
        month: 'short',
        day: 'numeric'
      });
      return `
        <li>
          <div style="min-width:0;flex:1;">
            <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.15rem;">
              <span class="source-badge ${badgeClass}">${label}</span>
              <strong style="font-size:0.8rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.from)}</strong>
            </div>
            <a href="${escapeHtml(m.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--text-secondary);text-decoration:none;font-size:0.83rem;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${escapeHtml(m.subject)}
            </a>
          </div>
          <span class="muted-text" style="font-size:0.75rem;flex-shrink:0;">${dateStr}</span>
        </li>`;
    })
    .join('');
}

function renderCalendarEvents() {
  const list = $('calendar-events-list');
  const filtered =
    state.calSourceFilter === 'ALL'
      ? state.calendarEvents
      : state.calendarEvents.filter((ev) => ev.source === state.calSourceFilter);

  $('calendar-count-pill').textContent = `${filtered.length} próximos`;

  if (!filtered.length) {
    list.innerHTML =
      '<li class="muted-text">Sin eventos próximos. Conecta Google, Outlook o vincula tu calendario Apple (.ics).</li>';
    return;
  }

  const badgeMap = {
    google: ['badge-google', 'Google'],
    apple: ['badge-apple', 'Apple .ics'],
    outlook: ['badge-outlook', 'Outlook']
  };

  list.innerHTML = filtered
    .slice(0, 18)
    .map((ev) => {
      const [bClass, bText] = badgeMap[ev.source] || ['badge-apple', 'Evento'];
      const dt = new Date(ev.start).toLocaleString('es-HN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      return `
        <li>
          <div style="min-width:0;flex:1;">
            <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.15rem;">
              <span class="source-badge ${bClass}">${bText}</span>
              <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(ev.title)}</strong>
            </div>
            <div class="muted-text" style="font-size:0.77rem;">${dt}${ev.location ? ` • ${escapeHtml(ev.location)}` : ''}</div>
          </div>
        </li>`;
    })
    .join('');
}

/* ==========================================================================
   7. MÓDULO 3: ASESOR FINANCIERO (CON RECUPERACIÓN DEFENSIVA DE PAGOS)
   ========================================================================== */
function normalizeTransaction(tx) {
  const rawDate = tx.date || tx.tx_date || tx.transaction_date || tx.created_at || todayISO();
  const cleanDate = String(rawDate).slice(0, 10);
  const rawAmt = Number(tx.amount ?? tx.monto ?? 0);
  const rawType = String(tx.type || tx.tx_type || (rawAmt < 0 ? 'expense' : 'expense')).toLowerCase();

  return {
    ...tx,
    type: rawType === 'income' || rawType === 'ingreso' ? 'income' : 'expense',
    amount: Math.abs(rawAmt),
    currency: tx.currency || tx.moneda || 'HNL',
    category: tx.category || tx.categoria || 'Otros',
    description: tx.description || tx.title || tx.concept || tx.concepto || 'Movimiento',
    date: /^\d{4}-\d{2}-\d{2}$/.test(cleanDate) ? cleanDate : todayISO(),
    is_recurring: Boolean(tx.is_recurring ?? tx.recurrente ?? false)
  };
}

function normalizePlanned(p) {
  const rawDate = p.next_date || p.due_date || p.date || p.created_at || todayISO();
  const cleanDate = String(rawDate).slice(0, 10);
  const rawType = String(p.type || p.plan_type || 'expense').toLowerCase();

  return {
    ...p,
    type: rawType === 'income' || rawType === 'ingreso' ? 'income' : 'expense',
    title: p.title || p.name || p.description || 'Planificado',
    amount: Math.abs(Number(p.amount ?? p.monto ?? 0)),
    currency: p.currency || p.moneda || 'USD',
    category: p.category || p.categoria || 'Suscripciones',
    frequency: p.frequency || p.frecuencia || 'mensual',
    next_date: /^\d{4}-\d{2}-\d{2}$/.test(cleanDate) ? cleanDate : todayISO()
  };
}

function initFinanceModule() {
  $('fin-tx-date').value = todayISO();
  $('fin-plan-date').value = todayISO();
  $('finance-display-currency').value = state.finDisplayCurrency;

  $('finance-display-currency').addEventListener('change', (e) => {
    state.finDisplayCurrency = e.target.value;
    localStorage.setItem('zendeck_fin_currency', state.finDisplayCurrency);
    renderFinanceAll();
  });

  $('finance-period-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-pill');
    if (!btn) return;
    state.finPeriodDays = btn.dataset.days;
    $('finance-period-filters').querySelectorAll('.nav-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderFinanceAll();
  });

  $('fin-donut-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    state.finDonutMode = btn.dataset.mode;
    $('fin-donut-tabs').querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderFinanceDonut();
  });

  // Crear Cuenta
  $('fin-account-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      user_id: state.user.id,
      name: $('fin-acc-name').value.trim(),
      type: $('fin-acc-type').value,
      balance: Number($('fin-acc-balance').value) || 0,
      currency: $('fin-acc-currency').value
    };
    const { data, error } = await sb.from('finance_accounts').insert(payload).select().single();
    if (!error && data) {
      state.accounts.push({ ...data, balance: Number(data.balance) || 0, currency: data.currency || 'HNL' });
      e.target.reset();
      renderFinanceAll();
      showToast('Cuenta agregada');
    } else if (error) {
      showToast(`Error creando cuenta: ${error.message}`);
    }
  });

  // Categorías
  $('toggle-new-cat-btn').addEventListener('click', () => {
    $('fin-category-panel').classList.toggle('hidden');
  });

  $('fin-category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('fin-cat-name').value.trim();
    const type = $('fin-cat-type').value;
    if (!name) return;

    const { data, error } = await sb
      .from('finance_categories')
      .insert({ user_id: state.user.id, name, type })
      .select()
      .single();

    if (!error && data) {
      state.categories.push(data);
    } else {
      state.categories.push({ id: `local_${Date.now()}`, name, type });
    }
    e.target.reset();
    populateFinanceSelects();
    showToast('Categoría creada');
  });

  // Registrar Movimiento (con respaldo si falta alguna columna opcional en Supabase)
  $('fin-tx-type').addEventListener('change', populateFinanceSelects);

  $('fin-tx-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.accounts.length) {
      showToast('Crea primero al menos una cuenta en "Mis Cuentas"');
      return;
    }

    const type = $('fin-tx-type').value;
    const amount = Math.abs(Number($('fin-tx-amount').value) || 0);
    const category = $('fin-tx-category').value || 'Otros';
    const accountId = $('fin-tx-account').value;
    const description = $('fin-tx-desc').value.trim();
    const date = $('fin-tx-date').value || todayISO();
    const is_recurring = $('fin-tx-recurring').checked;

    const acc = state.accounts.find((a) => String(a.id) === String(accountId));
    const currency = acc?.currency || 'HNL';

    const fullPayload = {
      user_id: state.user.id,
      account_id: accountId,
      type,
      amount,
      currency,
      category,
      description,
      date,
      is_recurring
    };

    let { data, error } = await sb.from('finance_transactions').insert(fullPayload).select().single();

    if (error) {
      // Reintento sin columnas opcionales (currency / is_recurring) por si la tabla aún no fue migrada
      const basePayload = {
        user_id: state.user.id,
        account_id: accountId,
        type,
        amount,
        category,
        description,
        date
      };
      const retry = await sb.from('finance_transactions').insert(basePayload).select().single();
      data = retry.data;
      error = retry.error;
    }

    if (!error && data) {
      state.transactions.unshift(normalizeTransaction({ ...fullPayload, ...data }));
      if (acc) {
        const delta = type === 'income' ? amount : -amount;
        acc.balance = Number(acc.balance) + delta;
        await sb.from('finance_accounts').update({ balance: acc.balance }).eq('id', acc.id);
      }
      e.target.reset();
      $('fin-tx-date').value = todayISO();
      renderFinanceAll();
      showToast('Movimiento registrado');
    } else if (error) {
      showToast(`Error al guardar movimiento: ${error.message}`);
    }
  });

  // Pagos Planificados
  $('toggle-new-plan-form-btn').addEventListener('click', () => {
    $('fin-planned-form').classList.toggle('hidden');
  });

  $('fin-planned-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      user_id: state.user.id,
      type: $('fin-plan-type').value,
      title: $('fin-plan-title').value.trim(),
      amount: Math.abs(Number($('fin-plan-amount').value) || 0),
      currency: $('fin-plan-currency').value,
      account_id: $('fin-plan-account').value || null,
      category: $('fin-plan-category').value || 'Suscripciones',
      frequency: $('fin-plan-frequency').value,
      next_date: $('fin-plan-date').value || todayISO()
    };

    const { data, error } = await sb.from('finance_planned').insert(payload).select().single();
    if (!error && data) {
      state.planned.push(normalizePlanned(data));
      e.target.reset();
      $('fin-plan-date').value = todayISO();
      $('fin-planned-form').classList.add('hidden');
      renderFinanceAll();
      showToast('Pago planificado guardado');
    } else if (error) {
      showToast(`Error al guardar planificado: ${error.message}`);
    }
  });

  $('fin-planned-type-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    state.finPlannedTypeFilter = btn.dataset.ptype;
    $('fin-planned-type-filters').querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderFinancePlanned();
  });

  $('fin-planned-search').addEventListener('input', (e) => {
    state.finPlannedSearch = e.target.value.toLowerCase();
    renderFinancePlanned();
  });

  $('close-confirm-plan-btn').addEventListener('click', () => closeModal('confirm-plan-modal'));
  $('confirm-plan-account').addEventListener('change', updatePlanConversionNote);
  $('confirm-plan-real-amount').addEventListener('input', updatePlanConversionNote);

  $('confirm-plan-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const planId = $('confirm-plan-id').value;
    const plan = state.planned.find((p) => String(p.id) === String(planId));
    if (!plan) return;

    const realAmount = Math.abs(Number($('confirm-plan-real-amount').value) || plan.amount);
    const accId = $('confirm-plan-account').value;
    const applyDate = $('confirm-plan-date').value || todayISO();
    const acc = state.accounts.find((a) => String(a.id) === String(accId));
    const targetCurrency = acc?.currency || plan.currency;
    const convertedAmt = convertAmount(realAmount, plan.currency, targetCurrency);

    const fullPayload = {
      user_id: state.user.id,
      account_id: accId,
      type: plan.type,
      amount: Number(convertedAmt.toFixed(2)),
      currency: targetCurrency,
      category: plan.category || 'Suscripciones',
      description: `${plan.title} (Planificado)`,
      date: applyDate,
      is_recurring: true
    };

    let { data: tx, error } = await sb.from('finance_transactions').insert(fullPayload).select().single();
    if (error) {
      const retry = await sb
        .from('finance_transactions')
        .insert({
          user_id: state.user.id,
          account_id: accId,
          type: plan.type,
          amount: Number(convertedAmt.toFixed(2)),
          category: plan.category || 'Suscripciones',
          description: `${plan.title} (Planificado)`,
          date: applyDate
        })
        .select()
        .single();
      tx = retry.data;
    }

    if (tx) state.transactions.unshift(normalizeTransaction({ ...fullPayload, ...tx }));

    if (acc) {
      const delta = plan.type === 'income' ? convertedAmt : -convertedAmt;
      acc.balance = Number(acc.balance) + delta;
      await sb.from('finance_accounts').update({ balance: acc.balance }).eq('id', acc.id);
    }

    const nextDate = advanceDateByFrequency(plan.next_date || applyDate, plan.frequency);
    plan.next_date = nextDate;
    await sb.from('finance_planned').update({ next_date: nextDate }).eq('id', plan.id);

    closeModal('confirm-plan-modal');
    renderFinanceAll();
    showToast('Pago aplicado y próxima fecha actualizada');
  });
}

function advanceDateByFrequency(dateStr, freq) {
  const d = new Date(`${dateStr}T12:00:00`);
  if (freq === 'quincenal') d.setDate(d.getDate() + 15);
  else if (freq === 'trimestral') d.setMonth(d.getMonth() + 3);
  else if (freq === 'semestral') d.setMonth(d.getMonth() + 6);
  else if (freq === 'anual') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
}

async function loadFinanceData() {
  const uid = state.user.id;
  // Consultas sin .order() en columnas opcionales para evitar errores si una tabla tiene otro esquema
  const [accRes, catRes, txRes, planRes] = await Promise.all([
    sb.from('finance_accounts').select('*').eq('user_id', uid),
    sb.from('finance_categories').select('*').eq('user_id', uid),
    sb.from('finance_transactions').select('*').eq('user_id', uid),
    sb.from('finance_planned').select('*').eq('user_id', uid)
  ]);

  state.accounts = (accRes.data || []).map((a) => ({
    ...a,
    balance: Number(a.balance ?? a.saldo ?? 0),
    currency: a.currency || a.moneda || 'HNL'
  }));

  state.categories = catRes.data || [];

  state.transactions = (txRes.data || [])
    .map(normalizeTransaction)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  state.planned = (planRes.data || [])
    .map(normalizePlanned)
    .sort((a, b) => (a.next_date || '').localeCompare(b.next_date || ''));

  // Si hay movimientos guardados pero ninguno cae en los últimos 30 días, activar "Todo" automáticamente
  if (state.transactions.length > 0 && state.finPeriodDays !== 'ALL') {
    const in30 = getFilteredTransactions();
    if (in30.length === 0) {
      state.finPeriodDays = 'ALL';
      $('finance-period-filters')?.querySelectorAll('.nav-pill').forEach((b) => {
        b.classList.toggle('active', b.dataset.days === 'ALL');
      });
    }
  }

  if (!state.categories.length) {
    const seed = DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: uid }));
    const { data: inserted } = await sb.from('finance_categories').insert(seed).select();
    state.categories = inserted || DEFAULT_CATEGORIES;
  }

  renderFinanceAll();
}

function populateFinanceSelects() {
  const txType = $('fin-tx-type').value;
  const filteredCats = state.categories.filter((c) => c.type === txType);
  const catsToUse = filteredCats.length ? filteredCats : state.categories;

  $('fin-tx-category').innerHTML = catsToUse
    .map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`)
    .join('');

  $('fin-plan-category').innerHTML = state.categories
    .map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`)
    .join('');

  const accHtml = state.accounts.length
    ? state.accounts
        .map((a) => `<option value="${a.id}">${escapeHtml(a.name)} (${a.currency})</option>`)
        .join('')
    : '<option value="">Sin cuentas</option>';

  $('fin-tx-account').innerHTML = accHtml;
  $('fin-plan-account').innerHTML = accHtml;

  const manageList = $('fin-categories-manage-list');
  manageList.innerHTML = state.categories
    .filter((c) => c.id && !String(c.id).startsWith('local_'))
    .map(
      (c) => `
      <li>
        <span>${escapeHtml(c.name)} <small class="muted-text">(${c.type === 'income' ? 'Ingreso' : 'Gasto'})</small></span>
        <button type="button" class="icon-btn" data-del-cat="${c.id}">✕</button>
      </li>`
    )
    .join('');

  manageList.querySelectorAll('[data-del-cat]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await sb.from('finance_categories').delete().eq('id', btn.dataset.delCat);
      state.categories = state.categories.filter((x) => String(x.id) !== String(btn.dataset.delCat));
      populateFinanceSelects();
    });
  });
}

function getFilteredTransactions() {
  if (state.finPeriodDays === 'ALL') return state.transactions;
  const days = Number(state.finPeriodDays) || 30;
  const cutoff = Date.now() - days * 86400000;
  return state.transactions.filter((tx) => {
    const ts = Date.parse(`${tx.date}T12:00:00`);
    return Number.isNaN(ts) ? true : ts >= cutoff;
  });
}

function renderFinanceAll() {
  populateFinanceSelects();
  const disp = state.finDisplayCurrency;

  // 1. Patrimonio Neto
  const netWorth = state.accounts.reduce(
    (sum, acc) => sum + convertAmount(acc.balance, acc.currency, disp),
    0
  );
  $('fin-kpi-accounts-count').textContent = `${state.accounts.length} cuentas`;
  $('fin-kpi-networth').textContent = formatMoney(netWorth, disp);
  updatePulseWidget();

  // 2. Flujo de Efectivo en periodo
  const periodLabel = state.finPeriodDays === 'ALL' ? 'HISTÓRICO' : `ÚLTIMOS ${state.finPeriodDays}D`;
  $('fin-cashflow-period-label').textContent = periodLabel;
  $('fin-donut-period-label').textContent = periodLabel;

  const txs = getFilteredTransactions();
  let income = 0;
  let expense = 0;
  txs.forEach((tx) => {
    const val = convertAmount(tx.amount, tx.currency || 'HNL', disp);
    if (tx.type === 'income') income += val;
    else expense += val;
  });

  const netFlow = income - expense;
  $('fin-cashflow-net').textContent = `${netFlow >= 0 ? '+' : ''}${formatMoney(netFlow, disp)}`;
  $('fin-cashflow-income-val').textContent = formatMoney(income, disp);
  $('fin-cashflow-expense-val').textContent = formatMoney(expense, disp);

  const maxBar = Math.max(income, expense, 1);
  $('fin-cashflow-income-bar').style.width = `${Math.round((income / maxBar) * 100)}%`;
  $('fin-cashflow-expense-bar').style.width = `${Math.round((expense / maxBar) * 100)}%`;

  // 3. Perspectiva
  const plannedImpact = state.planned.reduce((sum, p) => {
    const v = convertAmount(p.amount, p.currency, disp);
    return sum + (p.type === 'income' ? v : -v);
  }, 0);
  $('fin-perspective-val').textContent = formatMoney(netWorth + plannedImpact, disp);
  $('fin-perspective-sub').textContent = `Impacto de ${state.planned.length} planificados`;
  $('fin-prev-compare-val').textContent = formatMoney(income, disp);

  if (income > 0 && expense > income) {
    $('fin-prev-compare-badge').textContent = 'Déficit en periodo';
    $('fin-advisor-tip').textContent =
      'Tus gastos superan tus ingresos en este rango. Revisa las categorías principales en el gráfico.';
  } else if (income > 0) {
    const rate = Math.round(((income - expense) / income) * 100);
    $('fin-prev-compare-badge').textContent = `Ahorro ${rate}%`;
    $('fin-advisor-tip').textContent = `Mantienes un margen de ahorro del ${rate}% en este periodo.`;
  } else {
    $('fin-prev-compare-badge').textContent = `${txs.length} mov.`;
    $('fin-advisor-tip').textContent = 'Registra tus cuentas y movimientos para recibir métricas.';
  }

  renderFinanceTrendSvg(txs, netWorth, disp);
  renderFinanceDonut();
  renderFinanceAccounts();
  renderFinancePlanned();
  renderFinanceHistory(txs);
}

function renderFinanceTrendSvg(txs, currentNetWorth, disp) {
  const svg = $('fin-trend-svg');
  const points = [];
  let running = currentNetWorth;
  points.push(running);

  txs.slice(0, 12).forEach((tx) => {
    const val = convertAmount(tx.amount, tx.currency || 'HNL', disp);
    running += tx.type === 'income' ? -val : val;
    points.unshift(running);
  });

  if (points.length < 2) points.unshift(currentNetWorth);

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = Math.max(max - min, 1);

  const coords = points.map((v, i) => {
    const x = 20 + (i / (points.length - 1)) * 500;
    const y = 135 - ((v - min) / span) * 105;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaCoords = `20,150 ${coords.join(' ')} 520,150`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="zenTrendGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.38"/>
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
    <polygon points="${areaCoords}" fill="url(#zenTrendGrad)" />
    <polyline fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${coords.join(' ')}" />
  `;
}

function renderFinanceDonut() {
  const disp = state.finDisplayCurrency;
  const expenses = getFilteredTransactions().filter((t) => t.type === 'expense');
  const grouped = {};

  expenses.forEach((tx) => {
    const key =
      state.finDonutMode === 'recurring'
        ? tx.is_recurring
          ? 'Recurrentes'
          : 'Variables'
        : tx.category || 'Otros';
    grouped[key] = (grouped[key] || 0) + convertAmount(tx.amount, tx.currency || 'HNL', disp);
  });

  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  $('fin-donut-total').textContent = formatMoney(total, disp);

  const colors = ['#f59e0b', '#38bdf8', '#10b981', '#818cf8', '#f43f5e', '#a78bfa'];
  const r = 74;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  const svg = $('fin-donut-svg');
  if (!total) {
    svg.innerHTML = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="22"/>`;
    $('fin-donut-legend').innerHTML = '<span class="muted-text">Sin gastos en este periodo</span>';
    return;
  }

  svg.innerHTML = entries
    .map(([, val], idx) => {
      const pct = val / total;
      const dash = pct * circ;
      const seg = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${
        colors[idx % colors.length]
      }" stroke-width="22" stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${-offset}" />`;
      offset += dash;
      return seg;
    })
    .join('');

  $('fin-donut-legend').innerHTML = entries
    .slice(0, 6)
    .map(
      ([label, val], idx) => `
      <div class="donut-legend-item">
        <span style="display:flex;align-items:center;gap:0.35rem;min-width:0;">
          <i class="legend-dot" style="background:${colors[idx % colors.length]};"></i>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(label)}</span>
        </span>
        <strong>${Math.round((val / total) * 100)}%</strong>
      </div>`
    )
    .join('');
}

function renderFinanceAccounts() {
  const list = $('fin-accounts-list');
  list.innerHTML = state.accounts
    .map(
      (a) => `
      <li>
        <div>
          <strong>${escapeHtml(a.name)}</strong>
          <div class="muted-text" style="font-size:0.76rem;">${escapeHtml(a.type)}</div>
        </div>
        <div class="item-actions">
          <strong>${formatMoney(a.balance, a.currency)}</strong>
          <button type="button" class="icon-btn" data-del-acc="${a.id}">✕</button>
        </div>
      </li>`
    )
    .join('');

  list.querySelectorAll('[data-del-acc]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await sb.from('finance_accounts').delete().eq('id', btn.dataset.delAcc);
      state.accounts = state.accounts.filter((x) => String(x.id) !== String(btn.dataset.delAcc));
      renderFinanceAll();
    });
  });
}

function renderFinancePlanned() {
  const list = $('fin-planned-list');
  const filtered = state.planned.filter((p) => {
    if (state.finPlannedTypeFilter !== 'ALL' && p.type !== state.finPlannedTypeFilter) return false;
    if (state.finPlannedSearch && !p.title.toLowerCase().includes(state.finPlannedSearch)) return false;
    return true;
  });

  if (!filtered.length) {
    list.innerHTML = '<li class="muted-text">Sin pagos o ingresos planificados.</li>';
    return;
  }

  list.innerHTML = filtered
    .map(
      (p) => `
      <li>
        <div>
          <strong>${escapeHtml(p.title)}</strong>
          <div class="muted-text" style="font-size:0.76rem;">${escapeHtml(p.frequency)} • Próx: ${escapeHtml(
        p.next_date || ''
      )}</div>
        </div>
        <div class="item-actions">
          <strong class="${p.type === 'income' ? 'amt-income' : 'amt-expense'}">${formatMoney(
        p.amount,
        p.currency
      )}</strong>
          <button type="button" class="glass-btn primary" data-apply-plan="${p.id}" style="padding:0.28rem 0.6rem;font-size:0.75rem;">Aplicar</button>
          <button type="button" class="icon-btn" data-del-plan="${p.id}">✕</button>
        </div>
      </li>`
    )
    .join('');

  list.querySelectorAll('[data-apply-plan]').forEach((btn) => {
    btn.addEventListener('click', () => openConfirmPlanModal(btn.dataset.applyPlan));
  });

  list.querySelectorAll('[data-del-plan]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await sb.from('finance_planned').delete().eq('id', btn.dataset.delPlan);
      state.planned = state.planned.filter((x) => String(x.id) !== String(btn.dataset.delPlan));
      renderFinanceAll();
    });
  });
}

function openConfirmPlanModal(planId) {
  const plan = state.planned.find((p) => String(p.id) === String(planId));
  if (!plan) return;

  $('confirm-plan-id').value = plan.id;
  $('confirm-plan-title').textContent = `Confirmar: ${plan.title}`;
  $('confirm-plan-original-info').textContent = `Monto programado: ${formatMoney(
    plan.amount,
    plan.currency
  )} (${plan.frequency})`;
  $('confirm-plan-currency-label').textContent = plan.currency;
  $('confirm-plan-real-amount').value = plan.amount;
  $('confirm-plan-date').value = todayISO();

  $('confirm-plan-account').innerHTML = state.accounts
    .map(
      (a) =>
        `<option value="${a.id}" ${String(a.id) === String(plan.account_id) ? 'selected' : ''}>${escapeHtml(
          a.name
        )} (${a.currency})</option>`
    )
    .join('');

  updatePlanConversionNote();
  openModal('confirm-plan-modal');
}

function updatePlanConversionNote() {
  const plan = state.planned.find((p) => String(p.id) === String($('confirm-plan-id').value));
  const acc = state.accounts.find((a) => String(a.id) === String($('confirm-plan-account').value));
  if (!plan || !acc) return;
  const amt = Number($('confirm-plan-real-amount').value) || 0;
  if (plan.currency === acc.currency) {
    $('confirm-plan-conversion-note').textContent = `Se aplicará directamente en ${acc.currency}.`;
  } else {
    const conv = convertAmount(amt, plan.currency, acc.currency);
    $('confirm-plan-conversion-note').textContent = `Conversión automática: ${formatMoney(
      amt,
      plan.currency
    )} → ${formatMoney(conv, acc.currency)} en ${acc.name}.`;
  }
}

function renderFinanceHistory(txs) {
  $('fin-history-count').textContent = `${txs.length}`;
  const list = $('fin-transactions-list');

  if (!txs.length) {
    list.innerHTML = '<li class="muted-text">No hay movimientos registrados en este rango.</li>';
    return;
  }

  list.innerHTML = txs
    .slice(0, 50)
    .map((tx) => {
      const acc = state.accounts.find((a) => String(a.id) === String(tx.account_id));
      const sign = tx.type === 'income' ? '+' : '-';
      return `
        <li>
          <div>
            <strong>${escapeHtml(tx.description)}</strong>
            <div class="muted-text" style="font-size:0.76rem;">
              ${escapeHtml(tx.category || 'General')} • ${escapeHtml(acc?.name || 'Cuenta')} • ${escapeHtml(
        tx.date || ''
      )} ${tx.is_recurring ? '• ↻ Recurrente' : ''}
            </div>
          </div>
          <div class="item-actions">
            <strong class="${tx.type === 'income' ? 'amt-income' : 'amt-expense'}">${sign}${formatMoney(
        tx.amount,
        tx.currency || 'HNL'
      )}</strong>
            <button type="button" class="icon-btn" data-del-tx="${tx.id}">✕</button>
          </div>
        </li>`;
    })
    .join('');

  list.querySelectorAll('[data-del-tx]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tx = state.transactions.find((x) => String(x.id) === String(btn.dataset.delTx));
      if (!tx) return;
      await sb.from('finance_transactions').delete().eq('id', tx.id);
      const acc = state.accounts.find((a) => String(a.id) === String(tx.account_id));
      if (acc) {
        const rev = tx.type === 'income' ? -Number(tx.amount) : Number(tx.amount);
        acc.balance = Number(acc.balance) + rev;
        await sb.from('finance_accounts').update({ balance: acc.balance }).eq('id', acc.id);
      }
      state.transactions = state.transactions.filter((x) => String(x.id) !== String(tx.id));
      renderFinanceAll();
    });
  });
}

/* ==========================================================================
   8. MÓDULO 4: PARLEYS & PROBABILIDADES
   ========================================================================== */
function initParleysModule() {
  $('refresh-parleys-btn').addEventListener('click', () => {
    loadParleys(true);
    showToast('Pronósticos actualizados');
  });

  $('league-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-pill');
    if (!btn) return;
    state.parleyLeagueFilter = btn.dataset.league;
    $('league-filters').querySelectorAll('.nav-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderParleysView();
  });

  $('date-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-pill');
    if (!btn) return;
    state.parleyDateFilter = btn.dataset.dateFilter;
    state.parleyCustomDate = '';
    $('parley-custom-date').value = '';
    $('clear-parley-date-btn').classList.add('hidden');
    $('date-filters').querySelectorAll('.nav-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderParleysView();
  });

  $('parley-custom-date').addEventListener('change', (e) => {
    state.parleyCustomDate = e.target.value;
    if (state.parleyCustomDate) {
      state.parleyDateFilter = 'CUSTOM';
      $('date-filters').querySelectorAll('.nav-pill').forEach((b) => b.classList.remove('active'));
      $('clear-parley-date-btn').classList.remove('hidden');
    } else {
      state.parleyDateFilter = 'ALL';
      $('clear-parley-date-btn').classList.add('hidden');
    }
    renderParleysView();
  });

  $('clear-parley-date-btn').addEventListener('click', () => {
    state.parleyCustomDate = '';
    state.parleyDateFilter = 'ALL';
    $('parley-custom-date').value = '';
    $('clear-parley-date-btn').classList.add('hidden');
    const allBtn = $('date-filters').querySelector('[data-date-filter="ALL"]');
    if (allBtn) allBtn.classList.add('active');
    renderParleysView();
  });

  $('clear-slip-btn').addEventListener('click', () => {
    state.slip = [];
    renderParleysView();
  });

  $('slip-stake').addEventListener('input', updateSlipTotals);
  $('slip-currency').addEventListener('change', updateSlipTotals);
}

async function loadParleys(forceBust = false) {
  try {
    const url = forceBust ? `./data/parleys.json?t=${Date.now()}` : './data/parleys.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error('No parleys.json');
    const data = await res.json();
    state.parleysData = {
      updated_at: data.updated_at || new Date().toISOString(),
      matches: data.matches || [],
      auto_parleys: data.auto_parleys || []
    };
  } catch {
    state.parleysData = {
      updated_at: new Date().toISOString(),
      matches: [],
      auto_parleys: []
    };
  }
  renderParleysView();
}

function matchPassesDateFilter(match) {
  if (state.parleyDateFilter === 'ALL') return true;
  const raw = match.date || match.commence_time || '';
  if (!raw) return true;
  const mDate = raw.slice(0, 10);

  const today = new Date();
  const todayStr = todayISO();

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (state.parleyDateFilter === 'TODAY') return mDate === todayStr;
  if (state.parleyDateFilter === 'TOMORROW') return mDate === tomorrowStr;
  if (state.parleyDateFilter === 'CUSTOM') return mDate === state.parleyCustomDate;
  if (state.parleyDateFilter === 'WEEK') {
    const diff = (new Date(`${mDate}T12:00:00`) - new Date(`${todayStr}T12:00:00`)) / 86400000;
    return diff >= 0 && diff <= 7;
  }
  return true;
}

function renderParleysView() {
  const updEl = $('parleys-last-update');
  if (state.parleysData.updated_at) {
    const dt = new Date(state.parleysData.updated_at);
    updEl.textContent = `Actualizado: ${
      isNaN(dt) ? state.parleysData.updated_at : dt.toLocaleString('es-HN')
    }`;
  }

  const autoGrid = $('auto-parleys-grid');
  const autos = state.parleysData.auto_parleys || [];
  autoGrid.innerHTML = autos
    .map(
      (ap, idx) => `
      <article class="glass-card parley-card hover-glass">
        <div class="widget-header">
          <strong>${escapeHtml(ap.name || `Parley #${idx + 1}`)}</strong>
          <span class="glass-pill high-prob">${Math.round(ap.combined_prob || 0)}% prob.</span>
        </div>
        <ul class="glass-list" style="max-height:150px;">
          ${(ap.legs || [])
            .map(
              (l) =>
                `<li style="padding:0.4rem 0.6rem;font-size:0.8rem;"><span>${escapeHtml(
                  l.match
                )} — <strong>${escapeHtml(l.pick)}</strong></span><span class="odd-val">${Number(
                  l.odd
                ).toFixed(2)}x</span></li>`
            )
            .join('')}
        </ul>
        <div class="bar-label-row">
          <span class="muted-text">Momio combinado: <strong class="odd-val">${Number(
            ap.total_odd || 1
          ).toFixed(2)}x</strong></span>
          <button type="button" class="glass-btn primary" data-load-auto="${idx}" style="padding:0.32rem 0.7rem;font-size:0.78rem;">Cargar Boleto</button>
        </div>
      </article>`
    )
    .join('');

  autoGrid.querySelectorAll('[data-load-auto]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ap = autos[Number(btn.dataset.loadAuto)];
      if (!ap?.legs) return;
      state.slip = ap.legs.map((l, i) => ({
        matchId: l.match_id || `auto_${i}_${l.match}`,
        match: l.match,
        pick: l.pick,
        odd: Number(l.odd) || 1.5,
        prob: Number(l.prob) || 60
      }));
      renderParleysView();
      showToast('Parley cargado en tu boleto');
    });
  });

  const matches = (state.parleysData.matches || []).filter((m) => {
    if (state.parleyLeagueFilter !== 'ALL' && m.league !== state.parleyLeagueFilter) return false;
    return matchPassesDateFilter(m);
  });

  const grid = $('matches-list-grid');
  if (!matches.length) {
    grid.innerHTML =
      '<div class="glass-card match-card"><p class="muted-text">No hay partidos disponibles para esta liga o fecha seleccionada.</p></div>';
  } else {
    grid.innerHTML = matches
      .map((m, idx) => {
        const mId = m.id || `${m.home}_${m.away}_${idx}`;
        const label = `${m.home} vs ${m.away}`;
        const options = m.options || [
          { pick: m.home, odd: m.odds?.home || 2.0, prob: m.probs?.home || 45 },
          { pick: 'Empate', odd: m.odds?.draw || 3.3, prob: m.probs?.draw || 28 },
          { pick: m.away, odd: m.odds?.away || 3.5, prob: m.probs?.away || 27 }
        ];

        const topProb = Math.max(...options.map((o) => Number(o.prob) || 0));
        const pillClass = topProb >= 60 ? 'high-prob' : topProb >= 45 ? 'mid-prob' : 'low-prob';

        return `
          <article class="glass-card match-card hover-glass">
            <div class="widget-header">
              <span class="glass-pill">${escapeHtml(m.league || 'Fútbol')}</span>
              <span class="glass-pill ${pillClass}">Máx ${Math.round(topProb)}%</span>
            </div>
            <div>
              <strong>${escapeHtml(label)}</strong>
              <div class="muted-text" style="font-size:0.78rem;">${escapeHtml(m.date || '')}</div>
            </div>
            <div class="odds-row">
              ${options
                .map((opt) => {
                  const isSel = state.slip.some(
                    (s) => s.matchId === mId && s.pick === opt.pick
                  );
                  return `
                    <button type="button" class="odd-chip ${isSel ? 'selected' : ''}"
                      data-pick-match="${escapeHtml(mId)}"
                      data-match-label="${escapeHtml(label)}"
                      data-pick="${escapeHtml(opt.pick)}"
                      data-odd="${opt.odd}"
                      data-prob="${opt.prob}">
                      <span style="max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(
                        opt.pick
                      )}</span>
                      <strong class="odd-val">${Number(opt.odd).toFixed(2)}x</strong>
                      <span class="muted-text" style="font-size:0.68rem;">${Math.round(opt.prob)}%</span>
                    </button>`;
                })
                .join('')}
            </div>
          </article>`;
      })
      .join('');

    grid.querySelectorAll('.odd-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const matchId = chip.dataset.pickMatch;
        const pick = chip.dataset.pick;
        const existingIdx = state.slip.findIndex((s) => s.matchId === matchId);

        if (existingIdx >= 0 && state.slip[existingIdx].pick === pick) {
          state.slip.splice(existingIdx, 1);
        } else {
          const item = {
            matchId,
            match: chip.dataset.matchLabel,
            pick,
            odd: Number(chip.dataset.odd),
            prob: Number(chip.dataset.prob)
          };
          if (existingIdx >= 0) state.slip[existingIdx] = item;
          else state.slip.push(item);
        }
        renderParleysView();
      });
    });
  }

  renderSlip();
}

function renderSlip() {
  const list = $('slip-legs-list');
  if (!state.slip.length) {
    list.innerHTML = '<li class="muted-text">Selecciona cuotas de los partidos para armar tu boleto.</li>';
  } else {
    list.innerHTML = state.slip
      .map(
        (s, idx) => `
        <li>
          <div style="min-width:0;flex:1;">
            <strong style="font-size:0.82rem;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(
              s.match
            )}</strong>
            <span class="muted-text" style="font-size:0.76rem;">${escapeHtml(s.pick)} (${Math.round(
          s.prob
        )}%)</span>
          </div>
          <div class="item-actions">
            <strong class="odd-val">${s.odd.toFixed(2)}x</strong>
            <button type="button" class="icon-btn" data-del-slip="${idx}">✕</button>
          </div>
        </li>`
      )
      .join('');

    list.querySelectorAll('[data-del-slip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.slip.splice(Number(btn.dataset.delSlip), 1);
        renderParleysView();
      });
    });
  }
  updateSlipTotals();
}

function updateSlipTotals() {
  const stake = Math.max(0, Number($('slip-stake').value) || 0);
  const curr = $('slip-currency').value;

  if (!state.slip.length) {
    $('slip-prob').textContent = '0%';
    $('slip-odd').textContent = '1.00x';
    $('slip-payout').textContent = formatMoney(0, curr);
    return;
  }

  const totalOdd = state.slip.reduce((acc, s) => acc * (Number(s.odd) || 1), 1);
  const combinedProb =
    state.slip.reduce((acc, s) => acc * ((Number(s.prob) || 50) / 100), 1) * 100;
  const payout = stake * totalOdd;

  const probEl = $('slip-prob');
  probEl.textContent = `${combinedProb.toFixed(1)}%`;
  probEl.className =
    combinedProb >= 40 ? 'prob-val-high' : combinedProb >= 20 ? 'prob-val-mid' : 'prob-val-low';

  $('slip-odd').textContent = `${totalOdd.toFixed(2)}x`;
  $('slip-payout').textContent = formatMoney(payout, curr);
}

/* ==========================================================================
   9. INICIALIZACIÓN DE LA APLICACIÓN
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  initZenFX();
  initAuth();
  initNavigationAndLayout();
  initPomodoroWidget();
  initWeatherControls();
  initDashboardForms();
  initLifeModule();
  initFinanceModule();
  initParleysModule();

  const { data } = await sb.auth.getSession();
  if (data?.session?.user) {
    onUserAuthenticated(data.session.user);
  }
});