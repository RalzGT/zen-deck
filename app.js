// ==========================================
// 0. MOTOR VISUAL INTERACTIVO (ZEN FX ENGINE)
// ==========================================
const MODULE_PALETTES = {
  'dashboard-module': {
    theme: 'dashboard',
    colors: ['#38bdf8', '#818cf8', '#2dd4bf', '#bae6fd']
  },
  'life-module': {
    theme: 'life',
    colors: ['#2dd4bf', '#34d399', '#38bdf8', '#a7f3d0']
  },
  'finance-module': {
    theme: 'finance',
    colors: ['#fbbf24', '#10b981', '#38bdf8', '#fde68a']
  },
  'parleys-module': {
    theme: 'parleys',
    colors: ['#c084fc', '#f472b6', '#38bdf8', '#e879f9']
  }
};

const ZenFX = (() => {
  let canvas = null;
  let ctx = null;
  let width = 0;
  let height = 0;
  let ambientMotes = [];
  let burstParticles = [];
  let trailPoints = [];
  let pointer = { x: -9999, y: -9999, active: false };
  let activeColors = MODULE_PALETTES['dashboard-module'].colors;
  let lastClickCoords = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  function init() {
    if (!document.getElementById('zen-fx-canvas')) {
      canvas = document.createElement('canvas');
      canvas.id = 'zen-fx-canvas';
      document.body.prepend(canvas);
    } else {
      canvas = document.getElementById('zen-fx-canvas');
    }
    ctx = canvas.getContext('2d');
    resize();

    ambientMotes = Array.from({ length: 34 }, () => createMote());

    window.addEventListener('resize', () => {
      resize();
      positionNavGlider(false);
    });

    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || document.body.classList.contains('is-touch-dragging')) {
        return;
      }

      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;

      trailPoints.push({
        x: e.clientX,
        y: e.clientY,
        alpha: 0.45,
        radius: 4.5,
        color: activeColors[0]
      });
      if (trailPoints.length > 18) trailPoints.shift();

      const card = e.target.closest?.('.glass-card');
      if (card) {
        const rect = card.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        card.style.setProperty('--mx', `${relX}px`);
        card.style.setProperty('--my', `${relY}px`);

        if (
          card.classList.contains('zen-widget') &&
          !card.classList.contains('dragging') &&
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
        ) {
          const normX = (relX / rect.width - 0.5) * 2;
          const normY = (relY / rect.height - 0.5) * 2;
          const rotY = (normX * 2.1).toFixed(2);
          const rotX = (-normY * 2.1).toFixed(2);
          card.style.transform = `perspective(1100px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-2px)`;
        }
      }
    }, { passive: true });

    document.addEventListener('pointerout', (e) => {
      const card = e.target.closest?.('.glass-card');
      if (card && !card.contains(e.relatedTarget)) {
        card.style.transform = '';
      }
    });

    document.addEventListener('pointerdown', (e) => {
      lastClickCoords = { x: e.clientX, y: e.clientY };
      const host = e.target.closest?.(
        '.glass-btn, .nav-pill, .icon-btn, .market-opt-btn, .seg-btn, .link-chip, .stat-tile'
      );
      if (!host) return;

      host.classList.add('fx-ripple-host');
      const rect = host.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.35;
      const ripple = document.createElement('span');
      ripple.className = 'fx-ripple';
      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;

      host.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    }, { passive: true });

    initNavGlider();
    requestAnimationFrame(loop);
  }

  function resize() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createMote() {
    return {
      x: Math.random() * (width || window.innerWidth),
      y: Math.random() * (height || window.innerHeight),
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      size: 1.4 + Math.random() * 2.2,
      alpha: 0.18 + Math.random() * 0.35,
      colorIdx: Math.floor(Math.random() * 4)
    };
  }

  function setModuleTheme(modId) {
    const cfg = MODULE_PALETTES[modId] || MODULE_PALETTES['dashboard-module'];
    document.body.dataset.moduleTheme = cfg.theme;
    activeColors = cfg.colors;
  }

  function burst(x = lastClickCoords.x, y = lastClickCoords.y, count = 20, customPalette = null) {
    const palette = customPalette || activeColors;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const speed = 1.6 + Math.random() * 4.4;
      burstParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        size: 2 + Math.random() * 2.8,
        alpha: 1,
        decay: 0.018 + Math.random() * 0.016,
        color: palette[i % palette.length]
      });
    }
  }

  function triggerModuleSweep() {
    const sweep = document.createElement('div');
    sweep.className = 'module-sweep-overlay';
    document.body.appendChild(sweep);
    setTimeout(() => sweep.remove(), 680);
  }

  function cascadeModuleWidgets(modContainer) {
    if (!modContainer) return;
    const targets = modContainer.querySelectorAll('.zen-widget:not(.hidden), .parleys-header-card');
    targets.forEach((el, idx) => {
      el.classList.remove('zen-cascade-enter');
      el.style.setProperty('--stagger-delay', `${Math.min(idx * 48, 380)}ms`);
      void el.offsetWidth;
      el.classList.add('zen-cascade-enter');
    });
  }

  function initNavGlider() {
    const nav = document.querySelector('.module-nav');
    if (!nav) return;
    let glider = nav.querySelector('.nav-glider');
    if (!glider) {
      glider = document.createElement('div');
      glider.className = 'nav-glider';
      nav.prepend(glider);
    }
    nav.classList.add('has-glider');
    positionNavGlider(false);
  }

  function positionNavGlider(animate = true) {
    const nav = document.querySelector('.module-nav');
    const glider = nav?.querySelector('.nav-glider');
    const activeBtn = nav?.querySelector('.nav-pill.active');
    if (!nav || !glider || !activeBtn) return;

    if (!animate) glider.style.transition = 'none';
    glider.style.width = `${activeBtn.offsetWidth}px`;
    glider.style.height = `${activeBtn.offsetHeight}px`;
    glider.style.transform = `translate3d(${activeBtn.offsetLeft}px, ${activeBtn.offsetTop}px, 0)`;

    if (!animate) {
      void glider.offsetWidth;
      glider.style.transition = '';
    }
  }

  function animateValue(el, targetVal, prefix = '', suffix = '', duration = 460) {
    if (!el) return;
    const prev = Number(el.dataset.numVal);
    if (Number.isNaN(prev)) {
      el.dataset.numVal = String(targetVal);
      el.textContent = `${prefix}${formatMoney(targetVal)}${suffix}`;
      return;
    }
    if (Math.abs(prev - targetVal) < 0.01) {
      el.textContent = `${prefix}${formatMoney(targetVal)}${suffix}`;
      return;
    }

    const startTime = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = prev + (targetVal - prev) * eased;
      el.textContent = `${prefix}${formatMoney(current)}${suffix}`;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.dataset.numVal = String(targetVal);
        el.textContent = `${prefix}${formatMoney(targetVal)}${suffix}`;
      }
    };
    requestAnimationFrame(step);
  }

  function loop() {
    ctx.clearRect(0, 0, width, height);

    for (let i = trailPoints.length - 1; i >= 0; i--) {
      const pt = trailPoints[i];
      pt.alpha *= 0.88;
      pt.radius *= 0.94;
      if (pt.alpha < 0.02) {
        trailPoints.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (let i = 0; i < ambientMotes.length; i++) {
      const m = ambientMotes[i];
      m.x += m.vx;
      m.y += m.vy;

      if (m.x < -20) m.x = width + 20;
      if (m.x > width + 20) m.x = -20;
      if (m.y < -20) m.y = height + 20;
      if (m.y > height + 20) m.y = -20;

      if (pointer.active) {
        const dx = m.x - pointer.x;
        const dy = m.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < 135) {
          const force = (135 - dist) / 135;
          m.x += (dx / dist) * force * 0.9;
          m.y += (dy / dist) * force * 0.9;

          ctx.save();
          ctx.globalAlpha = force * 0.16;
          ctx.strokeStyle = activeColors[m.colorIdx % activeColors.length];
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.save();
      ctx.globalAlpha = m.alpha;
      ctx.fillStyle = activeColors[m.colorIdx % activeColors.length];
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (let i = burstParticles.length - 1; i >= 0; i--) {
      const p = burstParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.vx *= 0.96;
      p.alpha -= p.decay;
      if (p.alpha <= 0) {
        burstParticles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    requestAnimationFrame(loop);
  }

  return {
    init,
    setModuleTheme,
    burst,
    triggerModuleSweep,
    cascadeModuleWidgets,
    positionNavGlider,
    animateValue
  };
})();

// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE (ZEN DECK)
// ==========================================
const SUPABASE_URL = 'https://lxrdrqjjuzpxtysakpvb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DXx0j5HaveKep0XHgjor_A_Kmrp9ll6';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let authMode = 'login'; // 'login' | 'register' | 'forgot'
let currentUser = null;
let initializedUserId = null;
let activeModuleId = 'dashboard-module';

let userPrefs = {
  weather_city: 'San Pedro Sula, HN',
  weather_lat: 15.5042,
  weather_lon: -88.0250,
  currency_from: 'USD',
  currency_to: 'HNL',
  widget_sizes: {},
  widget_order: [],
  hidden_widgets: [],
  google_client_id: ''
};

let currentRatesMap = {};
let usdRatesMap = { USD: 1, HNL: 26.95, EUR: 0.92, MXN: 20.15 };
let parleysData = { parleys: [], matches: [], updated_at: null };
let selectedLeagueFilter = 'ALL';
let selectedDateFilter = 'ALL'; // 'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK' | 'CUSTOM'
let selectedCustomDate = '';
let activeMatchTabs = {};
let customSlipLegs = [];
let activeTimers = {};
let draggedWidgetEl = null;

// Estado Panel de Vida (Google + Outlook + Apple Calendar .ics)
let googleAccessToken = null;
let outlookAccessToken = null;
let lifeIntegrations = {
  outlook_client_id: '',
  apple_ics_url: '',
  apple_ics_raw: ''
};
let unifiedMailItems = [];
let unifiedCalendarEvents = [];
let selectedMailSource = 'ALL';
let selectedCalSource = 'ALL';

// Estado Asesor Financiero
let finAccounts = [];
let finCategories = [];
let finTransactions = [];
let finPlanned = [];
let finPeriodFilter = '30';
let finDonutMode = 'categories';
let finPlannedTypeFilter = 'ALL';
let finPlannedSearchQuery = '';
let editingAccountId = null;
let isLoadingFinance = false;

const SIZE_CYCLE = ['1x1', '2x1', '1x2', '2x2'];

const MODULE_INFO = {
  'dashboard-module': { key: 'dashboard', label: 'Panel Principal' },
  'life-module': { key: 'life', label: 'Panel de Vida' },
  'finance-module': { key: 'finance', label: 'Asesor Financiero' },
  'parleys-module': { key: 'parleys', label: 'Parleys & Probabilidades' }
};

const DONUT_PALETTE = [
  '#ef4444', '#10b981', '#38bdf8', '#f59e0b',
  '#a855f7', '#6366f1', '#84cc16', '#ec4899'
];

const SUPPORTED_CURRENCIES = [
  ['USD', 'USD - Dólar EE.UU.'],
  ['HNL', 'HNL - Lempira'],
  ['EUR', 'EUR - Euro'],
  ['MXN', 'MXN - Peso Mexicano'],
  ['GTQ', 'GTQ - Quetzal'],
  ['CRC', 'CRC - Colón CR'],
  ['NIO', 'NIO - Córdoba'],
  ['COP', 'COP - Peso Colombiano'],
  ['ARS', 'ARS - Peso Argentino'],
  ['BRL', 'BRL - Real Brasileño'],
  ['GBP', 'GBP - Libra Esterlina'],
  ['CAD', 'CAD - Dólar Canadiense'],
  ['JPY', 'JPY - Yen Japonés'],
  ['CHF', 'CHF - Franco Suizo']
];

const formatMoney = (val) => {
  const num = Number(val || 0);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
};

const linkifyText = (str) => {
  const escaped = escapeHtml(str);
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
};

function getCategoryVisual(catName = '', type = 'expense') {
  const lower = catName.toLowerCase();
  if (type === 'income') return { icon: '💰', color: '#eab308' };
  if (lower.includes('restaurante') || lower.includes('comida') || lower.includes('aliment')) return { icon: '🍽️', color: '#ef4444' };
  if (lower.includes('combustible') || lower.includes('transporte') || lower.includes('gasolina')) return { icon: '⛽', color: '#8b5cf6' };
  if (lower.includes('servicio') || lower.includes('internet') || lower.includes('casa')) return { icon: '🏠', color: '#f59e0b' };
  if (lower.includes('teléfono') || lower.includes('celular') || lower.includes('móvil')) return { icon: '📞', color: '#3b82f6' };
  if (lower.includes('suscrip') || lower.includes('streaming') || lower.includes('ocio') || lower.includes('youtube')) return { icon: '📺', color: '#10b981' };
  if (lower.includes('ajuste')) return { icon: '⚖️', color: '#06b6d4' };
  return { icon: '💳', color: '#6366f1' };
}

document.addEventListener('DOMContentLoaded', () => {
  ZenFX.init();
});

// ==========================================
// 2. AUTENTICACIÓN, RECUPERACIÓN Y CAMBIO DE CONTRASEÑA
// ==========================================
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authToggleText = document.getElementById('auth-toggle-text');
const nameFieldGroup = document.getElementById('name-field-group');
const passwordInput = document.getElementById('password');
const passwordFieldGroup = passwordInput?.closest('.input-group');
const forgotPasswordBtn = document.getElementById('forgot-password-btn');
const authError = document.getElementById('auth-error');
const authSuccess = document.getElementById('auth-success');

function setAuthMode(nextMode) {
  authMode = nextMode;
  authError.classList.add('hidden');
  if (authSuccess) authSuccess.classList.add('hidden');

  const isRegister = authMode === 'register';
  const isForgot = authMode === 'forgot';

  nameFieldGroup.classList.toggle('hidden', !isRegister);
  document.getElementById('full-name').required = isRegister;

  if (passwordFieldGroup) {
    passwordFieldGroup.classList.toggle('hidden', isForgot);
  }
  passwordInput.required = !isForgot;

  if (forgotPasswordBtn) {
    forgotPasswordBtn.classList.toggle('hidden', isRegister || isForgot);
  }

  if (isForgot) {
    authTitle.textContent = 'Recuperar Contraseña';
    authSubtitle.textContent = 'Te enviaremos un enlace seguro a tu correo para restablecerla';
    authSubmitBtn.textContent = 'Enviar enlace de recuperación';
    authToggleText.textContent = '¿Recordaste tu contraseña?';
    authToggleBtn.textContent = 'Volver a iniciar sesión';
  } else if (isRegister) {
    authTitle.textContent = 'Crear Cuenta';
    authSubtitle.textContent = 'Regístrate con tu nombre en Zen Deck';
    authSubmitBtn.textContent = 'Registrarme';
    authToggleText.textContent = '¿Ya tienes cuenta?';
    authToggleBtn.textContent = 'Inicia sesión';
  } else {
    authTitle.textContent = 'Iniciar Sesión';
    authSubtitle.textContent = 'Ingresa a tu espacio personal sincronizado';
    authSubmitBtn.textContent = 'Entrar al Panel';
    authToggleText.textContent = '¿No tienes cuenta?';
    authToggleBtn.textContent = 'Regístrate aquí';
  }
}

authToggleBtn.addEventListener('click', () => {
  if (authMode === 'login') {
    setAuthMode('register');
  } else {
    setAuthMode('login');
  }
});

if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener('click', () => {
    setAuthMode('forgot');
  });
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');
  if (authSuccess) authSuccess.classList.add('hidden');

  const email = document.getElementById('email').value.trim();
  const password = passwordInput.value;
  const fullName = document.getElementById('full-name').value.trim();

  try {
    if (authMode === 'forgot') {
      const redirectUrl = `${window.location.origin}${window.location.pathname}`;
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      if (error) throw error;

      ZenFX.burst();
      if (authSuccess) {
        authSuccess.textContent = `Listo. Enviamos un enlace de recuperación a ${email}. Revisa tu bandeja de entrada o spam.`;
        authSuccess.classList.remove('hidden');
      }
      return;
    }

    if (authMode === 'register') {
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) throw error;
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    authError.textContent = err.message === 'Invalid login credentials'
      ? 'Correo o contraseña incorrectos.'
      : (err.message || 'Error de autenticación.');
    authError.classList.remove('hidden');
  }
});

// Modal y lógica de cambio de contraseña
const passwordModal = document.getElementById('password-modal');
const passwordModalSubtitle = document.getElementById('password-modal-subtitle');
const changePasswordForm = document.getElementById('change-password-form');
const passwordChangeMsg = document.getElementById('password-change-msg');

function openPasswordModal(fromRecovery = false) {
  if (!passwordModal) return;
  changePasswordForm?.reset();
  if (passwordChangeMsg) {
    passwordChangeMsg.classList.add('hidden');
    passwordChangeMsg.className = 'error-msg hidden';
  }
  if (passwordModalSubtitle) {
    passwordModalSubtitle.textContent = fromRecovery
      ? 'Enlace de recuperación verificado. Define y confirma tu nueva contraseña.'
      : 'Escribe tu nueva contraseña (mínimo 6 caracteres).';
  }
  passwordModal.classList.remove('hidden');
}

document.getElementById('open-password-modal-btn')?.addEventListener('click', () => {
  openPasswordModal(false);
});

document.getElementById('close-password-modal-btn')?.addEventListener('click', () => {
  passwordModal?.classList.add('hidden');
});

changePasswordForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById('new-password-input').value;
  const confirmPassword = document.getElementById('confirm-password-input').value;
  const saveBtn = document.getElementById('save-password-btn');

  passwordChangeMsg.classList.add('hidden');
  passwordChangeMsg.className = 'error-msg hidden';

  if (newPassword.length < 6) {
    passwordChangeMsg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    passwordChangeMsg.classList.remove('hidden');
    return;
  }

  if (newPassword !== confirmPassword) {
    passwordChangeMsg.textContent = 'Las contraseñas no coinciden.';
    passwordChangeMsg.classList.remove('hidden');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';

  try {
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw error;

    if (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token')) {
      history.replaceState(null, '', window.location.pathname);
    }

    ZenFX.burst(undefined, undefined, 28, ['#34d399', '#2dd4bf', '#38bdf8']);
    passwordChangeMsg.textContent = '¡Contraseña actualizada correctamente!';
    passwordChangeMsg.className = 'success-msg';
    passwordChangeMsg.classList.remove('hidden');

    setTimeout(() => {
      passwordModal?.classList.add('hidden');
      changePasswordForm.reset();
    }, 1400);
  } catch (err) {
    passwordChangeMsg.textContent = err.message || 'No se pudo actualizar la contraseña.';
    passwordChangeMsg.className = 'error-msg';
    passwordChangeMsg.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Actualizar Contraseña';
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  initializedUserId = null;
  await sb.auth.signOut();
});

sb.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    currentUser = session.user;
    authView.classList.add('hidden');
    appView.classList.remove('hidden');

    if (initializedUserId !== currentUser.id) {
      initializedUserId = currentUser.id;
      initDashboard();
    }

    if (event === 'PASSWORD_RECOVERY') {
      openPasswordModal(true);
    }
  } else {
    currentUser = null;
    initializedUserId = null;
    appView.classList.add('hidden');
    authView.classList.remove('hidden');
  }
});

// ==========================================
// 3. INICIALIZACIÓN, GESTOR DE WIDGETS Y TOUCH DRAG & DROP
// ==========================================
function loadLocalLayoutBackup() {
  if (!currentUser) return {};
  try {
    return JSON.parse(localStorage.getItem(`zendeck_layout_${currentUser.id}`) || '{}');
  } catch {
    return {};
  }
}

function saveLocalLayoutBackup() {
  if (!currentUser) return;
  localStorage.setItem(`zendeck_layout_${currentUser.id}`, JSON.stringify({
    widget_sizes: userPrefs.widget_sizes,
    widget_order: userPrefs.widget_order,
    hidden_widgets: userPrefs.hidden_widgets
  }));
}

function loadLifeIntegrationsBackup() {
  if (!currentUser) return;
  try {
    const saved = JSON.parse(localStorage.getItem(`zendeck_life_${currentUser.id}`) || '{}');
    lifeIntegrations = {
      outlook_client_id: saved.outlook_client_id || '',
      apple_ics_url: saved.apple_ics_url || '',
      apple_ics_raw: saved.apple_ics_raw || ''
    };
  } catch {
    lifeIntegrations = { outlook_client_id: '', apple_ics_url: '', apple_ics_raw: '' };
  }
}

function saveLifeIntegrationsBackup() {
  if (!currentUser) return;
  localStorage.setItem(`zendeck_life_${currentUser.id}`, JSON.stringify(lifeIntegrations));
}

async function saveProfilePrefs(partial) {
  userPrefs = { ...userPrefs, ...partial };
  saveLocalLayoutBackup();
  await sb.from('profiles').update(partial).eq('id', currentUser.id);
}

async function initDashboard() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('current-date').textContent = new Date().toLocaleDateString('es-HN', options);

  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('fin-tx-date').value = todayStr;
  document.getElementById('fin-plan-date').value = todayStr;

  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  const displayName = profile?.full_name || currentUser.user_metadata?.full_name || 'Usuario';
  document.getElementById('welcome-user').textContent = `Hola, ${displayName}`;

  const localBackup = loadLocalLayoutBackup();
  loadLifeIntegrationsBackup();

  if (profile) {
    userPrefs = {
      weather_city: profile.weather_city || 'San Pedro Sula, HN',
      weather_lat: profile.weather_lat ?? 15.5042,
      weather_lon: profile.weather_lon ?? -88.0250,
      currency_from: profile.currency_from || 'USD',
      currency_to: profile.currency_to || 'HNL',
      widget_sizes: Object.keys(profile.widget_sizes || {}).length ? profile.widget_sizes : (localBackup.widget_sizes || {}),
      widget_order: Array.isArray(profile.widget_order) && profile.widget_order.length ? profile.widget_order : (localBackup.widget_order || []),
      hidden_widgets: Array.isArray(profile.hidden_widgets) && profile.hidden_widgets.length ? profile.hidden_widgets : (localBackup.hidden_widgets || []),
      google_client_id: profile.google_client_id || ''
    };
  }

  document.getElementById('google-client-id-input').value = userPrefs.google_client_id;
  const outlookInp = document.getElementById('outlook-client-id-input');
  const icsUrlInp = document.getElementById('ics-calendar-url-input');
  if (outlookInp) outlookInp.value = lifeIntegrations.outlook_client_id;
  if (icsUrlInp) icsUrlInp.value = lifeIntegrations.apple_ics_url;

  initCurrencySelectors();
  bindUniversalWidgetControls();

  requestAnimationFrame(() => {
    ZenFX.positionNavGlider(false);
    ZenFX.setModuleTheme(activeModuleId);
    ZenFX.cascadeModuleWidgets(document.getElementById(activeModuleId));
  });

  await loadBaseUsdRates();
  loadWeather();
  loadExchangeRates();
  loadQuickLinks();
  loadTodos();
  loadReminders();
  await loadCustomWidgets();
  applyAllWidgetLayouts();
  initSavedAppleCalendar();
  loadFinanceModule();
  loadParleysModule();
}

function getWidgetsInActiveModule() {
  const activeContainer = document.getElementById(activeModuleId);
  if (!activeContainer) return [];
  return Array.from(activeContainer.querySelectorAll('.zen-widget'));
}

function applyAllWidgetLayouts() {
  document.querySelectorAll('.zen-widget').forEach((card) => {
    const id = card.dataset.widgetId;
    if (!id) return;

    const sz = userPrefs.widget_sizes?.[id] || card.dataset.defaultSize || (card.classList.contains('size-2x1') ? '2x1' : '1x1');
    if (!card.dataset.defaultSize) {
      card.dataset.defaultSize = card.classList.contains('size-2x1') ? '2x1' : '1x1';
    }

    card.classList.remove('size-2x1', 'size-1x2', 'size-2x2');
    if (sz !== '1x1') card.classList.add(`size-${sz}`);

    const isHidden = (userPrefs.hidden_widgets || []).includes(id);
    card.classList.toggle('hidden', isHidden);
  });

  const order = userPrefs.widget_order || [];
  if (order.length > 0) {
    document.querySelectorAll('.module-dropzone').forEach((zone) => {
      const cardsMap = new Map();
      zone.querySelectorAll(':scope > .zen-widget').forEach((el) => {
        if (el.dataset.widgetId) cardsMap.set(el.dataset.widgetId, el);
      });

      order.forEach((wId) => {
        const el = cardsMap.get(wId);
        if (el) zone.appendChild(el);
      });
    });
  }

  updateHiddenCounterBadge();
}

function updateHiddenCounterBadge() {
  const hiddenSet = new Set(userPrefs.hidden_widgets || []);
  const moduleWidgetIds = getWidgetsInActiveModule().map((c) => c.dataset.widgetId);
  const moduleHiddenCount = moduleWidgetIds.filter((id) => hiddenSet.has(id)).length;

  const btn = document.getElementById('open-layout-modal-btn');
  btn.textContent = moduleHiddenCount > 0 ? `⚙ Widgets (${moduleHiddenCount} ocultos)` : '⚙ Widgets';
  requestAnimationFrame(() => ZenFX.positionNavGlider(false));
}

async function persistCurrentWidgetOrder() {
  const allOrderedIds = Array.from(document.querySelectorAll('.module-dropzone > .zen-widget'))
    .map((el) => el.dataset.widgetId)
    .filter(Boolean);

  await saveProfilePrefs({ widget_order: allOrderedIds });
}

// ==========================================
// SOPORTE TÁCTIL FLUIDO (120FPS SIN TRABAS EN IPHONE / ANDROID)
// ==========================================
const touchDragState = {
  active: false,
  card: null,
  ghost: null,
  offsetX: 0,
  offsetY: 0,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,
  hasPendingMove: false,
  longPressTimer: null,
  rafId: null,
  cachedSiblings: [],
  lastSwapTime: 0
};

function refreshTouchDragSiblingCache() {
  if (!touchDragState.active || !touchDragState.card?.parentElement) {
    touchDragState.cachedSiblings = [];
    return;
  }
  const container = touchDragState.card.parentElement;
  const siblings = Array.from(container.querySelectorAll(':scope > .zen-widget:not(.hidden)'));
  touchDragState.cachedSiblings = siblings.map((el) => {
    const r = el.getBoundingClientRect();
    return {
      el,
      top: r.top,
      bottom: r.bottom,
      left: r.left,
      right: r.right,
      midX: r.left + r.width / 2,
      midY: r.top + r.height / 2
    };
  });
}

function startTouchWidgetDrag(card, touch) {
  if (touchDragState.active) return;

  const rect = card.getBoundingClientRect();
  touchDragState.active = true;
  touchDragState.card = card;
  touchDragState.offsetX = touch.clientX - rect.left;
  touchDragState.offsetY = touch.clientY - rect.top;
  touchDragState.lastX = touch.clientX;
  touchDragState.lastY = touch.clientY;
  touchDragState.hasPendingMove = false;
  touchDragState.lastSwapTime = 0;

  card.draggable = false;
  card.style.transform = '';
  document.body.classList.add('is-touch-dragging');

  const ghost = card.cloneNode(true);
  ghost.removeAttribute('draggable');
  ghost.classList.add('touch-drag-ghost');
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.left = '0px';
  ghost.style.top = '0px';
  ghost.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0) scale(1.02)`;

  document.body.appendChild(ghost);
  touchDragState.ghost = ghost;
  card.classList.add('touch-dragging-source');

  refreshTouchDragSiblingCache();

  if (navigator.vibrate) {
    try { navigator.vibrate(15); } catch {}
  }

  const dragFrameLoop = () => {
    if (!touchDragState.active) return;

    if (touchDragState.hasPendingMove && touchDragState.ghost) {
      touchDragState.hasPendingMove = false;
      const x = touchDragState.lastX - touchDragState.offsetX;
      const y = touchDragState.lastY - touchDragState.offsetY;
      touchDragState.ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.02)`;
      evaluateTouchWidgetSwap();
    }

    const edgeZone = 95;
    let scrolled = false;
    if (touchDragState.lastY < edgeZone && window.scrollY > 0) {
      window.scrollBy(0, -9);
      scrolled = true;
    } else if (
      touchDragState.lastY > window.innerHeight - edgeZone &&
      window.scrollY + window.innerHeight < document.documentElement.scrollHeight
    ) {
      window.scrollBy(0, 9);
      scrolled = true;
    }

    if (scrolled) {
      refreshTouchDragSiblingCache();
      evaluateTouchWidgetSwap();
    }

    touchDragState.rafId = requestAnimationFrame(dragFrameLoop);
  };

  touchDragState.rafId = requestAnimationFrame(dragFrameLoop);
}

function evaluateTouchWidgetSwap() {
  const now = performance.now();
  if (now - touchDragState.lastSwapTime < 170) return;

  const activeCard = touchDragState.card;
  const container = activeCard?.parentElement;
  if (!activeCard || !container) return;

  const cx = touchDragState.lastX;
  const cy = touchDragState.lastY;

  const hit = touchDragState.cachedSiblings.find(
    (item) =>
      item.el !== activeCard &&
      cx >= item.left &&
      cx <= item.right &&
      cy >= item.top &&
      cy <= item.bottom
  );

  if (!hit) return;

  const deadzone = 14;
  let swapped = false;

  if (cy > hit.midY + deadzone) {
    if (hit.el.nextSibling !== activeCard) {
      container.insertBefore(activeCard, hit.el.nextSibling);
      swapped = true;
    }
  } else if (cy < hit.midY - deadzone) {
    if (hit.el.previousSibling !== activeCard) {
      container.insertBefore(activeCard, hit.el);
      swapped = true;
    }
  }

  if (swapped) {
    touchDragState.lastSwapTime = now;
    refreshTouchDragSiblingCache();
  }
}

async function finishTouchWidgetDrag(clientX, clientY) {
  if (touchDragState.longPressTimer) {
    clearTimeout(touchDragState.longPressTimer);
    touchDragState.longPressTimer = null;
  }
  if (touchDragState.rafId) {
    cancelAnimationFrame(touchDragState.rafId);
    touchDragState.rafId = null;
  }

  if (!touchDragState.active) return;

  const movedCard = touchDragState.card;
  if (touchDragState.ghost) {
    touchDragState.ghost.remove();
    touchDragState.ghost = null;
  }
  if (movedCard) {
    movedCard.classList.remove('touch-dragging-source');
    movedCard.style.transform = '';
    movedCard.draggable = true;
  }

  document.body.classList.remove('is-touch-dragging');
  touchDragState.active = false;
  touchDragState.card = null;
  touchDragState.cachedSiblings = [];

  ZenFX.burst(clientX || touchDragState.lastX, clientY || touchDragState.lastY, 16);
  await persistCurrentWidgetOrder();
}

document.addEventListener('touchmove', (e) => {
  const touch = e.touches[0];
  if (!touch) return;

  if (touchDragState.longPressTimer && !touchDragState.active) {
    const dist = Math.hypot(touch.clientX - touchDragState.startX, touch.clientY - touchDragState.startY);
    if (dist > 10) {
      clearTimeout(touchDragState.longPressTimer);
      touchDragState.longPressTimer = null;
    }
  }

  if (touchDragState.active) {
    e.preventDefault();
    touchDragState.lastX = touch.clientX;
    touchDragState.lastY = touch.clientY;
    touchDragState.hasPendingMove = true;
  }
}, { passive: false });

document.addEventListener('touchend', (e) => {
  const touch = e.changedTouches[0];
  finishTouchWidgetDrag(touch?.clientX, touch?.clientY);
});

document.addEventListener('touchcancel', () => {
  finishTouchWidgetDrag();
});

function bindDragEventsToZenWidget(card) {
  if (card.dataset.dragBound === '1') return;
  card.dataset.dragBound = '1';

  card.addEventListener('dragstart', (e) => {
    if (touchDragState.active || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(e.target.tagName)) {
      e.preventDefault();
      return;
    }
    card.style.transform = '';
    draggedWidgetEl = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.widgetId || '');
  });

  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedWidgetEl || draggedWidgetEl === card) return;
    if (draggedWidgetEl.parentElement !== card.parentElement) return;
    card.classList.add('drag-over');
  });

  card.addEventListener('dragleave', () => {
    card.classList.remove('drag-over');
  });

  card.addEventListener('drop', async (e) => {
    e.preventDefault();
    card.classList.remove('drag-over');
    if (!draggedWidgetEl || draggedWidgetEl === card) return;
    if (draggedWidgetEl.parentElement !== card.parentElement) return;

    const container = card.parentElement;
    const children = Array.from(container.children);
    const draggedIdx = children.indexOf(draggedWidgetEl);
    const targetIdx = children.indexOf(card);

    if (draggedIdx < targetIdx) {
      container.insertBefore(draggedWidgetEl, card.nextSibling);
    } else {
      container.insertBefore(draggedWidgetEl, card);
    }

    ZenFX.burst(e.clientX, e.clientY, 16);
    await persistCurrentWidgetOrder();
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    card.style.transform = '';
    document.querySelectorAll('.zen-widget').forEach((el) => el.classList.remove('drag-over'));
    draggedWidgetEl = null;
  });

  card.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(e.target.tagName)) return;

    const touch = e.touches[0];
    const isHandle = Boolean(e.target.closest('.drag-handle'));

    if (isHandle) {
      e.preventDefault();
      e.stopPropagation();
      startTouchWidgetDrag(card, touch);
      return;
    }

    if (e.target.closest('.widget-header')) {
      touchDragState.startX = touch.clientX;
      touchDragState.startY = touch.clientY;
      clearTimeout(touchDragState.longPressTimer);
      touchDragState.longPressTimer = setTimeout(() => {
        startTouchWidgetDrag(card, touch);
      }, 280);
    }
  }, { passive: false });
}

function bindUniversalWidgetControls() {
  document.querySelectorAll('.zen-widget').forEach(bindDragEventsToZenWidget);

  document.querySelectorAll('.resize-btn').forEach((btn) => {
    if (btn.dataset.resizeBound === '1') return;
    btn.dataset.resizeBound = '1';
    btn.addEventListener('click', async () => {
      const id = btn.dataset.resize;
      const card = document.querySelector(`.zen-widget[data-widget-id="${id}"]`);
      const currentSz = userPrefs.widget_sizes?.[id] || card?.dataset.defaultSize || '1x1';
      const nextSz = SIZE_CYCLE[(SIZE_CYCLE.indexOf(currentSz) + 1) % SIZE_CYCLE.length];
      const updatedSizes = { ...(userPrefs.widget_sizes || {}), [id]: nextSz };
      await saveProfilePrefs({ widget_sizes: updatedSizes });
      applyAllWidgetLayouts();
      if (card) {
        card.classList.remove('zen-cascade-enter');
        void card.offsetWidth;
        card.classList.add('zen-cascade-enter');
      }
    });
  });

  document.querySelectorAll('.hide-widget-btn').forEach((btn) => {
    if (btn.dataset.hideBound === '1') return;
    btn.dataset.hideBound = '1';
    btn.addEventListener('click', async () => {
      const id = btn.dataset.hide;
      const hiddenSet = new Set(userPrefs.hidden_widgets || []);
      hiddenSet.add(id);
      await saveProfilePrefs({ hidden_widgets: Array.from(hiddenSet) });
      applyAllWidgetLayouts();
    });
  });
}

const layoutModal = document.getElementById('layout-modal');

document.getElementById('open-layout-modal-btn').addEventListener('click', () => {
  renderLayoutManagerList();
  layoutModal.classList.remove('hidden');
});

document.getElementById('close-layout-modal-btn').addEventListener('click', () => {
  layoutModal.classList.add('hidden');
});

document.getElementById('done-layout-btn').addEventListener('click', () => {
  layoutModal.classList.add('hidden');
});

document.getElementById('reset-layout-btn').addEventListener('click', async () => {
  const modCards = getWidgetsInActiveModule();
  const modIds = new Set(modCards.map((c) => c.dataset.widgetId));

  const nextHidden = (userPrefs.hidden_widgets || []).filter((id) => !modIds.has(id));
  const nextSizes = { ...(userPrefs.widget_sizes || {}) };
  modIds.forEach((id) => delete nextSizes[id]);
  const nextOrder = (userPrefs.widget_order || []).filter((id) => !modIds.has(id));

  await saveProfilePrefs({
    widget_sizes: nextSizes,
    widget_order: nextOrder,
    hidden_widgets: nextHidden
  });
  applyAllWidgetLayouts();
  renderLayoutManagerList();
  ZenFX.cascadeModuleWidgets(document.getElementById(activeModuleId));
});

function renderLayoutManagerList() {
  const list = document.getElementById('layout-widgets-list');
  list.innerHTML = '';

  const modLabel = MODULE_INFO[activeModuleId]?.label || 'Módulo actual';
  const modalHeading = layoutModal.querySelector('h3');
  if (modalHeading) modalHeading.textContent = `Widgets • ${modLabel}`;

  const hiddenSet = new Set(userPrefs.hidden_widgets || []);
  const moduleCards = getWidgetsInActiveModule();

  moduleCards.forEach((card) => {
    const id = card.dataset.widgetId;
    const title = card.dataset.widgetTitle || id;
    const isVisible = !hiddenSet.has(id);

    const li = document.createElement('li');
    li.className = 'list-item hover-glass';
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(title)}</strong>
        <div class="muted-text">${escapeHtml(modLabel)}</div>
      </div>
      <button type="button" class="glass-btn ${isVisible ? 'primary' : ''} hover-glass" onclick="toggleWidgetVisibility('${id}')">
        ${isVisible ? '👁 Visible' : '🚫 Oculto'}
      </button>
    `;
    list.appendChild(li);
  });
}

window.toggleWidgetVisibility = async (id) => {
  const hiddenSet = new Set(userPrefs.hidden_widgets || []);
  const willShow = hiddenSet.has(id);
  if (willShow) hiddenSet.delete(id);
  else hiddenSet.add(id);
  await saveProfilePrefs({ hidden_widgets: Array.from(hiddenSet) });
  applyAllWidgetLayouts();
  renderLayoutManagerList();

  if (willShow) {
    const card = document.querySelector(`.zen-widget[data-widget-id="${id}"]`);
    if (card) {
      card.classList.remove('zen-cascade-enter');
      void card.offsetWidth;
      card.classList.add('zen-cascade-enter');
    }
  }
};

// ==========================================
// 4. CLIMA CON BÚSQUEDA DE UBICACIÓN
// ==========================================
document.getElementById('toggle-city-search-btn').addEventListener('click', () => {
  document.getElementById('city-search-box').classList.toggle('hidden');
});

document.getElementById('city-search-btn').addEventListener('click', searchCities);
document.getElementById('city-search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchCities();
  }
});

async function searchCities() {
  const query = document.getElementById('city-search-input').value.trim();
  const list = document.getElementById('city-results-list');
  if (!query) return;

  list.innerHTML = `<span class="muted-text">Buscando...</span>`;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=es&format=json`);
    const data = await res.json();
    list.innerHTML = '';

    if (!data.results || data.results.length === 0) {
      list.innerHTML = `<span class="muted-text">Sin resultados.</span>`;
      return;
    }

    data.results.forEach((city) => {
      const label = `${city.name}${city.country_code ? ', ' + city.country_code : ''}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-pill hover-glass';
      btn.textContent = label;
      btn.addEventListener('click', async () => {
        document.getElementById('city-search-box').classList.add('hidden');
        await saveProfilePrefs({
          weather_city: label,
          weather_lat: city.latitude,
          weather_lon: city.longitude
        });
        loadWeather();
        ZenFX.burst();
      });
      list.appendChild(btn);
    });
  } catch {
    list.innerHTML = `<span class="muted-text">Error buscando ciudad.</span>`;
  }
}

async function loadWeather() {
  document.getElementById('weather-city-label').textContent = userPrefs.weather_city;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${userPrefs.weather_lat}&longitude=${userPrefs.weather_lon}&current_weather=true`;
    const res = await fetch(url);
    const data = await res.json();
    const current = data.current_weather;

    const weatherMap = {
      0: ['☀️', 'Despejado'],
      1: ['🌤️', 'Mayormente despejado'],
      2: ['⛅', 'Parcialmente nublado'],
      3: ['☁️', 'Nublado'],
      45: ['🌫️', 'Neblina'],
      61: ['🌧️', 'Lluvia ligera'],
      63: ['🌧️', 'Lluvia moderada'],
      80: ['🌦️', 'Chubascos'],
      95: ['⛈️', 'Tormenta eléctrica']
    };

    const [icon, label] = weatherMap[current.weathercode] || ['🌡️', 'Condición variable'];
    document.getElementById('weather-icon').textContent = icon;
    document.getElementById('weather-temp').textContent = `${Math.round(current.temperature)}°C`;
    document.getElementById('weather-desc').textContent = label;
    document.getElementById('weather-wind').textContent = `Viento: ${current.windspeed} km/h`;
  } catch {
    document.getElementById('weather-desc').textContent = 'No se pudo obtener el clima';
  }
}

// ==========================================
// 5. CONVERSOR MULTIMONEDA EN VIVO
// ==========================================
async function loadBaseUsdRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data?.rates) usdRatesMap = data.rates;
  } catch {
    // Respaldo por defecto
  }
}

function convertCurrency(amount, fromCurr, toCurr) {
  if (fromCurr === toCurr) return amount;
  const fromRate = usdRatesMap[fromCurr] || 1;
  const toRate = usdRatesMap[toCurr] || 1;
  return (amount / fromRate) * toRate;
}

function initCurrencySelectors() {
  const fromSel = document.getElementById('currency-from');
  const toSel = document.getElementById('currency-to');
  const optionsHtml = SUPPORTED_CURRENCIES.map(([code, name]) => `<option value="${code}">${name}</option>`).join('');

  fromSel.innerHTML = optionsHtml;
  toSel.innerHTML = optionsHtml;
  fromSel.value = userPrefs.currency_from;
  toSel.value = userPrefs.currency_to;
}

async function loadExchangeRates() {
  const fromCode = document.getElementById('currency-from').value || 'USD';
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${fromCode}`);
    const data = await res.json();
    currentRatesMap = data.rates || {};
    updateCurrencyConversion();
  } catch {
    document.getElementById('exchange-rate-value').textContent = 'Error de red';
  }
}

function updateCurrencyConversion() {
  const fromCode = document.getElementById('currency-from').value || 'USD';
  const toCode = document.getElementById('currency-to').value || 'HNL';
  const rate = currentRatesMap[toCode] || 1;
  const amount = parseFloat(document.getElementById('currency-amount-input').value) || 0;
  const converted = amount * rate;

  document.getElementById('rate-label').textContent = `1 ${fromCode} equivale a`;
  document.getElementById('exchange-rate-value').textContent = `${rate.toFixed(4)} ${toCode}`;
  document.getElementById('currency-from-code').textContent = fromCode;
  document.getElementById('currency-output').textContent = `${formatMoney(converted)} ${toCode}`;
}

document.getElementById('currency-from').addEventListener('change', async (e) => {
  await saveProfilePrefs({ currency_from: e.target.value });
  loadExchangeRates();
});

document.getElementById('currency-to').addEventListener('change', async (e) => {
  await saveProfilePrefs({ currency_to: e.target.value });
  updateCurrencyConversion();
});

document.getElementById('swap-currency-btn').addEventListener('click', async () => {
  const fromSel = document.getElementById('currency-from');
  const toSel = document.getElementById('currency-to');
  const temp = fromSel.value;
  fromSel.value = toSel.value;
  toSel.value = temp;
  ZenFX.burst();
  await saveProfilePrefs({ currency_from: fromSel.value, currency_to: toSel.value });
  loadExchangeRates();
});

document.getElementById('currency-amount-input').addEventListener('input', updateCurrencyConversion);

// ==========================================
// 6. ACCESOS RÁPIDOS / LINKS
// ==========================================
function normalizeUrl(rawUrl) {
  let clean = rawUrl.trim();
  if (!/^https?:\/\//i.test(clean)) clean = 'https://' + clean;
  return clean;
}

async function loadQuickLinks() {
  const { data: links } = await sb
    .from('quick_links')
    .select('*')
    .order('created_at', { ascending: true });

  const grid = document.getElementById('links-grid');
  grid.innerHTML = '';
  const items = links || [];
  document.getElementById('links-counter').textContent = `${items.length} links`;

  items.forEach((lk) => {
    let domain = '';
    try {
      domain = new URL(lk.url).hostname;
    } catch {
      domain = 'google.com';
    }

    const chip = document.createElement('div');
    chip.className = 'link-chip hover-glass';
    chip.innerHTML = `
      <a href="${escapeHtml(lk.url)}" target="_blank" rel="noopener noreferrer" class="link-chip-main" title="${escapeHtml(lk.url)}">
        <img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32" class="link-favicon" alt="" />
        <span>${escapeHtml(lk.title)}</span>
      </a>
      <button type="button" class="icon-btn" onclick="deleteQuickLink('${lk.id}')" style="padding:0.15rem 0.4rem;">✕</button>
    `;
    grid.appendChild(chip);
  });
}

document.getElementById('link-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const titleInput = document.getElementById('link-title');
  const urlInput = document.getElementById('link-url');
  const fullUrl = normalizeUrl(urlInput.value);

  let title = titleInput.value.trim();
  if (!title) {
    try {
      title = new URL(fullUrl).hostname.replace(/^www\./, '');
    } catch {
      title = 'Enlace';
    }
  }

  await sb.from('quick_links').insert({
    user_id: currentUser.id,
    title,
    url: fullUrl
  });

  ZenFX.burst();
  titleInput.value = '';
  urlInput.value = '';
  loadQuickLinks();
});

window.deleteQuickLink = async (id) => {
  await sb.from('quick_links').delete().eq('id', id);
  loadQuickLinks();
};

// ==========================================
// 7. TAREAS PENDIENTES & RECORDATORIOS
// ==========================================
async function loadTodos() {
  const { data: todos } = await sb.from('todos').select('*').order('created_at', { ascending: false });
  const list = document.getElementById('todo-list');
  list.innerHTML = '';
  let pendingCount = 0;

  (todos || []).forEach((todo) => {
    if (!todo.completed) pendingCount++;
    const li = document.createElement('li');
    li.className = `list-item hover-glass ${todo.completed ? 'completed' : ''}`;
    li.innerHTML = `
      <span>${escapeHtml(todo.title)}</span>
      <div class="item-actions">
        <button class="icon-btn hover-glass" onclick="toggleTodo('${todo.id}', ${!todo.completed})">✓</button>
        <button class="icon-btn hover-glass" onclick="deleteTodo('${todo.id}')">✕</button>
      </div>
    `;
    list.appendChild(li);
  });

  document.getElementById('todo-counter').textContent = `${pendingCount} pendientes`;
}

document.getElementById('todo-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('todo-input');
  const title = input.value.trim();
  if (!title) return;
  await sb.from('todos').insert({ user_id: currentUser.id, title });
  ZenFX.burst();
  input.value = '';
  loadTodos();
});

window.toggleTodo = async (id, completed) => {
  if (completed) {
    ZenFX.burst(undefined, undefined, 24, ['#34d399', '#2dd4bf', '#38bdf8', '#fde047']);
  }
  await sb.from('todos').update({ completed }).eq('id', id);
  loadTodos();
};

window.deleteTodo = async (id) => {
  await sb.from('todos').delete().eq('id', id);
  loadTodos();
};

async function loadReminders() {
  const { data: reminders } = await sb.from('reminders').select('*').order('remind_at', { ascending: true });
  const list = document.getElementById('reminder-list');
  list.innerHTML = '';
  const now = new Date();

  (reminders || []).forEach((rem) => {
    const remDate = new Date(rem.remind_at);
    const isOverdue = remDate < now;
    const dateFormatted = remDate.toLocaleString('es-HN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const li = document.createElement('li');
    li.className = 'list-item hover-glass';
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(rem.title)}</strong>
        <div class="muted-text">
          ${dateFormatted}
          ${isOverdue ? '<span class="glass-pill overdue" style="margin-left:6px;">Vencido</span>' : ''}
        </div>
      </div>
      <button class="icon-btn hover-glass" onclick="deleteReminder('${rem.id}')">✕</button>
    `;
    list.appendChild(li);
  });
}

document.getElementById('reminder-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const titleInput = document.getElementById('reminder-title');
  const dateInput = document.getElementById('reminder-date');
  await sb.from('reminders').insert({
    user_id: currentUser.id,
    title: titleInput.value.trim(),
    remind_at: new Date(dateInput.value).toISOString()
  });
  ZenFX.burst();
  titleInput.value = '';
  dateInput.value = '';
  loadReminders();
});

window.deleteReminder = async (id) => {
  await sb.from('reminders').delete().eq('id', id);
  loadReminders();
};

// ==========================================
// 8. WIDGETS PERSONALIZABLES INTERACTIVOS
// ==========================================
const widgetModal = document.getElementById('widget-modal');
const widgetTypeSelect = document.getElementById('widget-type');

document.getElementById('open-widget-modal-btn').addEventListener('click', () => {
  widgetModal.classList.remove('hidden');
});

document.getElementById('close-widget-modal-btn').addEventListener('click', () => {
  widgetModal.classList.add('hidden');
});

widgetTypeSelect.addEventListener('change', () => {
  const type = widgetTypeSelect.value;
  const dynFields = document.getElementById('widget-dynamic-fields');
  const counterFields = document.getElementById('widget-counter-fields');
  const timerFields = document.getElementById('widget-timer-fields');
  const contentArea = document.getElementById('widget-content');
  const contentLabel = document.getElementById('widget-content-label');

  dynFields.classList.toggle('hidden', type === 'counter' || type === 'timer');
  counterFields.classList.toggle('hidden', type !== 'counter');
  timerFields.classList.toggle('hidden', type !== 'timer');
  contentArea.required = (type === 'note' || type === 'checklist');

  if (type === 'checklist') {
    contentLabel.textContent = 'Elementos (uno por línea)';
    contentArea.placeholder = 'Revisar correos\nHacer ejercicio\nLeer 20 páginas';
  } else {
    contentLabel.textContent = 'Contenido o Enlaces';
    contentArea.placeholder = 'Escribe notas o pega URLs clicables...';
  }
});

async function loadCustomWidgets() {
  const { data: widgets } = await sb
    .from('custom_widgets')
    .select('*')
    .order('created_at', { ascending: true });

  document.querySelectorAll('.dynamic-custom-widget').forEach((el) => el.remove());

  (widgets || []).forEach((w) => {
    const wId = `custom-${w.id}`;
    const targetModId = w.widget_data?.target_module || 'dashboard-module';
    const targetModObj = MODULE_INFO[targetModId] || MODULE_INFO['dashboard-module'];
    const targetContainer = document.getElementById(targetModId);
    const dropzone = targetContainer?.classList.contains('module-dropzone')
      ? targetContainer
      : targetContainer?.querySelector('.module-dropzone') || document.getElementById('dashboard-module');

    const card = document.createElement('article');
    const sz = userPrefs.widget_sizes?.[wId] || w.size || '1x1';
    card.className = `glass-card widget-card hover-glass dynamic-custom-widget zen-widget ${sz !== '1x1' ? 'size-' + sz : ''}`;
    card.draggable = true;
    card.dataset.widgetId = wId;
    card.dataset.widgetTitle = w.title;
    card.dataset.module = targetModObj.label;

    const type = w.widget_type || 'note';
    const wData = w.widget_data || {};
    let bodyHtml = '';

    if (type === 'checklist') {
      const items = Array.isArray(wData.items) ? wData.items : [];
      const listHtml = items.map((it, idx) => `
        <li class="list-item ${it.done ? 'completed' : ''}">
          <span>${escapeHtml(it.text)}</span>
          <button class="icon-btn hover-glass" onclick="toggleCustomCheckItem('${w.id}', ${idx})">✓</button>
        </li>
      `).join('');
      bodyHtml = `
        <div class="inline-form">
          <input type="text" id="chk-input-${w.id}" placeholder="Añadir ítem..." class="hover-glass" />
          <button type="button" class="glass-btn primary hover-glass" onclick="addCustomCheckItem('${w.id}')">+</button>
        </div>
        <ul class="glass-list">${listHtml}</ul>
      `;
    } else if (type === 'counter') {
      const val = Number(wData.value ?? 0);
      const goal = Number(wData.goal ?? 10);
      const pct = goal > 0 ? Math.min(100, Math.round((val / goal) * 100)) : 0;
      bodyHtml = `
        <div class="counter-display">
          <button class="glass-btn hover-glass" onclick="updateCustomCounter('${w.id}', -1)">−</button>
          <div style="text-align:center;">
            <strong class="big-metric">${val}</strong>
            <div class="muted-text">Meta: ${goal} (${pct}%)</div>
          </div>
          <button class="glass-btn primary hover-glass" onclick="updateCustomCounter('${w.id}', 1)">+</button>
        </div>
        <div class="prob-bar-bg"><div class="prob-bar-fill" style="width:${pct}%;"></div></div>
      `;
    } else if (type === 'timer') {
      const mins = Number(wData.minutes ?? 25);
      const secs = activeTimers[w.id]?.remaining ?? mins * 60;
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      bodyHtml = `
        <div style="text-align:center; padding:0.5rem 0;">
          <div id="timer-disp-${w.id}" class="big-metric">${mm}:${ss}</div>
          <div class="inline-form" style="justify-content:center; margin-top:0.75rem;">
            <button class="glass-btn primary hover-glass" onclick="startWidgetTimer('${w.id}', ${mins})">Iniciar</button>
            <button class="glass-btn hover-glass" onclick="pauseWidgetTimer('${w.id}')">Pausar</button>
            <button class="glass-btn danger hover-glass" onclick="resetWidgetTimer('${w.id}', ${mins})">Reiniciar</button>
          </div>
        </div>
      `;
    } else {
      bodyHtml = `<p class="custom-widget-text">${linkifyText(w.content)}</p>`;
    }

    card.innerHTML = `
      <div class="widget-header">
        <div class="header-title-group">
          <span class="drag-handle" title="Arrastrar para mover">⋮⋮</span>
          <span class="glass-pill">${escapeHtml(w.tag)}</span>
        </div>
        <div class="header-controls">
          <button class="icon-btn hover-glass" onclick="cycleCustomWidgetSize('${w.id}', '${sz}')" title="Cambiar tamaño">⤢</button>
          <button class="icon-btn hide-widget-btn hover-glass" data-hide="${wId}" title="Ocultar widget">👁</button>
          <button class="icon-btn hover-glass" onclick="deleteCustomWidget('${w.id}')" title="Eliminar widget">✕</button>
        </div>
      </div>
      <h3>${escapeHtml(w.title)}</h3>
      ${bodyHtml}
    `;
    dropzone.appendChild(card);
  });

  bindUniversalWidgetControls();
}

document.getElementById('custom-widget-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.getElementById('widget-type').value;
  const size = document.getElementById('widget-size').value;
  const title = document.getElementById('widget-title').value.trim();
  const tag = document.getElementById('widget-tag').value.trim() || 'Personal';
  const rawContent = document.getElementById('widget-content').value.trim();

  let widgetData = { target_module: activeModuleId };
  if (type === 'checklist') {
    const items = rawContent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text, done: false }));
    widgetData.items = items;
  } else if (type === 'counter') {
    widgetData.value = Number(document.getElementById('widget-counter-start').value) || 0;
    widgetData.goal = Number(document.getElementById('widget-counter-goal').value) || 10;
  } else if (type === 'timer') {
    widgetData.minutes = Number(document.getElementById('widget-timer-minutes').value) || 25;
  }

  await sb.from('custom_widgets').insert({
    user_id: currentUser.id,
    title,
    tag,
    content: rawContent || title,
    widget_type: type,
    widget_data: widgetData,
    size
  });

  ZenFX.burst(undefined, undefined, 26);
  e.target.reset();
  widgetTypeSelect.dispatchEvent(new Event('change'));
  widgetModal.classList.add('hidden');
  await loadCustomWidgets();
  applyAllWidgetLayouts();
  ZenFX.cascadeModuleWidgets(document.getElementById(activeModuleId));
});

window.cycleCustomWidgetSize = async (id, currentSz) => {
  const nextSz = SIZE_CYCLE[(SIZE_CYCLE.indexOf(currentSz) + 1) % SIZE_CYCLE.length];
  const wId = `custom-${id}`;
  await sb.from('custom_widgets').update({ size: nextSz }).eq('id', id);
  await saveProfilePrefs({ widget_sizes: { ...(userPrefs.widget_sizes || {}), [wId]: nextSz } });
  await loadCustomWidgets();
  applyAllWidgetLayouts();
};

window.deleteCustomWidget = async (id) => {
  pauseWidgetTimer(id);
  await sb.from('custom_widgets').delete().eq('id', id);
  await loadCustomWidgets();
  applyAllWidgetLayouts();
};

window.toggleCustomCheckItem = async (widgetId, itemIdx) => {
  const { data } = await sb.from('custom_widgets').select('widget_data').eq('id', widgetId).single();
  const wData = data?.widget_data || {};
  const items = wData.items || [];
  if (items[itemIdx]) {
    items[itemIdx].done = !items[itemIdx].done;
    if (items[itemIdx].done) ZenFX.burst();
  }
  await sb.from('custom_widgets').update({ widget_data: { ...wData, items } }).eq('id', widgetId);
  await loadCustomWidgets();
  applyAllWidgetLayouts();
};

window.addCustomCheckItem = async (widgetId) => {
  const inp = document.getElementById(`chk-input-${widgetId}`);
  const text = inp?.value.trim();
  if (!text) return;
  const { data } = await sb.from('custom_widgets').select('widget_data').eq('id', widgetId).single();
  const wData = data?.widget_data || {};
  const items = wData.items || [];
  items.push({ text, done: false });
  ZenFX.burst();
  await sb.from('custom_widgets').update({ widget_data: { ...wData, items } }).eq('id', widgetId);
  await loadCustomWidgets();
  applyAllWidgetLayouts();
};

window.updateCustomCounter = async (widgetId, delta) => {
  const { data } = await sb.from('custom_widgets').select('widget_data').eq('id', widgetId).single();
  const wData = data?.widget_data || { value: 0, goal: 10 };
  wData.value = Math.max(0, Number(wData.value || 0) + delta);
  if (delta > 0 && wData.value === Number(wData.goal)) {
    ZenFX.burst(undefined, undefined, 30, ['#34d399', '#fbbf24', '#38bdf8']);
  }
  await sb.from('custom_widgets').update({ widget_data: wData }).eq('id', widgetId);
  await loadCustomWidgets();
  applyAllWidgetLayouts();
};

window.startWidgetTimer = (id, defaultMins) => {
  if (activeTimers[id]?.interval) return;
  if (!activeTimers[id]) activeTimers[id] = { remaining: defaultMins * 60 };
  activeTimers[id].interval = setInterval(() => {
    if (activeTimers[id].remaining <= 0) {
      pauseWidgetTimer(id);
      ZenFX.burst(window.innerWidth / 2, window.innerHeight / 2, 36);
      return;
    }
    activeTimers[id].remaining -= 1;
    const disp = document.getElementById(`timer-disp-${id}`);
    if (disp) {
      const mm = String(Math.floor(activeTimers[id].remaining / 60)).padStart(2, '0');
      const ss = String(activeTimers[id].remaining % 60).padStart(2, '0');
      disp.textContent = `${mm}:${ss}`;
    }
  }, 1000);
};

window.pauseWidgetTimer = (id) => {
  if (activeTimers[id]?.interval) {
    clearInterval(activeTimers[id].interval);
    activeTimers[id].interval = null;
  }
};

window.resetWidgetTimer = (id, defaultMins) => {
  pauseWidgetTimer(id);
  activeTimers[id] = { remaining: defaultMins * 60, interval: null };
  const disp = document.getElementById(`timer-disp-${id}`);
  if (disp) disp.textContent = `${String(defaultMins).padStart(2, '0')}:00`;
};

// ==========================================
// 9. PANEL DE VIDA (GMAIL + OUTLOOK PKCE/.ICS + APPLE CALENDAR .ICS)
// ==========================================
document.getElementById('toggle-google-config-btn')?.addEventListener('click', () => {
  document.getElementById('google-config-panel').classList.toggle('hidden');
});

document.getElementById('close-google-config-btn')?.addEventListener('click', () => {
  document.getElementById('google-config-panel').classList.add('hidden');
});

document.getElementById('google-client-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const clientId = document.getElementById('google-client-id-input').value.trim();
  await saveProfilePrefs({ google_client_id: clientId });
  document.getElementById('google-config-panel').classList.add('hidden');
  connectGoogleServices();
});

document.getElementById('outlook-client-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const clientId = document.getElementById('outlook-client-id-input').value.trim();
  lifeIntegrations.outlook_client_id = clientId;
  saveLifeIntegrationsBackup();
  document.getElementById('google-config-panel').classList.add('hidden');
  if (clientId) connectOutlookServices();
});

document.getElementById('ics-calendar-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const rawUrl = document.getElementById('ics-calendar-url-input').value.trim();
  if (!rawUrl) return;
  lifeIntegrations.apple_ics_url = rawUrl;
  saveLifeIntegrationsBackup();
  document.getElementById('google-config-panel').classList.add('hidden');
  await fetchAppleCalendarFromUrl(rawUrl);
  ZenFX.burst();
});

document.getElementById('ics-file-input')?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '');
    lifeIntegrations.apple_ics_raw = text;
    saveLifeIntegrationsBackup();
    loadAppleCalendarFromRawText(text, file.name);
    document.getElementById('google-config-panel').classList.add('hidden');
    ZenFX.burst();
  };
  reader.readAsText(file);
});

document.getElementById('connect-google-btn')?.addEventListener('click', connectGoogleServices);
document.getElementById('connect-outlook-btn')?.addEventListener('click', connectOutlookServices);

document.getElementById('sync-google-btn')?.addEventListener('click', async () => {
  ZenFX.burst();
  if (googleAccessToken) {
    await Promise.all([fetchGmailLatest5(), fetchCalendarUpcoming()]);
  }
  if (outlookAccessToken) {
    await Promise.all([fetchOutlookLatest5(), fetchOutlookCalendarUpcoming()]);
  }
  if (lifeIntegrations.apple_ics_url) {
    await fetchAppleCalendarFromUrl(lifeIntegrations.apple_ics_url);
  }
});

document.querySelectorAll('#mail-source-filters .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#mail-source-filters .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMailSource = btn.dataset.mailSource || 'ALL';
    renderUnifiedMailList();
  });
});

document.querySelectorAll('#calendar-source-filters .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#calendar-source-filters .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedCalSource = btn.dataset.calSource || 'ALL';
    renderUnifiedCalendarList();
  });
});

function showLifeSyncButtonIfNeeded() {
  const syncBtn = document.getElementById('sync-google-btn');
  if (!syncBtn) return;
  if (googleAccessToken || outlookAccessToken || lifeIntegrations.apple_ics_url || lifeIntegrations.apple_ics_raw) {
    syncBtn.classList.remove('hidden');
  }
}

// --- GOOGLE WORKSPACE (GMAIL + CALENDAR) ---
function connectGoogleServices() {
  const clientId = (userPrefs.google_client_id || document.getElementById('google-client-id-input').value).trim();
  if (!clientId) {
    document.getElementById('google-config-panel').classList.remove('hidden');
    return;
  }

  if (!window.google?.accounts?.oauth2) {
    alert('La librería de Google aún está cargando. Intenta de nuevo en 2 segundos.');
    return;
  }

  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly',
    callback: (tokenResponse) => {
      if (tokenResponse?.access_token) {
        googleAccessToken = tokenResponse.access_token;
        const statusPill = document.getElementById('google-status-pill');
        statusPill.textContent = 'Google • Conectado';
        statusPill.classList.add('high-prob');
        showLifeSyncButtonIfNeeded();
        ZenFX.burst(undefined, undefined, 26);

        fetchGmailLatest5();
        fetchCalendarUpcoming();
      }
    }
  });

  tokenClient.requestAccessToken({ prompt: 'consent' });
}

async function fetchGmailLatest5() {
  try {
    const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
      headers: { Authorization: `Bearer ${googleAccessToken}` }
    });
    const listData = await listRes.json();
    const msgs = listData.messages || [];

    const details = await Promise.all(
      msgs.map((m) =>
        fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
          headers: { Authorization: `Bearer ${googleAccessToken}` }
        }).then((r) => r.json())
      )
    );

    const parsed = details.map((msg) => {
      const headers = msg.payload?.headers || [];
      const getH = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      const subject = getH('Subject') || '(Sin asunto)';
      const rawFrom = getH('From') || 'Remitente desconocido';
      const senderName = rawFrom.replace(/<[^>]+>/g, '').replace(/"/g, '').trim();
      const dateRaw = getH('Date');
      return {
        id: `gmail-${msg.id}`,
        source: 'gmail',
        sourceLabel: 'Gmail',
        subject,
        sender: senderName,
        snippet: msg.snippet || '',
        isUnread: (msg.labelIds || []).includes('UNREAD'),
        dateObj: dateRaw ? new Date(dateRaw) : new Date(),
        url: `https://mail.google.com/mail/u/0/#inbox/${msg.id}`
      };
    });

    unifiedMailItems = [
      ...unifiedMailItems.filter((item) => item.source !== 'gmail'),
      ...parsed
    ];
    renderUnifiedMailList();
  } catch {
    const list = document.getElementById('gmail-list');
    list.innerHTML = `<li class="muted-text">Error al consultar Gmail. Verifica los permisos del Client ID.</li>`;
  }
}

async function fetchCalendarUpcoming() {
  try {
    const nowIso = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(nowIso)}&maxResults=8&singleEvents=true&orderBy=startTime`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${googleAccessToken}` }
    });
    const data = await res.json();
    const events = data.items || [];

    const parsed = events.map((ev) => {
      const startRaw = ev.start?.dateTime || ev.start?.date;
      const isAllDay = Boolean(ev.start?.date && !ev.start?.dateTime);
      return {
        id: `google-${ev.id}`,
        source: 'google',
        sourceLabel: 'Google',
        title: ev.summary || 'Evento sin título',
        startDate: new Date(startRaw),
        isAllDay,
        location: ev.location || '',
        url: ev.htmlLink || ''
      };
    });

    unifiedCalendarEvents = [
      ...unifiedCalendarEvents.filter((ev) => ev.source !== 'google'),
      ...parsed
    ];
    renderUnifiedCalendarList();
  } catch {
    const list = document.getElementById('calendar-events-list');
    list.innerHTML = `<li class="muted-text">Error al cargar Google Calendar.</li>`;
  }
}

// --- MICROSOFT OUTLOOK (OAUTH 2.0 + PKCE PARA @OUTLOOK.COM) ---
function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generatePKCEPair() {
  const randomBytes = new Uint8Array(48);
  crypto.getRandomValues(randomBytes);
  const verifier = base64UrlEncode(randomBytes);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64UrlEncode(digest);
  return { verifier, challenge };
}

async function connectOutlookServices() {
  const clientId = (lifeIntegrations.outlook_client_id || document.getElementById('outlook-client-id-input')?.value || '').trim();
  if (!clientId) {
    document.getElementById('google-config-panel').classList.remove('hidden');
    return;
  }

  const redirectUri = `${window.location.origin}${window.location.pathname}`;
  const scopes = encodeURIComponent('openid profile offline_access User.Read Mail.Read Calendars.Read');
  const { verifier, challenge } = await generatePKCEPair();

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_mode=fragment&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256&prompt=select_account`;

  const popup = window.open(authUrl, 'zen_outlook_oauth', 'width=520,height=640');
  if (!popup) {
    alert('Permite las ventanas emergentes para conectar tu cuenta de Outlook.');
    return;
  }

  const timer = setInterval(async () => {
    try {
      if (popup.closed) {
        clearInterval(timer);
        return;
      }
      if (popup.location.origin === window.location.origin && popup.location.hash) {
        const params = new URLSearchParams(popup.location.hash.substring(1));
        const authCode = params.get('code');
        const errDesc = params.get('error_description');
        popup.close();
        clearInterval(timer);

        if (errDesc) {
          alert(`Microsoft respondió: ${decodeURIComponent(errDesc.replace(/\+/g, ' '))}`);
          return;
        }

        if (authCode) {
          const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              grant_type: 'authorization_code',
              code: authCode,
              redirect_uri: redirectUri,
              code_verifier: verifier
            })
          });
          const tokenData = await tokenRes.json();

          if (tokenData.access_token) {
            outlookAccessToken = tokenData.access_token;
            const pill = document.getElementById('outlook-status-pill');
            if (pill) {
              pill.textContent = 'Outlook • Conectado';
              pill.classList.add('high-prob');
            }
            showLifeSyncButtonIfNeeded();
            ZenFX.burst(undefined, undefined, 26);
            fetchOutlookLatest5();
            fetchOutlookCalendarUpcoming();
          } else if (tokenData.error_description) {
            alert(`Error al validar sesión de Outlook: ${tokenData.error_description}`);
          }
        }
      }
    } catch {
      // Esperando redirección de vuelta al dominio de Zen-Deck
    }
  }, 400);
}

async function fetchOutlookLatest5() {
  if (!outlookAccessToken) return;
  try {
    const res = await fetch(
      'https://graph.microsoft.com/v1.0/me/messages?$top=5&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,webLink',
      { headers: { Authorization: `Bearer ${outlookAccessToken}` } }
    );
    const data = await res.json();
    const msgs = data.value || [];

    const parsed = msgs.map((m) => ({
      id: `outlook-${m.id}`,
      source: 'outlook',
      sourceLabel: 'Outlook',
      subject: m.subject || '(Sin asunto)',
      sender: m.from?.emailAddress?.name || m.from?.emailAddress?.address || 'Remitente',
      snippet: m.bodyPreview || '',
      isUnread: !m.isRead,
      dateObj: m.receivedDateTime ? new Date(m.receivedDateTime) : new Date(),
      url: m.webLink || 'https://outlook.live.com/mail/'
    }));

    unifiedMailItems = [
      ...unifiedMailItems.filter((item) => item.source !== 'outlook'),
      ...parsed
    ];
    renderUnifiedMailList();
  } catch {
    // Error silencioso si la sesión expiró
  }
}

async function fetchOutlookCalendarUpcoming() {
  if (!outlookAccessToken) return;
  try {
    const startIso = new Date().toISOString();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const url = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${encodeURIComponent(startIso)}&endDateTime=${encodeURIComponent(endDate.toISOString())}&$top=8&$orderby=start/dateTime`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${outlookAccessToken}`,
        Prefer: 'outlook.timezone="America/Tegucigalpa"'
      }
    });
    const data = await res.json();
    const events = data.value || [];

    const parsed = events.map((ev) => ({
      id: `outlook-ev-${ev.id}`,
      source: 'outlook',
      sourceLabel: 'Outlook',
      title: ev.subject || 'Evento sin título',
      startDate: new Date(ev.start?.dateTime || Date.now()),
      isAllDay: Boolean(ev.isAllDay),
      location: ev.location?.displayName || '',
      url: ev.webLink || 'https://outlook.live.com/calendar/'
    }));

    unifiedCalendarEvents = [
      ...unifiedCalendarEvents.filter((ev) => ev.source !== 'outlook'),
      ...parsed
    ];
    renderUnifiedCalendarList();
  } catch {
    // Error silencioso si la sesión expiró
  }
}

// --- CALENDARIO .ICS UNIVERSAL (OUTLOOK WEB Y APPLE ICLOUD) ---
function initSavedAppleCalendar() {
  if (lifeIntegrations.apple_ics_url) {
    fetchAppleCalendarFromUrl(lifeIntegrations.apple_ics_url);
  } else if (lifeIntegrations.apple_ics_raw) {
    loadAppleCalendarFromRawText(lifeIntegrations.apple_ics_raw);
  }
}

function parseICSDate(rawVal) {
  if (!rawVal) return null;
  const clean = rawVal.trim();
  if (/^\d{8}$/.test(clean)) {
    const y = Number(clean.slice(0, 4));
    const m = Number(clean.slice(4, 6)) - 1;
    const d = Number(clean.slice(6, 8));
    return { date: new Date(y, m, d, 0, 0, 0), isAllDay: true };
  }
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (match) {
    const [, yy, mm, dd, hh, mi, ss, zFlag] = match;
    const dt = zFlag === 'Z'
      ? new Date(Date.UTC(Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss)))
      : new Date(Number(yy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
    return { date: dt, isAllDay: false };
  }
  const fallback = new Date(clean);
  return Number.isNaN(fallback.getTime()) ? null : { date: fallback, isAllDay: false };
}

function unescapeICSText(str = '') {
  return str
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function parseICSContent(icsText, sourceKey = 'apple', sourceLabel = 'Apple .ics') {
  const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.split('BEGIN:VEVENT').slice(1);
  const events = [];

  blocks.forEach((block, idx) => {
    const body = block.split('END:VEVENT')[0] || '';
    const lines = body.split(/\r?\n/);
    let summary = '';
    let dtStartRaw = '';
    let location = '';
    let uid = `ics-${idx}`;

    lines.forEach((line) => {
      if (line.startsWith('SUMMARY')) {
        summary = unescapeICSText(line.substring(line.indexOf(':') + 1));
      } else if (line.startsWith('DTSTART')) {
        dtStartRaw = line.substring(line.indexOf(':') + 1).trim();
      } else if (line.startsWith('LOCATION')) {
        location = unescapeICSText(line.substring(line.indexOf(':') + 1));
      } else if (line.startsWith('UID')) {
        uid = line.substring(line.indexOf(':') + 1).trim() || uid;
      }
    });

    const parsedDate = parseICSDate(dtStartRaw);
    if (parsedDate) {
      events.push({
        id: `${sourceKey}-${uid}-${idx}`,
        source: sourceKey,
        sourceLabel,
        title: summary || 'Evento sin título',
        startDate: parsedDate.date,
        isAllDay: parsedDate.isAllDay,
        location,
        url: sourceKey === 'outlook' ? 'https://outlook.live.com/calendar/' : ''
      });
    }
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcoming = events
    .filter((ev) => ev.startDate >= todayStart)
    .sort((a, b) => a.startDate - b.startDate);

  return upcoming.length > 0
    ? upcoming.slice(0, 12)
    : events.sort((a, b) => b.startDate - a.startDate).slice(0, 8);
}

function loadAppleCalendarFromRawText(icsText, hintUrlOrName = '') {
  const hintLower = (hintUrlOrName || lifeIntegrations.apple_ics_url || '').toLowerCase();
  const isOutlookIcs =
    hintLower.includes('outlook') ||
    hintLower.includes('office365') ||
    icsText.includes('Microsoft Corporation');

  const sourceKey = isOutlookIcs ? 'outlook' : 'apple';
  const sourceLabel = isOutlookIcs ? 'Outlook' : 'Apple .ics';

  const parsed = parseICSContent(icsText, sourceKey, sourceLabel);
  unifiedCalendarEvents = [
    ...unifiedCalendarEvents.filter((ev) => ev.source !== sourceKey),
    ...parsed
  ];

  const pill = document.getElementById(isOutlookIcs ? 'outlook-status-pill' : 'ics-status-pill');
  if (pill) {
    pill.textContent = `${sourceLabel} • ${parsed.length} eventos`;
    pill.classList.add('high-prob');
  }
  showLifeSyncButtonIfNeeded();
  renderUnifiedCalendarList();
}

async function fetchAppleCalendarFromUrl(rawUrl) {
  const httpsUrl = rawUrl.replace(/^webcal:\/\//i, 'https://');
  const isOutlook = httpsUrl.toLowerCase().includes('outlook') || httpsUrl.toLowerCase().includes('office365');
  const pill = document.getElementById(isOutlook ? 'outlook-status-pill' : 'ics-status-pill');
  if (pill) pill.textContent = `${isOutlook ? 'Outlook' : 'Apple .ics'} • Sincronizando...`;

  try {
    let text = '';
    try {
      const directRes = await fetch(httpsUrl);
      if (!directRes.ok) throw new Error('CORS/HTTP');
      text = await directRes.text();
    } catch {
      const proxyRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(httpsUrl)}`);
      if (!proxyRes.ok) throw new Error('Proxy failed');
      text = await proxyRes.text();
    }

    if (!text.includes('BEGIN:VCALENDAR')) {
      throw new Error('Formato ICS inválido');
    }

    lifeIntegrations.apple_ics_raw = text;
    saveLifeIntegrationsBackup();
    loadAppleCalendarFromRawText(text, httpsUrl);
  } catch {
    if (pill) {
      pill.textContent = `${isOutlook ? 'Outlook' : 'Apple .ics'} • Error de enlace`;
      pill.classList.remove('high-prob');
    }
  }
}

// --- RENDERIZADO UNIFICADO PANEL DE VIDA ---
function renderUnifiedMailList() {
  const list = document.getElementById('gmail-list');
  if (!list) return;

  const filtered = selectedMailSource === 'ALL'
    ? unifiedMailItems
    : unifiedMailItems.filter((item) => item.source === selectedMailSource);

  const sorted = [...filtered].sort((a, b) => b.dateObj - a.dateObj);

  if (sorted.length === 0) {
    list.innerHTML = `<li class="muted-text">No hay correos cargados en esta vista. Conecta Gmail u Outlook arriba.</li>`;
    return;
  }

  list.innerHTML = '';
  sorted.forEach((msg) => {
    const li = document.createElement('li');
    li.className = 'list-item hover-glass';
    li.style.cursor = 'pointer';
    li.onclick = () => window.open(msg.url, '_blank', 'noopener,noreferrer');
    li.innerHTML = `
      <div style="overflow:hidden; flex:1;">
        <div style="display:flex; align-items:center; gap:0.45rem;">
          <span class="source-badge source-${msg.source}">${escapeHtml(msg.sourceLabel)}</span>
          <strong style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(msg.subject)}</strong>
          ${msg.isUnread ? '<span class="glass-pill high-prob">Nuevo</span>' : ''}
        </div>
        <div class="muted-text">${escapeHtml(msg.sender)}</div>
        <div class="muted-text" style="font-size:0.78rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(msg.snippet)}</div>
      </div>
      <span class="icon-btn">↗</span>
    `;
    list.appendChild(li);
  });
}

function renderUnifiedCalendarList() {
  const list = document.getElementById('calendar-events-list');
  if (!list) return;

  const filtered = selectedCalSource === 'ALL'
    ? unifiedCalendarEvents
    : unifiedCalendarEvents.filter((ev) => ev.source === selectedCalSource);

  const sorted = [...filtered].sort((a, b) => a.startDate - b.startDate);
  const countPill = document.getElementById('calendar-count-pill');
  if (countPill) countPill.textContent = `${sorted.length} próximos`;

  if (sorted.length === 0) {
    list.innerHTML = `<li class="muted-text">No hay eventos próximos en esta vista.</li>`;
    return;
  }

  list.innerHTML = '';
  sorted.forEach((ev) => {
    const formattedTime = ev.isAllDay
      ? ev.startDate.toLocaleDateString('es-HN', { weekday: 'short', day: 'numeric', month: 'short' }) + ' • Todo el día'
      : ev.startDate.toLocaleString('es-HN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

    const li = document.createElement('li');
    li.className = 'list-item hover-glass';
    li.innerHTML = `
      <div style="flex:1; overflow:hidden;">
        <div style="display:flex; align-items:center; gap:0.45rem;">
          <span class="source-badge source-${ev.source}">${escapeHtml(ev.sourceLabel)}</span>
          <strong style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(ev.title)}</strong>
        </div>
        <div class="muted-text">${formattedTime}</div>
        ${ev.location ? `<div class="muted-text" style="font-size:0.78rem;">📍 ${escapeHtml(ev.location)}</div>` : ''}
      </div>
      ${ev.url ? `<a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener noreferrer" class="icon-btn" style="text-decoration:none;">↗</a>` : ''}
    `;
    list.appendChild(li);
  });
}

// ==========================================
// 10. ASESOR FINANCIERO PERSONAL (ESTILO WALLET GLASS)
// ==========================================
async function loadFinanceModule() {
  if (isLoadingFinance) return;
  isLoadingFinance = true;

  try {
    const [accRes, catRes, txRes, planRes] = await Promise.all([
      sb.from('finance_accounts').select('*').order('created_at', { ascending: true }),
      sb.from('finance_categories').select('*').order('created_at', { ascending: true }),
      sb.from('finance_transactions').select('*').order('tx_date', { ascending: false }),
      sb.from('finance_planned').select('*').order('next_date', { ascending: true })
    ]);

    finAccounts = accRes.data || [];
    const rawCategories = catRes.data || [];
    finTransactions = txRes.data || [];
    finPlanned = planRes.data || [];

    if (rawCategories.length === 0) {
      const defaults = [
        { user_id: currentUser.id, name: 'Restaurante, comida rápida', type: 'expense', color: '#ef4444' },
        { user_id: currentUser.id, name: 'Combustible y Transporte', type: 'expense', color: '#8b5cf6' },
        { user_id: currentUser.id, name: 'Servicios e Internet', type: 'expense', color: '#f59e0b' },
        { user_id: currentUser.id, name: 'Teléfono y Móvil', type: 'expense', color: '#3b82f6' },
        { user_id: currentUser.id, name: 'TV, Streaming y Suscripciones', type: 'expense', color: '#10b981' },
        { user_id: currentUser.id, name: 'Salario, facturas', type: 'income', color: '#eab308' },
        { user_id: currentUser.id, name: 'Proyectos / Extras', type: 'income', color: '#2dd4bf' }
      ];
      const { data: inserted } = await sb.from('finance_categories').insert(defaults).select();
      finCategories = (inserted || []).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    } else {
      const seenMap = new Map();
      const duplicatesToRemove = [];

      rawCategories.forEach((cat) => {
        const key = `${cat.type}::${cat.name.trim().toLowerCase()}`;
        if (!seenMap.has(key)) {
          seenMap.set(key, cat);
        } else {
          duplicatesToRemove.push({
            duplicateId: cat.id,
            keepId: seenMap.get(key).id
          });
        }
      });

      if (duplicatesToRemove.length > 0) {
        for (const { duplicateId, keepId } of duplicatesToRemove) {
          await sb.from('finance_transactions').update({ category_id: keepId }).eq('category_id', duplicateId);
          await sb.from('finance_planned').update({ category_id: keepId }).eq('category_id', duplicateId);
          await sb.from('finance_categories').delete().eq('id', duplicateId);
        }
        finTransactions.forEach((t) => {
          const match = duplicatesToRemove.find((d) => d.duplicateId === t.category_id);
          if (match) t.category_id = match.keepId;
        });
        finPlanned.forEach((p) => {
          const match = duplicatesToRemove.find((d) => d.duplicateId === p.category_id);
          if (match) p.category_id = match.keepId;
        });
      }

      finCategories = Array.from(seenMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }

    populateFinanceSelectors();
    renderCategoriesManageList();
    renderFinanceDashboard();
  } finally {
    isLoadingFinance = false;
  }
}

function populateFinanceSelectors() {
  const accOptions = finAccounts.length > 0
    ? finAccounts.map((a) => `<option value="${a.id}">${escapeHtml(a.name)} (${a.currency})</option>`).join('')
    : `<option value="">Crea una cuenta primero</option>`;

  document.getElementById('fin-tx-account').innerHTML = accOptions;
  document.getElementById('fin-plan-account').innerHTML = accOptions;
  document.getElementById('confirm-plan-account').innerHTML = accOptions;

  updateCategorySelectByType('fin-tx-type', 'fin-tx-category');
  updateCategorySelectByType('fin-plan-type', 'fin-plan-category');
}

function updateCategorySelectByType(typeSelectId, catSelectId) {
  const selectedType = document.getElementById(typeSelectId).value;
  const matching = finCategories.filter((c) => c.type === selectedType);
  const catSel = document.getElementById(catSelectId);
  catSel.innerHTML = matching.length > 0
    ? matching.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')
    : `<option value="">Sin categoría</option>`;
}

function renderCategoriesManageList() {
  const list = document.getElementById('fin-categories-manage-list');
  if (!list) return;
  list.innerHTML = '';

  if (finCategories.length === 0) {
    list.innerHTML = `<li class="muted-text">No hay categorías creadas.</li>`;
    return;
  }

  finCategories.forEach((cat) => {
    const isInc = cat.type === 'income';
    const li = document.createElement('li');
    li.className = 'list-item hover-glass';
    li.style.padding = '0.45rem 0.7rem';
    li.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.45rem; min-width:0;">
        <span class="glass-pill ${isInc ? 'high-prob' : 'overdue'}" style="font-size:0.68rem; padding:0.16rem 0.5rem;">
          ${isInc ? 'Ingreso' : 'Gasto'}
        </span>
        <span style="font-size:0.86rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(cat.name)}</span>
      </div>
      <button type="button" class="icon-btn hover-glass" onclick="deleteFinCategory('${cat.id}')" title="Eliminar categoría" style="padding:0.15rem 0.42rem;">✕</button>
    `;
    list.appendChild(li);
  });
}

document.getElementById('fin-tx-type').addEventListener('change', () => updateCategorySelectByType('fin-tx-type', 'fin-tx-category'));
document.getElementById('fin-plan-type').addEventListener('change', () => updateCategorySelectByType('fin-plan-type', 'fin-plan-category'));

document.getElementById('toggle-new-cat-btn').addEventListener('click', () => {
  document.getElementById('fin-category-panel').classList.toggle('hidden');
});

document.getElementById('toggle-new-plan-form-btn').addEventListener('click', () => {
  document.getElementById('fin-planned-form').classList.toggle('hidden');
});

document.getElementById('fin-category-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('fin-cat-name').value.trim();
  const type = document.getElementById('fin-cat-type').value;
  if (!name) return;

  const alreadyExists = finCategories.some(
    (c) => c.type === type && c.name.trim().toLowerCase() === name.toLowerCase()
  );

  document.getElementById('fin-cat-name').value = '';
  if (alreadyExists) {
    alert(`La categoría "${name}" ya existe en este tipo.`);
    return;
  }

  await sb.from('finance_categories').insert({ user_id: currentUser.id, name, type });
  ZenFX.burst();
  loadFinanceModule();
});

window.deleteFinCategory = async (catId) => {
  await sb.from('finance_transactions').update({ category_id: null }).eq('category_id', catId);
  await sb.from('finance_planned').update({ category_id: null }).eq('category_id', catId);
  await sb.from('finance_categories').delete().eq('id', catId);
  loadFinanceModule();
};

document.getElementById('fin-account-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('fin-acc-name').value.trim();
  const account_type = document.getElementById('fin-acc-type').value;
  const balance = parseFloat(document.getElementById('fin-acc-balance').value) || 0;
  const currency = document.getElementById('fin-acc-currency').value;

  await sb.from('finance_accounts').insert({
    user_id: currentUser.id,
    name,
    account_type,
    balance,
    currency
  });

  ZenFX.burst();
  e.target.reset();
  loadFinanceModule();
});

window.openEditAccountBalance = (accId) => {
  editingAccountId = accId;
  renderFinanceDashboard();
};

window.cancelEditAccountBalance = () => {
  editingAccountId = null;
  renderFinanceDashboard();
};

window.saveAccountBalance = async (accId) => {
  const inputEl = document.getElementById(`edit-acc-bal-${accId}`);
  if (!inputEl) return;

  const newBalance = parseFloat(inputEl.value);
  if (Number.isNaN(newBalance)) return;

  const acc = finAccounts.find((a) => a.id === accId);
  if (!acc) return;

  const oldBalance = Number(acc.balance || 0);
  const diff = Number((newBalance - oldBalance).toFixed(2));

  await sb.from('finance_accounts').update({ balance: newBalance }).eq('id', accId);

  if (diff !== 0) {
    await sb.from('finance_transactions').insert({
      user_id: currentUser.id,
      account_id: acc.id,
      category_id: null,
      type: diff > 0 ? 'income' : 'expense',
      amount: Math.abs(diff),
      currency: acc.currency,
      description: 'Ajuste manual',
      is_recurring: false,
      tx_date: new Date().toISOString()
    });
  }

  ZenFX.burst();
  editingAccountId = null;
  loadFinanceModule();
};

window.deleteFinAccount = async (id) => {
  await sb.from('finance_accounts').delete().eq('id', id);
  loadFinanceModule();
};

document.getElementById('fin-tx-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const accountId = document.getElementById('fin-tx-account').value;
  if (!accountId) {
    alert('Primero agrega al menos una cuenta en "Mis Cuentas".');
    return;
  }

  const type = document.getElementById('fin-tx-type').value;
  const amount = parseFloat(document.getElementById('fin-tx-amount').value) || 0;
  const categoryId = document.getElementById('fin-tx-category').value || null;
  const description = document.getElementById('fin-tx-desc').value.trim();
  const dateStr = document.getElementById('fin-tx-date').value;
  const is_recurring = document.getElementById('fin-tx-recurring').checked;

  const acc = finAccounts.find((a) => a.id === accountId);
  const currency = acc?.currency || 'HNL';

  await sb.from('finance_transactions').insert({
    user_id: currentUser.id,
    account_id: accountId,
    category_id: categoryId,
    type,
    amount,
    currency,
    description,
    is_recurring,
    tx_date: new Date(dateStr + 'T12:00:00').toISOString()
  });

  if (acc) {
    const delta = type === 'income' ? amount : -amount;
    const newBal = Number((Number(acc.balance) + delta).toFixed(2));
    await sb.from('finance_accounts').update({ balance: newBal }).eq('id', acc.id);
  }

  ZenFX.burst(
    undefined,
    undefined,
    24,
    type === 'income' ? ['#34d399', '#fbbf24', '#38bdf8'] : ['#fb7185', '#f59e0b', '#c084fc']
  );

  document.getElementById('fin-tx-amount').value = '';
  document.getElementById('fin-tx-desc').value = '';
  document.getElementById('fin-tx-recurring').checked = false;
  loadFinanceModule();
});

window.deleteFinTransaction = async (txId) => {
  const tx = finTransactions.find((t) => t.id === txId);
  if (tx && tx.account_id) {
    const acc = finAccounts.find((a) => a.id === tx.account_id);
    if (acc) {
      const amountInAcc = convertCurrency(Number(tx.amount), tx.currency, acc.currency);
      const revertDelta = tx.type === 'income' ? -amountInAcc : amountInAcc;
      const updatedBal = Number((Number(acc.balance) + revertDelta).toFixed(2));
      await sb.from('finance_accounts').update({ balance: updatedBal }).eq('id', acc.id);
    }
  }
  await sb.from('finance_transactions').delete().eq('id', txId);
  loadFinanceModule();
};

document.getElementById('fin-planned-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const accountId = document.getElementById('fin-plan-account').value;
  if (!accountId) {
    alert('Primero agrega al menos una cuenta en "Mis Cuentas".');
    return;
  }

  await sb.from('finance_planned').insert({
    user_id: currentUser.id,
    account_id: accountId,
    category_id: document.getElementById('fin-plan-category').value || null,
    type: document.getElementById('fin-plan-type').value,
    title: document.getElementById('fin-plan-title').value.trim(),
    amount: parseFloat(document.getElementById('fin-plan-amount').value) || 0,
    currency: document.getElementById('fin-plan-currency').value || 'USD',
    frequency: document.getElementById('fin-plan-frequency').value,
    next_date: document.getElementById('fin-plan-date').value
  });

  ZenFX.burst();
  document.getElementById('fin-plan-title').value = '';
  document.getElementById('fin-plan-amount').value = '';
  document.getElementById('fin-planned-form').classList.add('hidden');
  loadFinanceModule();
});

function advanceDateByFrequency(dateStr, freq) {
  const d = new Date(dateStr + 'T12:00:00');
  if (freq === 'quincenal') d.setDate(d.getDate() + 15);
  else if (freq === 'mensual') d.setMonth(d.getMonth() + 1);
  else if (freq === 'trimestral') d.setMonth(d.getMonth() + 3);
  else if (freq === 'semestral') d.setMonth(d.getMonth() + 6);
  else if (freq === 'anual') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

const confirmPlanModal = document.getElementById('confirm-plan-modal');

function updateConfirmPlanConversionPreview() {
  const planId = document.getElementById('confirm-plan-id').value;
  const item = finPlanned.find((p) => p.id === planId);
  const accId = document.getElementById('confirm-plan-account').value;
  const acc = finAccounts.find((a) => a.id === accId);
  const realAmt = parseFloat(document.getElementById('confirm-plan-real-amount').value) || 0;
  const noteEl = document.getElementById('confirm-plan-conversion-note');

  if (!item || !acc) {
    noteEl.textContent = '';
    return;
  }

  if (item.currency !== acc.currency) {
    const converted = convertCurrency(realAmt, item.currency, acc.currency);
    noteEl.textContent = `Conversión automática al tipo de cambio actual: ${item.currency} ${formatMoney(realAmt)} ≈ ${acc.currency} ${formatMoney(converted)} en ${acc.name}.`;
  } else {
    noteEl.textContent = `Se aplicará directamente en ${acc.name} (${acc.currency}).`;
  }
}

window.openConfirmPlannedModal = (planId) => {
  const item = finPlanned.find((p) => p.id === planId);
  if (!item) return;

  document.getElementById('confirm-plan-id').value = item.id;
  document.getElementById('confirm-plan-title').textContent = item.title;
  document.getElementById('confirm-plan-original-info').textContent = `Monto programado: ${item.currency} ${formatMoney(item.amount)} • Puedes ajustar centavos si el cobro varió.`;
  document.getElementById('confirm-plan-currency-label').textContent = item.currency;
  document.getElementById('confirm-plan-real-amount').value = Number(item.amount).toFixed(2);
  document.getElementById('confirm-plan-account').value = item.account_id || (finAccounts[0]?.id || '');
  document.getElementById('confirm-plan-date').value = new Date().toISOString().split('T')[0];

  updateConfirmPlanConversionPreview();
  confirmPlanModal.classList.remove('hidden');
};

document.getElementById('confirm-plan-real-amount').addEventListener('input', updateConfirmPlanConversionPreview);
document.getElementById('confirm-plan-account').addEventListener('change', updateConfirmPlanConversionPreview);
document.getElementById('close-confirm-plan-btn').addEventListener('click', () => confirmPlanModal.classList.add('hidden'));

document.getElementById('confirm-plan-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const planId = document.getElementById('confirm-plan-id').value;
  const item = finPlanned.find((p) => p.id === planId);
  if (!item) return;

  const realAmount = parseFloat(document.getElementById('confirm-plan-real-amount').value);
  if (Number.isNaN(realAmount) || realAmount <= 0) return;

  const targetAccId = document.getElementById('confirm-plan-account').value;
  const txDateStr = document.getElementById('confirm-plan-date').value;
  const acc = finAccounts.find((a) => a.id === targetAccId);

  const amountInAcc = acc
    ? Number(convertCurrency(realAmount, item.currency, acc.currency).toFixed(2))
    : realAmount;

  const descLabel = acc && item.currency !== acc.currency
    ? `${item.title} (${item.currency} ${formatMoney(realAmount)})`
    : item.title;

  await sb.from('finance_transactions').insert({
    user_id: currentUser.id,
    account_id: targetAccId,
    category_id: item.category_id,
    type: item.type,
    amount: realAmount,
    currency: item.currency,
    description: descLabel,
    is_recurring: true,
    tx_date: new Date(txDateStr + 'T12:00:00').toISOString()
  });

  if (acc) {
    const delta = item.type === 'income' ? amountInAcc : -amountInAcc;
    const newBal = Number((Number(acc.balance) + delta).toFixed(2));
    await sb.from('finance_accounts').update({ balance: newBal }).eq('id', acc.id);
  }

  const nextDate = advanceDateByFrequency(item.next_date, item.frequency);
  await sb.from('finance_planned').update({ next_date: nextDate }).eq('id', item.id);

  ZenFX.burst(undefined, undefined, 28, ['#34d399', '#fbbf24', '#38bdf8']);
  confirmPlanModal.classList.add('hidden');
  loadFinanceModule();
});

window.deletePlannedItem = async (planId) => {
  await sb.from('finance_planned').delete().eq('id', planId);
  loadFinanceModule();
};

document.querySelectorAll('#finance-period-filters .nav-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#finance-period-filters .nav-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    finPeriodFilter = btn.dataset.days;
    renderFinanceDashboard();
  });
});

document.getElementById('finance-display-currency').addEventListener('change', renderFinanceDashboard);

document.querySelectorAll('#fin-donut-tabs .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#fin-donut-tabs .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    finDonutMode = btn.dataset.mode;
    renderFinanceDashboard();
  });
});

document.querySelectorAll('#fin-planned-type-filters .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#fin-planned-type-filters .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    finPlannedTypeFilter = btn.dataset.ptype;
    renderFinanceDashboard();
  });
});

document.getElementById('fin-planned-search').addEventListener('input', (e) => {
  finPlannedSearchQuery = e.target.value.trim().toLowerCase();
  renderFinanceDashboard();
});

function renderBalanceTrendChart(currentNetWorth, dispCurr) {
  const svg = document.getElementById('fin-trend-svg');
  if (!svg) return;

  const days = finPeriodFilter === 'ALL' ? 30 : Math.min(Number(finPeriodFilter), 90);
  const now = new Date();
  const points = [];

  const sortedDesc = [...finTransactions].sort((a, b) => new Date(b.tx_date) - new Date(a.tx_date));
  let runningBal = currentNetWorth;
  let txIdx = 0;

  for (let i = 0; i <= days; i++) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0);
    const label = i === 0 ? 'HOY' : `${dayStart.getMonth() + 1}/${dayStart.getDate()}`;
    points.unshift({ label, value: runningBal });

    while (txIdx < sortedDesc.length && new Date(sortedDesc[txIdx].tx_date) >= dayStart) {
      const tx = sortedDesc[txIdx];
      const amt = convertCurrency(Number(tx.amount || 0), tx.currency, dispCurr);
      runningBal += tx.type === 'income' ? -amt : amt;
      txIdx++;
    }
  }

  const values = points.map((p) => p.value);
  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);
  if (minVal === maxVal) {
    minVal = Math.max(0, minVal * 0.9);
    maxVal = maxVal * 1.1 || 100;
  }
  const pad = (maxVal - minVal) * 0.14;
  minVal = Math.max(0, minVal - pad);
  maxVal = maxVal + pad;

  const W = 540;
  const H = 165;
  const padL = 48;
  const padR = 14;
  const padT = 12;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const getX = (idx) => padL + (idx / Math.max(1, points.length - 1)) * plotW;
  const getY = (val) => padT + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;

  let gridHtml = '';
  for (let g = 0; g <= 3; g++) {
    const v = minVal + ((maxVal - minVal) * g) / 3;
    const y = getY(v).toFixed(1);
    const kLabel = v >= 1000 ? `${(v / 1000).toFixed(2)}K` : v.toFixed(0);
    gridHtml += `
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="4 4" />
      <text x="${padL - 6}" y="${Number(y) + 4}" fill="rgba(255,255,255,0.5)" font-size="10" text-anchor="end">${kLabel}</text>
    `;
  }

  let xLabelsHtml = '';
  const step = Math.max(1, Math.floor((points.length - 1) / 5));
  for (let i = 0; i < points.length; i += step) {
    const x = getX(i).toFixed(1);
    xLabelsHtml += `<text x="${x}" y="${H - 5}" fill="rgba(255,255,255,0.55)" font-size="10" text-anchor="middle">${points[i].label}</text>`;
  }
  if ((points.length - 1) % step !== 0) {
    const lastIdx = points.length - 1;
    xLabelsHtml += `<text x="${getX(lastIdx).toFixed(1)}" y="${H - 5}" fill="rgba(255,255,255,0.85)" font-size="10" font-weight="600" text-anchor="middle">HOY</text>`;
  }

  const coords = points.map((p, i) => `${getX(i).toFixed(1)},${getY(p.value).toFixed(1)}`);
  const linePath = `M ${coords.join(' L ')}`;
  const areaPath = `${linePath} L ${getX(points.length - 1).toFixed(1)},${padT + plotH} L ${padL},${padT + plotH} Z`;
  const lastPt = points[points.length - 1];

  svg.innerHTML = `
    <defs>
      <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.45" />
        <stop offset="100%" stop-color="#0ea5e9" stop-opacity="0.02" />
      </linearGradient>
    </defs>
    ${gridHtml}
    ${xLabelsHtml}
    <path d="${areaPath}" fill="url(#trendAreaGrad)" />
    <path d="${linePath}" fill="none" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="${getX(points.length - 1).toFixed(1)}" cy="${getY(lastPt.value).toFixed(1)}" r="4.2" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5" />
  `;
}

function renderExpensesDonut(entries, totalVal, dispCurr) {
  const svg = document.getElementById('fin-donut-svg');
  const legendDiv = document.getElementById('fin-donut-legend');
  document.getElementById('fin-donut-total').textContent = `${dispCurr} ${formatMoney(totalVal)}`;

  const R = 74;
  const C = 2 * Math.PI * R;

  if (!entries.length || totalVal <= 0) {
    svg.innerHTML = `<circle cx="100" cy="100" r="${R}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="24" />`;
    legendDiv.innerHTML = `<p class="muted-text" style="grid-column: 1 / -1; text-align:center;">Sin gastos en este periodo.</p>`;
    return;
  }

  let cumulativePct = 0;
  let circlesHtml = '';
  let legendHtml = '';

  entries.slice(0, 7).forEach(([label, val], idx) => {
    const pct = val / totalVal;
    const strokeLen = pct * C;
    const offset = -cumulativePct * C;
    const color = DONUT_PALETTE[idx % DONUT_PALETTE.length];
    cumulativePct += pct;

    circlesHtml += `
      <circle cx="100" cy="100" r="${R}" fill="none"
        stroke="${color}" stroke-width="25"
        stroke-dasharray="${strokeLen.toFixed(2)} ${C.toFixed(2)}"
        stroke-dashoffset="${offset.toFixed(2)}" />
    `;

    legendHtml += `
      <div class="donut-legend-item">
        <div style="display:flex; align-items:center; gap:0.4rem; overflow:hidden;">
          <span class="donut-swatch" style="background:${color};"></span>
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(label)}</span>
        </div>
        <strong>${Math.round(pct * 100)}%</strong>
      </div>
    `;
  });

  svg.innerHTML = circlesHtml;
  legendDiv.innerHTML = legendHtml;
}

function renderFinanceDashboard() {
  const dispCurr = document.getElementById('finance-display-currency').value || 'HNL';
  const periodLabels = {
    '15': 'ÚLTIMOS 15 DÍAS',
    '30': 'ESTE MES',
    '90': 'ÚLTIMOS 3 MESES',
    '180': 'ÚLTIMOS 6 MESES',
    '365': 'ESTE AÑO',
    'ALL': 'HISTÓRICO TOTAL'
  };
  const activePeriodText = periodLabels[finPeriodFilter] || 'ESTE MES';
  document.getElementById('fin-cashflow-period-label').textContent = activePeriodText;
  document.getElementById('fin-donut-period-label').textContent = activePeriodText;

  const accList = document.getElementById('fin-accounts-list');
  accList.innerHTML = '';
  let totalNetWorth = 0;

  finAccounts.forEach((a) => {
    const bal = Number(a.balance || 0);
    totalNetWorth += convertCurrency(bal, a.currency, dispCurr);

    const li = document.createElement('li');
    li.className = 'list-item hover-glass';

    if (editingAccountId === a.id) {
      li.innerHTML = `
        <div style="flex: 1;">
          <strong>${escapeHtml(a.name)} (${a.currency})</strong>
          <div class="inline-form" style="margin-top: 0.4rem;">
            <input type="number" id="edit-acc-bal-${a.id}" step="0.01" value="${bal.toFixed(2)}" class="hover-glass" />
            <button type="button" class="glass-btn primary hover-glass" onclick="saveAccountBalance('${a.id}')">Guardar</button>
            <button type="button" class="icon-btn hover-glass" onclick="cancelEditAccountBalance()">✕</button>
          </div>
        </div>
      `;
    } else {
      li.innerHTML = `
        <div>
          <strong>${escapeHtml(a.name)}</strong>
          <div class="muted-text">${escapeHtml(a.account_type)} • ${a.currency} ${formatMoney(bal)}</div>
        </div>
        <div class="item-actions">
          <button type="button" class="icon-btn hover-glass" onclick="openEditAccountBalance('${a.id}')" title="Editar saldo">✎</button>
          <button type="button" class="icon-btn hover-glass" onclick="deleteFinAccount('${a.id}')" title="Eliminar cuenta">✕</button>
        </div>
      `;
    }
    accList.appendChild(li);
  });

  ZenFX.animateValue(document.getElementById('fin-kpi-networth'), totalNetWorth, `${dispCurr} `);
  document.getElementById('fin-kpi-accounts-count').textContent = `${finAccounts.length} cuentas`;

  renderBalanceTrendChart(totalNetWorth, dispCurr);

  const now = new Date();
  const daysNum = finPeriodFilter === 'ALL' ? null : Number(finPeriodFilter);
  const cutoff = daysNum ? new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000) : null;
  const prevCutoff = daysNum ? new Date(now.getTime() - daysNum * 2 * 24 * 60 * 60 * 1000) : null;

  const filteredTx = finTransactions.filter((tx) => !cutoff || new Date(tx.tx_date) >= cutoff);
  const prevTx = cutoff
    ? finTransactions.filter((tx) => {
        const d = new Date(tx.tx_date);
        return d >= prevCutoff && d < cutoff;
      })
    : [];

  let totalIncome = 0;
  let totalExpense = 0;
  let prevIncome = 0;

  const catSpendMap = {};
  const recSpendMap = {};

  filteredTx.forEach((tx) => {
    const amtConverted = convertCurrency(Number(tx.amount || 0), tx.currency, dispCurr);
    const catObj = finCategories.find((c) => c.id === tx.category_id);
    const catName = catObj ? catObj.name : (tx.description === 'Ajuste manual' ? 'Ajuste manual' : 'Sin categoría');

    if (tx.type === 'income') {
      totalIncome += amtConverted;
    } else {
      totalExpense += amtConverted;
      catSpendMap[catName] = (catSpendMap[catName] || 0) + amtConverted;
      if (tx.is_recurring) {
        recSpendMap[tx.description] = (recSpendMap[tx.description] || 0) + amtConverted;
      }
    }
  });

  prevTx.forEach((tx) => {
    if (tx.type === 'income') {
      prevIncome += convertCurrency(Number(tx.amount || 0), tx.currency, dispCurr);
    }
  });

  const netFlow = totalIncome - totalExpense;
  const maxBar = Math.max(totalIncome, totalExpense, 1);
  ZenFX.animateValue(
    document.getElementById('fin-cashflow-net'),
    Math.abs(netFlow),
    `${netFlow < 0 ? '-' : ''}${dispCurr} `
  );
  document.getElementById('fin-cashflow-income-val').textContent = `${dispCurr} ${formatMoney(totalIncome)}`;
  document.getElementById('fin-cashflow-expense-val').textContent = `${dispCurr} ${formatMoney(totalExpense)}`;
  document.getElementById('fin-cashflow-income-bar').style.width = `${Math.round((totalIncome / maxBar) * 100)}%`;
  document.getElementById('fin-cashflow-expense-bar').style.width = `${Math.round((totalExpense / maxBar) * 100)}%`;

  const activeDonutMap = finDonutMode === 'recurring' ? recSpendMap : catSpendMap;
  const donutEntries = Object.entries(activeDonutMap).sort((a, b) => b[1] - a[1]);
  const donutTotal = donutEntries.reduce((acc, [, v]) => acc + v, 0);
  renderExpensesDonut(donutEntries, donutTotal, dispCurr);

  let pendingPlannedDelta = 0;
  finPlanned.forEach((p) => {
    const amt = convertCurrency(Number(p.amount || 0), p.currency, dispCurr);
    pendingPlannedDelta += p.type === 'income' ? amt : -amt;
  });
  const projectedNetWorth = totalNetWorth + pendingPlannedDelta;
  ZenFX.animateValue(document.getElementById('fin-perspective-val'), projectedNetWorth, `${dispCurr} `);
  document.getElementById('fin-perspective-sub').textContent = `Impacto de ${finPlanned.length} planificados: ${pendingPlannedDelta >= 0 ? '+' : '-'}${dispCurr} ${formatMoney(Math.abs(pendingPlannedDelta))}`;

  ZenFX.animateValue(document.getElementById('fin-prev-compare-val'), totalIncome, `${dispCurr} `);
  const badgeEl = document.getElementById('fin-prev-compare-badge');
  if (prevIncome > 0) {
    const diffPct = Math.round(((totalIncome - prevIncome) / prevIncome) * 100);
    badgeEl.textContent = `${diffPct >= 0 ? '+' : ''}${diffPct}%`;
    badgeEl.className = `glass-pill ${diffPct >= 0 ? 'high-prob' : 'overdue'}`;
  } else {
    badgeEl.textContent = 'Sin periodo previo';
    badgeEl.className = 'glass-pill';
  }

  const tipEl = document.getElementById('fin-advisor-tip');
  const savingsRate = totalIncome > 0 ? ((netFlow / totalIncome) * 100) : 0;
  if (totalIncome === 0 && totalExpense === 0) {
    tipEl.textContent = 'Registra tus movimientos o aplica tus pagos planificados para ver tu análisis.';
  } else if (netFlow < 0) {
    tipEl.textContent = `Déficit de ${dispCurr} ${formatMoney(Math.abs(netFlow))}. Mayor gasto en "${donutEntries[0]?.[0] || 'varios'}".`;
  } else {
    tipEl.textContent = `Flujo positivo: retienes el ${savingsRate.toFixed(0)}% de tus ingresos en este periodo.`;
  }

  const planList = document.getElementById('fin-planned-list');
  planList.innerHTML = '';

  const filteredPlanned = finPlanned.filter((p) => {
    if (finPlannedTypeFilter !== 'ALL' && p.type !== finPlannedTypeFilter) return false;
    if (finPlannedSearchQuery && !p.title.toLowerCase().includes(finPlannedSearchQuery)) return false;
    return true;
  });

  if (filteredPlanned.length === 0) {
    planList.innerHTML = `<li class="muted-text">No hay pagos planificados que coincidan.</li>`;
  } else {
    const todayMid = new Date();
    todayMid.setHours(0, 0, 0, 0);

    filteredPlanned.forEach((p) => {
      const isInc = p.type === 'income';
      const acc = finAccounts.find((a) => a.id === p.account_id);
      const cat = finCategories.find((c) => c.id === p.category_id);
      const vis = getCategoryVisual(cat?.name || p.title, p.type);

      const dueDate = new Date(p.next_date + 'T00:00:00');
      const diffDays = Math.round((dueDate - todayMid) / (1000 * 60 * 60 * 24));
      const daysLabel = diffDays === 0
        ? 'Hoy'
        : (diffDays > 0 ? `En ${diffDays} días` : `Hace ${Math.abs(diffDays)} días`);

      const equivText = p.currency !== dispCurr
        ? `<div class="muted-text" style="font-size:0.74rem;">≈ ${dispCurr} ${formatMoney(convertCurrency(Number(p.amount), p.currency, dispCurr))}</div>`
        : '';

      const li = document.createElement('li');
      li.className = 'wallet-row hover-glass';
      li.innerHTML = `
        <div class="wallet-row-left">
          <div class="cat-avatar" style="background:${vis.color};">${vis.icon}</div>
          <div class="wallet-row-info">
            <div class="wallet-row-title">${escapeHtml(p.title)}</div>
            <div class="muted-text">${escapeHtml(cat?.name || 'Suscripción')}</div>
            <div class="muted-text" style="font-size:0.76rem;">${escapeHtml(acc?.name || 'Cuenta')} • ${p.frequency}</div>
          </div>
        </div>
        <div class="wallet-row-right">
          <span class="${isInc ? 'amt-income' : 'amt-expense'}">${isInc ? '' : '-'}${p.currency} ${formatMoney(p.amount)}</span>
          ${equivText}
          <span class="muted-text" style="font-size:0.76rem;">${daysLabel}</span>
          <div class="item-actions">
            <button type="button" class="glass-pill planned-badge" onclick="openConfirmPlannedModal('${p.id}')" title="Confirmar monto real y aplicar">Planificado</button>
            <button type="button" class="icon-btn hover-glass" onclick="deletePlannedItem('${p.id}')" style="padding:0.15rem 0.4rem;">✕</button>
          </div>
        </div>
      `;
      planList.appendChild(li);
    });
  }

  const histList = document.getElementById('fin-transactions-list');
  histList.innerHTML = '';
  document.getElementById('fin-history-count').textContent = `${filteredTx.length}`;

  if (filteredTx.length === 0) {
    histList.innerHTML = `<li class="muted-text">No hay movimientos en este periodo.</li>`;
  } else {
    filteredTx.forEach((tx) => {
      const isInc = tx.type === 'income';
      const acc = finAccounts.find((a) => a.id === tx.account_id);
      const cat = finCategories.find((c) => c.id === tx.category_id);
      const catLabel = cat?.name || (tx.description === 'Ajuste manual' ? 'Ajuste manual' : 'General');
      const vis = getCategoryVisual(catLabel, tx.type);

      const dObj = new Date(tx.tx_date);
      const datePretty = dObj.toLocaleDateString('es-HN', { day: 'numeric', month: 'long' });

      const li = document.createElement('li');
      li.className = 'wallet-row hover-glass';
      li.innerHTML = `
        <div class="wallet-row-left">
          <div class="cat-avatar" style="background:${vis.color};">
            ${vis.icon}
            <span class="cat-check-badge">✓</span>
          </div>
          <div class="wallet-row-info">
            <div class="wallet-row-title">${escapeHtml(tx.description)}</div>
            <div class="muted-text">${escapeHtml(acc?.name || 'Cuenta')} • ${escapeHtml(catLabel)}</div>
          </div>
        </div>
        <div class="wallet-row-right">
          <span class="${isInc ? 'amt-income' : 'amt-expense'}">${isInc ? '' : '-'}${tx.currency} ${formatMoney(tx.amount)}</span>
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <span class="muted-text" style="font-size:0.76rem;">${datePretty}</span>
            <button type="button" class="icon-btn hover-glass" onclick="deleteFinTransaction('${tx.id}')" style="padding:0.12rem 0.38rem;">✕</button>
          </div>
        </div>
      `;
      histList.appendChild(li);
    });
  }
}

// ==========================================
// 11. PARLEYS & MERCADOS DETALLADOS (CON FILTROS DE LIGA Y FECHA)
// ==========================================
function toLocalYMD(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function matchesDateFilter(isoDateStr) {
  if (!isoDateStr || selectedDateFilter === 'ALL') return true;
  const matchDt = new Date(isoDateStr);
  if (Number.isNaN(matchDt.getTime())) return true;

  const matchYMD = toLocalYMD(matchDt);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  if (selectedDateFilter === 'TODAY') {
    return matchYMD === toLocalYMD(todayStart);
  }
  if (selectedDateFilter === 'TOMORROW') {
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return matchYMD === toLocalYMD(tomorrow);
  }
  if (selectedDateFilter === 'WEEK') {
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);
    return matchDt >= todayStart && matchDt <= weekEnd;
  }
  if (selectedDateFilter === 'CUSTOM' && selectedCustomDate) {
    return matchYMD === selectedCustomDate;
  }
  return true;
}

async function loadParleysModule() {
  try {
    const res = await fetch(`./data/parleys.json?v=${Date.now()}`);
    parleysData = await res.json();

    const updateLabel = document.getElementById('parleys-last-update');
    if (parleysData.updated_at) {
      const dt = new Date(parleysData.updated_at).toLocaleString('es-HN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      updateLabel.textContent = `Última sincronización: ${dt} • ${parleysData.total_matches} partidos analizados`;
    } else {
      updateLabel.textContent = 'Ejecuta el Workflow en GitHub Actions para generar los pronósticos.';
    }

    renderAutoParleys();
    renderMatchesList();
    renderSlip();
  } catch {
    document.getElementById('parleys-last-update').textContent = 'No se pudo cargar data/parleys.json';
  }
}

function renderAutoParleys() {
  const grid = document.getElementById('auto-parleys-grid');
  grid.innerHTML = '';

  const allParleys = parleysData.parleys || [];
  if (allParleys.length === 0) {
    grid.innerHTML = `
      <div class="list-item">
        <div>
          <strong>Sin partidos próximos en estas ligas</strong>
          <div class="muted-text">Ejecuta el Workflow en GitHub Actions para sincronizar la próxima jornada.</div>
        </div>
      </div>
    `;
    return;
  }

  const matchesById = new Map((parleysData.matches || []).map((m) => [m.id, m]));
  const visibleParleys = allParleys.filter((p) => {
    if (selectedLeagueFilter === 'ALL' && selectedDateFilter === 'ALL') return true;
    return (p.legs || []).some((leg) => {
      const leagueOk = selectedLeagueFilter === 'ALL' || leg.league === selectedLeagueFilter;
      const fullMatch = matchesById.get(leg.id);
      const dateVal = leg.date || fullMatch?.date;
      const dateOk = matchesDateFilter(dateVal);
      return leagueOk && dateOk;
    });
  });

  if (visibleParleys.length === 0) {
    grid.innerHTML = `
      <div class="list-item">
        <div>
          <strong>Sin parleys sugeridos para este filtro</strong>
          <div class="muted-text">Prueba seleccionando "Todas" o arma tu propio boleto abajo.</div>
        </div>
      </div>
    `;
    return;
  }

  visibleParleys.forEach((p) => {
    const originalIdx = allParleys.indexOf(p);
    const card = document.createElement('div');
    card.className = 'glass-card widget-card nested-glass-card hover-glass';

    const legsHtml = p.legs.map((leg) => `
      <div class="parley-leg-item">
        <div>
          <strong>${escapeHtml(leg.pick)}</strong>
          <div class="muted-text">${escapeHtml(leg.home)} vs ${escapeHtml(leg.away)} (${escapeHtml(leg.league)})</div>
        </div>
        <span class="prob-odd-badge">
          <span class="prob-val-high">${leg.probability}%</span>
          <span class="muted-text">•</span>
          <span class="odd-val">${leg.odd}x</span>
        </span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="widget-header">
        <span class="glass-pill high-prob">${escapeHtml(p.tag)}</span>
        <span class="prob-odd-badge">
          <span class="prob-val-high">Prob: ${p.combined_probability}%</span>
          <span class="muted-text">•</span>
          <span class="odd-val">${p.combined_odd}x</span>
        </span>
      </div>
      <h3>${escapeHtml(p.title)}</h3>
      <p class="muted-text">${escapeHtml(p.description)}</p>
      <div style="display:flex; flex-direction:column; gap:0.5rem;">${legsHtml}</div>
      <button class="glass-btn primary hover-glass" onclick="loadParleyToSlip(${originalIdx})">Cargar al Boleto</button>
    `;
    grid.appendChild(card);
  });
}

function renderMatchesList() {
  const grid = document.getElementById('matches-list-grid');
  grid.innerHTML = '';

  const filtered = (parleysData.matches || []).filter((m) => {
    const leagueOk = selectedLeagueFilter === 'ALL' || m.league === selectedLeagueFilter;
    const dateOk = matchesDateFilter(m.date);
    return leagueOk && dateOk;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="list-item"><p class="muted-text">No hay partidos próximos para esta liga y fecha seleccionada.</p></div>`;
    return;
  }

  filtered.forEach((m) => {
    const matchDate = new Date(m.date).toLocaleString('es-HN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    const activeTab = activeMatchTabs[m.id] || 'result';
    const markets = m.markets || {
      result: [{ key: 'TOP', label: m.pick, probability: m.probability, odd: m.odd }],
      goals: [],
      corners: [],
      cards: []
    };
    const currentOptions = markets[activeTab] || [];
    const selectedLegForMatch = customSlipLegs.find((item) => item.id === m.id);

    const optionsHtml = currentOptions.map((opt) => {
      const isOptSelected = selectedLegForMatch && selectedLegForMatch.pick === opt.label;
      const probClass = opt.probability >= 65
        ? 'prob-val-high'
        : (opt.probability >= 40 ? 'prob-val-mid' : 'prob-val-low');
      return `
        <button type="button" class="market-opt-btn hover-glass ${isOptSelected ? 'selected' : ''}"
          onclick="selectMatchMarket('${m.id}', '${activeTab}', '${opt.key}')">
          <span>${escapeHtml(opt.label)}</span>
          <span class="prob-odd-badge">
            <span class="${probClass}">${opt.probability}%</span>
            <span class="muted-text">•</span>
            <span class="odd-val">${opt.odd}x</span>
          </span>
        </button>
      `;
    }).join('');

    const card = document.createElement('div');
    card.className = 'glass-card match-card hover-glass';
    card.innerHTML = `
      <div class="widget-header">
        <span class="glass-pill">${escapeHtml(m.league)}</span>
        <span class="muted-text">${matchDate}</span>
      </div>

      <div>
        <strong>${escapeHtml(m.home)} vs ${escapeHtml(m.away)}</strong>
        <div>
          <span class="top-pick-banner">Top pick: ${escapeHtml(m.pick)} (${m.probability}%)</span>
        </div>
      </div>

      <div class="market-tabs">
        <button type="button" class="market-tab-btn ${activeTab === 'result' ? 'active' : ''}" onclick="switchMatchMarketTab('${m.id}', 'result')">1X2</button>
        <button type="button" class="market-tab-btn ${activeTab === 'goals' ? 'active' : ''}" onclick="switchMatchMarketTab('${m.id}', 'goals')">Goles</button>
        <button type="button" class="market-tab-btn ${activeTab === 'corners' ? 'active' : ''}" onclick="switchMatchMarketTab('${m.id}', 'corners')">Córners</button>
        <button type="button" class="market-tab-btn ${activeTab === 'cards' ? 'active' : ''}" onclick="switchMatchMarketTab('${m.id}', 'cards')">Tarjetas</button>
      </div>

      <div class="market-options-list">${optionsHtml}</div>
    `;
    grid.appendChild(card);
  });
}

window.switchMatchMarketTab = (matchId, tabName) => {
  activeMatchTabs[matchId] = tabName;
  renderMatchesList();
};

window.selectMatchMarket = (matchId, category, optKey) => {
  const matchObj = (parleysData.matches || []).find((m) => m.id === matchId);
  if (!matchObj) return;

  const optionsList = matchObj.markets?.[category] || [];
  const chosenOpt = optionsList.find((o) => o.key === optKey) || {
    label: matchObj.pick,
    probability: matchObj.probability,
    odd: matchObj.odd
  };

  const existingIdx = customSlipLegs.findIndex((item) => item.id === matchId);
  if (existingIdx !== -1 && customSlipLegs[existingIdx].pick === chosenOpt.label) {
    customSlipLegs.splice(existingIdx, 1);
  } else {
    const legData = {
      id: matchObj.id,
      league: matchObj.league,
      home: matchObj.home,
      away: matchObj.away,
      pick: chosenOpt.label,
      probability: chosenOpt.probability,
      odd: chosenOpt.odd
    };
    if (existingIdx !== -1) customSlipLegs[existingIdx] = legData;
    else customSlipLegs.push(legData);
    ZenFX.burst(undefined, undefined, 14);
  }

  renderMatchesList();
  renderSlip();
};

window.loadParleyToSlip = (parleyIndex) => {
  const chosen = parleysData.parleys[parleyIndex];
  if (!chosen) return;
  customSlipLegs = [...chosen.legs];
  ZenFX.burst(undefined, undefined, 26);
  renderMatchesList();
  renderSlip();
};

window.removeSlipLeg = (matchId) => {
  customSlipLegs = customSlipLegs.filter((item) => item.id !== matchId);
  renderMatchesList();
  renderSlip();
};

function renderSlip() {
  const list = document.getElementById('slip-legs-list');
  list.innerHTML = '';

  const currency = document.getElementById('slip-currency').value || 'HNL';

  if (customSlipLegs.length === 0) {
    list.innerHTML = `<li class="muted-text">Tu boleto está vacío.</li>`;
    document.getElementById('slip-prob').textContent = '0%';
    document.getElementById('slip-odd').textContent = '1.00x';
    document.getElementById('slip-payout').textContent = `0.00 ${currency}`;
    return;
  }

  let totalProb = 1;
  let totalOdd = 1;

  customSlipLegs.forEach((leg) => {
    totalProb *= leg.probability / 100;
    totalOdd *= leg.odd;

    const li = document.createElement('li');
    li.className = 'list-item hover-glass';
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(leg.pick)}</strong>
        <div class="muted-text">${escapeHtml(leg.home)} vs ${escapeHtml(leg.away)} (${leg.odd}x)</div>
      </div>
      <button class="icon-btn hover-glass" onclick="removeSlipLeg('${leg.id}')">✕</button>
    `;
    list.appendChild(li);
  });

  const stake = parseFloat(document.getElementById('slip-stake').value) || 0;
  const payout = stake * totalOdd;

  document.getElementById('slip-prob').textContent = `${(totalProb * 100).toFixed(1)}%`;
  document.getElementById('slip-odd').textContent = `${totalOdd.toFixed(2)}x`;
  document.getElementById('slip-payout').textContent = `${formatMoney(payout)} ${currency}`;
}

document.getElementById('clear-slip-btn').addEventListener('click', () => {
  customSlipLegs = [];
  renderMatchesList();
  renderSlip();
});

document.getElementById('slip-stake').addEventListener('input', renderSlip);
document.getElementById('slip-currency').addEventListener('change', renderSlip);
document.getElementById('refresh-parleys-btn').addEventListener('click', () => {
  ZenFX.burst();
  loadParleysModule();
});

document.querySelectorAll('#league-filters .nav-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#league-filters .nav-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedLeagueFilter = btn.dataset.league;
    renderAutoParleys();
    renderMatchesList();
  });
});

document.querySelectorAll('#date-filters .nav-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#date-filters .nav-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDateFilter = btn.dataset.dateFilter || 'ALL';
    selectedCustomDate = '';

    const customDateInp = document.getElementById('parley-custom-date');
    const clearDateBtn = document.getElementById('clear-parley-date-btn');
    if (customDateInp) customDateInp.value = '';
    if (clearDateBtn) clearDateBtn.classList.add('hidden');

    renderAutoParleys();
    renderMatchesList();
  });
});

document.getElementById('parley-custom-date')?.addEventListener('change', (e) => {
  const val = e.target.value;
  const clearDateBtn = document.getElementById('clear-parley-date-btn');

  if (!val) {
    selectedDateFilter = 'ALL';
    selectedCustomDate = '';
    document.querySelector('#date-filters .nav-pill[data-date-filter="ALL"]')?.classList.add('active');
    clearDateBtn?.classList.add('hidden');
  } else {
    document.querySelectorAll('#date-filters .nav-pill').forEach((b) => b.classList.remove('active'));
    selectedDateFilter = 'CUSTOM';
    selectedCustomDate = val;
    clearDateBtn?.classList.remove('hidden');
  }

  renderAutoParleys();
  renderMatchesList();
});

document.getElementById('clear-parley-date-btn')?.addEventListener('click', () => {
  const customDateInp = document.getElementById('parley-custom-date');
  const clearDateBtn = document.getElementById('clear-parley-date-btn');
  if (customDateInp) customDateInp.value = '';
  clearDateBtn?.classList.add('hidden');

  selectedCustomDate = '';
  selectedDateFilter = 'ALL';
  document.querySelectorAll('#date-filters .nav-pill').forEach((b) => {
    b.classList.toggle('active', b.dataset.dateFilter === 'ALL');
  });

  renderAutoParleys();
  renderMatchesList();
});

// ==========================================
// 12. NAVEGACIÓN MODULAR CON TRANSICIONES CINEMÁTICAS
// ==========================================
const MODULES = ['dashboard-module', 'life-module', 'finance-module', 'parleys-module'];

document.querySelectorAll('.module-nav .nav-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    const nextModuleId = btn.dataset.target;
    const isSame = nextModuleId === activeModuleId;

    document.querySelectorAll('.module-nav .nav-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    activeModuleId = nextModuleId;
    MODULES.forEach((modId) => {
      document.getElementById(modId).classList.toggle('hidden', modId !== activeModuleId);
    });

    const rect = btn.getBoundingClientRect();
    ZenFX.setModuleTheme(activeModuleId);
    ZenFX.positionNavGlider(true);
    ZenFX.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, isSame ? 10 : 20);

    if (!isSame) {
      ZenFX.triggerModuleSweep();
      ZenFX.cascadeModuleWidgets(document.getElementById(activeModuleId));
    }

    updateHiddenCounterBadge();
  });
});