// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE (ZEN DECK)
// ==========================================
const SUPABASE_URL = 'https://lxrdrqjjuzpxtysakpvb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DXx0j5HaveKep0XHgjor_A_Kmrp9ll6';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isRegisterMode = false;
let currentUser = null;
let userPrefs = {
  weather_city: 'San Pedro Sula, HN',
  weather_lat: 15.5042,
  weather_lon: -88.0250,
  currency_from: 'USD',
  currency_to: 'HNL',
  widget_sizes: {},
  google_client_id: ''
};

let currentRatesMap = {};
let usdRatesMap = { USD: 1, HNL: 26.95, EUR: 0.92, MXN: 20.15 };
let parleysData = { parleys: [], matches: [], updated_at: null };
let selectedLeagueFilter = 'ALL';
let activeMatchTabs = {};
let customSlipLegs = [];
let activeTimers = {};

// Estado Panel de Vida (Google)
let googleAccessToken = null;

// Estado Asesor Financiero
let finAccounts = [];
let finCategories = [];
let finTransactions = [];
let finPlanned = [];
let finPeriodFilter = '30';

const SIZE_CYCLE = ['1x1', '2x1', '1x2', '2x2'];

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

// ==========================================
// 2. AUTENTICACIÓN
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
const authError = document.getElementById('auth-error');

authToggleBtn.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  authError.classList.add('hidden');
  nameFieldGroup.classList.toggle('hidden', !isRegisterMode);
  document.getElementById('full-name').required = isRegisterMode;

  authTitle.textContent = isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesión';
  authSubtitle.textContent = isRegisterMode
    ? 'Regístrate con tu nombre (máximo 5 usuarios permitidos)'
    : 'Ingresa a tu espacio personal sincronizado';
  authSubmitBtn.textContent = isRegisterMode ? 'Registrarme' : 'Entrar al Panel';
  authToggleText.textContent = isRegisterMode ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?';
  authToggleBtn.textContent = isRegisterMode ? 'Inicia sesión' : 'Regístrate aquí';
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const fullName = document.getElementById('full-name').value.trim();

  try {
    if (isRegisterMode) {
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

document.getElementById('logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
});

sb.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    currentUser = session.user;
    authView.classList.add('hidden');
    appView.classList.remove('hidden');
    initDashboard();
  } else {
    currentUser = null;
    appView.classList.add('hidden');
    authView.classList.remove('hidden');
  }
});

// ==========================================
// 3. INICIALIZACIÓN Y PREFERENCIAS DE USUARIO
// ==========================================
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

  if (profile) {
    userPrefs = {
      weather_city: profile.weather_city || 'San Pedro Sula, HN',
      weather_lat: profile.weather_lat ?? 15.5042,
      weather_lon: profile.weather_lon ?? -88.0250,
      currency_from: profile.currency_from || 'USD',
      currency_to: profile.currency_to || 'HNL',
      widget_sizes: profile.widget_sizes || {},
      google_client_id: profile.google_client_id || ''
    };
  }

  document.getElementById('google-client-id-input').value = userPrefs.google_client_id;

  applyBuiltInWidgetSizes();
  initCurrencySelectors();

  await loadBaseUsdRates();
  loadWeather();
  loadExchangeRates();
  loadQuickLinks();
  loadTodos();
  loadReminders();
  loadCustomWidgets();
  loadFinanceModule();
  loadParleysModule();
}

async function saveProfilePrefs(partial) {
  userPrefs = { ...userPrefs, ...partial };
  await sb.from('profiles').update(partial).eq('id', currentUser.id);
}

function applyBuiltInWidgetSizes() {
  document.querySelectorAll('[data-widget-key]').forEach((card) => {
    const key = card.dataset.widgetKey;
    const sz = userPrefs.widget_sizes?.[key] || '1x1';
    card.classList.remove('size-2x1', 'size-1x2', 'size-2x2');
    if (sz !== '1x1') card.classList.add(`size-${sz}`);
  });
}

document.querySelectorAll('.resize-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const key = btn.dataset.resize;
    const currentSz = userPrefs.widget_sizes?.[key] || '1x1';
    const nextSz = SIZE_CYCLE[(SIZE_CYCLE.indexOf(currentSz) + 1) % SIZE_CYCLE.length];
    const updatedSizes = { ...(userPrefs.widget_sizes || {}), [key]: nextSz };
    await saveProfilePrefs({ widget_sizes: updatedSizes });
    applyBuiltInWidgetSizes();
  });
});

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
    // Usa valores de respaldo si falla la red
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
  document.getElementById('currency-output').textContent = `${converted.toFixed(2)} ${toCode}`;
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
  input.value = '';
  loadTodos();
});

window.toggleTodo = async (id, completed) => {
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
  const dashboard = document.getElementById('dashboard-module');

  (widgets || []).forEach((w) => {
    const card = document.createElement('article');
    const sz = w.size || '1x1';
    card.className = `glass-card widget-card hover-glass dynamic-custom-widget ${sz !== '1x1' ? 'size-' + sz : ''}`;

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
        <span class="glass-pill">${escapeHtml(w.tag)} • ${sz}</span>
        <div class="header-controls">
          <button class="icon-btn hover-glass" onclick="cycleCustomWidgetSize('${w.id}', '${sz}')" title="Cambiar tamaño">⤢</button>
          <button class="icon-btn hover-glass" onclick="deleteCustomWidget('${w.id}')" title="Eliminar">✕</button>
        </div>
      </div>
      <h3>${escapeHtml(w.title)}</h3>
      ${bodyHtml}
    `;
    dashboard.appendChild(card);
  });
}

document.getElementById('custom-widget-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const type = document.getElementById('widget-type').value;
  const size = document.getElementById('widget-size').value;
  const title = document.getElementById('widget-title').value.trim();
  const tag = document.getElementById('widget-tag').value.trim() || 'Personal';
  const rawContent = document.getElementById('widget-content').value.trim();

  let widgetData = {};
  if (type === 'checklist') {
    const items = rawContent
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text, done: false }));
    widgetData = { items };
  } else if (type === 'counter') {
    widgetData = {
      value: Number(document.getElementById('widget-counter-start').value) || 0,
      goal: Number(document.getElementById('widget-counter-goal').value) || 10
    };
  } else if (type === 'timer') {
    widgetData = {
      minutes: Number(document.getElementById('widget-timer-minutes').value) || 25
    };
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

  e.target.reset();
  widgetTypeSelect.dispatchEvent(new Event('change'));
  widgetModal.classList.add('hidden');
  loadCustomWidgets();
});

window.cycleCustomWidgetSize = async (id, currentSz) => {
  const nextSz = SIZE_CYCLE[(SIZE_CYCLE.indexOf(currentSz) + 1) % SIZE_CYCLE.length];
  await sb.from('custom_widgets').update({ size: nextSz }).eq('id', id);
  loadCustomWidgets();
};

window.deleteCustomWidget = async (id) => {
  pauseWidgetTimer(id);
  await sb.from('custom_widgets').delete().eq('id', id);
  loadCustomWidgets();
};

window.toggleCustomCheckItem = async (widgetId, itemIdx) => {
  const { data } = await sb.from('custom_widgets').select('widget_data').eq('id', widgetId).single();
  const items = data?.widget_data?.items || [];
  if (items[itemIdx]) items[itemIdx].done = !items[itemIdx].done;
  await sb.from('custom_widgets').update({ widget_data: { items } }).eq('id', widgetId);
  loadCustomWidgets();
};

window.addCustomCheckItem = async (widgetId) => {
  const inp = document.getElementById(`chk-input-${widgetId}`);
  const text = inp?.value.trim();
  if (!text) return;
  const { data } = await sb.from('custom_widgets').select('widget_data').eq('id', widgetId).single();
  const items = data?.widget_data?.items || [];
  items.push({ text, done: false });
  await sb.from('custom_widgets').update({ widget_data: { items } }).eq('id', widgetId);
  loadCustomWidgets();
};

window.updateCustomCounter = async (widgetId, delta) => {
  const { data } = await sb.from('custom_widgets').select('widget_data').eq('id', widgetId).single();
  const wData = data?.widget_data || { value: 0, goal: 10 };
  wData.value = Math.max(0, Number(wData.value || 0) + delta);
  await sb.from('custom_widgets').update({ widget_data: wData }).eq('id', widgetId);
  loadCustomWidgets();
};

window.startWidgetTimer = (id, defaultMins) => {
  if (activeTimers[id]?.interval) return;
  if (!activeTimers[id]) activeTimers[id] = { remaining: defaultMins * 60 };
  activeTimers[id].interval = setInterval(() => {
    if (activeTimers[id].remaining <= 0) {
      pauseWidgetTimer(id);
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
// 9. PANEL DE VIDA (GMAIL + GOOGLE CALENDAR)
// ==========================================
document.getElementById('toggle-google-config-btn').addEventListener('click', () => {
  document.getElementById('google-config-panel').classList.toggle('hidden');
});

document.getElementById('close-google-config-btn').addEventListener('click', () => {
  document.getElementById('google-config-panel').classList.add('hidden');
});

document.getElementById('google-client-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const clientId = document.getElementById('google-client-id-input').value.trim();
  await saveProfilePrefs({ google_client_id: clientId });
  document.getElementById('google-config-panel').classList.add('hidden');
  connectGoogleServices();
});

document.getElementById('connect-google-btn').addEventListener('click', connectGoogleServices);
document.getElementById('sync-google-btn').addEventListener('click', () => {
  if (googleAccessToken) {
    fetchGmailLatest5();
    fetchCalendarUpcoming();
  } else {
    connectGoogleServices();
  }
});

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
        document.getElementById('sync-google-btn').classList.remove('hidden');

        fetchGmailLatest5();
        fetchCalendarUpcoming();
      }
    }
  });

  tokenClient.requestAccessToken({ prompt: 'consent' });
}

async function fetchGmailLatest5() {
  const list = document.getElementById('gmail-list');
  list.innerHTML = `<li class="muted-text">Cargando últimos 5 correos...</li>`;

  try {
    const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
      headers: { Authorization: `Bearer ${googleAccessToken}` }
    });
    const listData = await listRes.json();
    const msgs = listData.messages || [];

    if (msgs.length === 0) {
      list.innerHTML = `<li class="muted-text">No se encontraron correos recientes.</li>`;
      return;
    }

    const details = await Promise.all(
      msgs.map((m) =>
        fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, {
          headers: { Authorization: `Bearer ${googleAccessToken}` }
        }).then((r) => r.json())
      )
    );

    list.innerHTML = '';
    details.forEach((msg) => {
      const headers = msg.payload?.headers || [];
      const getH = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      const subject = getH('Subject') || '(Sin asunto)';
      const rawFrom = getH('From') || 'Remitente desconocido';
      const senderName = rawFrom.replace(/<[^>]+>/g, '').replace(/"/g, '').trim();
      const isUnread = (msg.labelIds || []).includes('UNREAD');

      const li = document.createElement('li');
      li.className = 'list-item hover-glass';
      li.style.cursor = 'pointer';
      li.onclick = () => window.open(`https://mail.google.com/mail/u/0/#inbox/${msg.id}`, '_blank', 'noopener,noreferrer');
      li.innerHTML = `
        <div style="overflow:hidden; flex:1;">
          <div style="display:flex; align-items:center; gap:0.45rem;">
            <strong style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(subject)}</strong>
            ${isUnread ? '<span class="glass-pill high-prob">Nuevo</span>' : ''}
          </div>
          <div class="muted-text">${escapeHtml(senderName)}</div>
          <div class="muted-text" style="font-size:0.78rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(msg.snippet || '')}</div>
        </div>
        <span class="icon-btn">↗</span>
      `;
      list.appendChild(li);
    });
  } catch {
    list.innerHTML = `<li class="muted-text">Error al consultar Gmail. Verifica los permisos del Client ID.</li>`;
  }
}

async function fetchCalendarUpcoming() {
  const list = document.getElementById('calendar-events-list');
  list.innerHTML = `<li class="muted-text">Consultando calendario...</li>`;

  try {
    const nowIso = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(nowIso)}&maxResults=8&singleEvents=true&orderBy=startTime`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${googleAccessToken}` }
    });
    const data = await res.json();
    const events = data.items || [];

    document.getElementById('calendar-count-pill').textContent = `${events.length} próximos`;

    if (events.length === 0) {
      list.innerHTML = `<li class="muted-text">No tienes eventos próximos en tu calendario.</li>`;
      return;
    }

    list.innerHTML = '';
    events.forEach((ev) => {
      const startRaw = ev.start?.dateTime || ev.start?.date;
      const startDate = new Date(startRaw);
      const isAllDay = Boolean(ev.start?.date && !ev.start?.dateTime);

      const formattedTime = isAllDay
        ? startDate.toLocaleDateString('es-HN', { weekday: 'short', day: 'numeric', month: 'short' }) + ' • Todo el día'
        : startDate.toLocaleString('es-HN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

      const li = document.createElement('li');
      li.className = 'list-item hover-glass';
      li.innerHTML = `
        <div style="flex:1; overflow:hidden;">
          <strong>${escapeHtml(ev.summary || 'Evento sin título')}</strong>
          <div class="muted-text">${formattedTime}</div>
          ${ev.location ? `<div class="muted-text" style="font-size:0.78rem;">📍 ${escapeHtml(ev.location)}</div>` : ''}
        </div>
        ${ev.htmlLink ? `<a href="${escapeHtml(ev.htmlLink)}" target="_blank" rel="noopener noreferrer" class="icon-btn" style="text-decoration:none;">↗</a>` : ''}
      `;
      list.appendChild(li);
    });
  } catch {
    list.innerHTML = `<li class="muted-text">Error al cargar Google Calendar.</li>`;
  }
}

// ==========================================
// 10. ASESOR FINANCIERO PERSONAL
// ==========================================
async function loadFinanceModule() {
  const [accRes, catRes, txRes, planRes] = await Promise.all([
    sb.from('finance_accounts').select('*').order('created_at', { ascending: true }),
    sb.from('finance_categories').select('*').order('name', { ascending: true }),
    sb.from('finance_transactions').select('*').order('tx_date', { ascending: false }),
    sb.from('finance_planned').select('*').order('next_date', { ascending: true })
  ]);

  finAccounts = accRes.data || [];
  finCategories = catRes.data || [];
  finTransactions = txRes.data || [];
  finPlanned = planRes.data || [];

  // Crear categorías base si el usuario aún no tiene ninguna
  if (finCategories.length === 0) {
    const defaults = [
      { user_id: currentUser.id, name: 'Alimentación y Súper', type: 'expense', color: '#38bdf8' },
      { user_id: currentUser.id, name: 'Transporte y Combustible', type: 'expense', color: '#818cf8' },
      { user_id: currentUser.id, name: 'Servicios e Internet', type: 'expense', color: '#f472b6' },
      { user_id: currentUser.id, name: 'Suscripciones y Ocio', type: 'expense', color: '#fb7185' },
      { user_id: currentUser.id, name: 'Salario / Nómina', type: 'income', color: '#34d399' },
      { user_id: currentUser.id, name: 'Proyectos / Extras', type: 'income', color: '#2dd4bf' }
    ];
    const { data: inserted } = await sb.from('finance_categories').insert(defaults).select();
    finCategories = inserted || [];
  }

  populateFinanceSelectors();
  renderFinanceDashboard();
}

function populateFinanceSelectors() {
  const accOptions = finAccounts.length > 0
    ? finAccounts.map((a) => `<option value="${a.id}">${escapeHtml(a.name)} (${a.currency})</option>`).join('')
    : `<option value="">Crea una cuenta primero</option>`;

  document.getElementById('fin-tx-account').innerHTML = accOptions;
  document.getElementById('fin-plan-account').innerHTML = accOptions;

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

document.getElementById('fin-tx-type').addEventListener('change', () => updateCategorySelectByType('fin-tx-type', 'fin-tx-category'));
document.getElementById('fin-plan-type').addEventListener('change', () => updateCategorySelectByType('fin-plan-type', 'fin-plan-category'));

document.getElementById('toggle-new-cat-btn').addEventListener('click', () => {
  document.getElementById('fin-category-form').classList.toggle('hidden');
});

document.getElementById('fin-category-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('fin-cat-name').value.trim();
  const type = document.getElementById('fin-cat-type').value;
  if (!name) return;

  await sb.from('finance_categories').insert({ user_id: currentUser.id, name, type });
  document.getElementById('fin-cat-name').value = '';
  document.getElementById('fin-category-form').classList.add('hidden');
  loadFinanceModule();
});

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

  e.target.reset();
  loadFinanceModule();
});

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
    const newBal = Number(acc.balance) + delta;
    await sb.from('finance_accounts').update({ balance: newBal }).eq('id', acc.id);
  }

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
      const revertDelta = tx.type === 'income' ? -Number(tx.amount) : Number(tx.amount);
      await sb.from('finance_accounts').update({ balance: Number(acc.balance) + revertDelta }).eq('id', acc.id);
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

  const acc = finAccounts.find((a) => a.id === accountId);
  await sb.from('finance_planned').insert({
    user_id: currentUser.id,
    account_id: accountId,
    category_id: document.getElementById('fin-plan-category').value || null,
    type: document.getElementById('fin-plan-type').value,
    title: document.getElementById('fin-plan-title').value.trim(),
    amount: parseFloat(document.getElementById('fin-plan-amount').value) || 0,
    currency: acc?.currency || 'HNL',
    frequency: document.getElementById('fin-plan-frequency').value,
    next_date: document.getElementById('fin-plan-date').value
  });

  document.getElementById('fin-plan-title').value = '';
  document.getElementById('fin-plan-amount').value = '';
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

window.executePlannedItem = async (planId) => {
  const item = finPlanned.find((p) => p.id === planId);
  if (!item) return;

  await sb.from('finance_transactions').insert({
    user_id: currentUser.id,
    account_id: item.account_id,
    category_id: item.category_id,
    type: item.type,
    amount: item.amount,
    currency: item.currency,
    description: `${item.title} (${item.frequency})`,
    is_recurring: true,
    tx_date: new Date().toISOString()
  });

  const acc = finAccounts.find((a) => a.id === item.account_id);
  if (acc) {
    const delta = item.type === 'income' ? Number(item.amount) : -Number(item.amount);
    await sb.from('finance_accounts').update({ balance: Number(acc.balance) + delta }).eq('id', acc.id);
  }

  const nextDate = advanceDateByFrequency(item.next_date, item.frequency);
  await sb.from('finance_planned').update({ next_date: nextDate }).eq('id', item.id);
  loadFinanceModule();
};

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

function renderFinanceDashboard() {
  const dispCurr = document.getElementById('finance-display-currency').value || 'HNL';

  // 1. Renderizar Cuentas y Patrimonio Total
  const accList = document.getElementById('fin-accounts-list');
  accList.innerHTML = '';
  let totalNetWorth = 0;

  finAccounts.forEach((a) => {
    const bal = Number(a.balance || 0);
    totalNetWorth += convertCurrency(bal, a.currency, dispCurr);

    const li = document.createElement('li');
    li.className = 'list-item hover-glass';
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(a.name)}</strong>
        <div class="muted-text">${escapeHtml(a.account_type)} • ${bal.toFixed(2)} ${a.currency}</div>
      </div>
      <button class="icon-btn hover-glass" onclick="deleteFinAccount('${a.id}')">✕</button>
    `;
    accList.appendChild(li);
  });

  document.getElementById('fin-kpi-networth').textContent = `${totalNetWorth.toFixed(2)} ${dispCurr}`;
  document.getElementById('fin-kpi-accounts-count').textContent = `${finAccounts.length} cuentas activas`;

  // 2. Filtrar Transacciones por el Periodo Seleccionado (15d, 30d, 90d, 180d, 365d, ALL)
  const now = new Date();
  const filteredTx = finTransactions.filter((tx) => {
    if (finPeriodFilter === 'ALL') return true;
    const days = Number(finPeriodFilter);
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return new Date(tx.tx_date) >= cutoff;
  });

  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  const catSpendMap = {};
  const recurringMap = {};
  const incomeList = [];

  filteredTx.forEach((tx) => {
    const amtConverted = convertCurrency(Number(tx.amount || 0), tx.currency, dispCurr);
    const catObj = finCategories.find((c) => c.id === tx.category_id);
    const catName = catObj ? catObj.name : 'Sin categoría';

    if (tx.type === 'income') {
      totalIncome += amtConverted;
      incomeCount++;
      incomeList.push({ ...tx, amtConverted, catName });
    } else {
      totalExpense += amtConverted;
      expenseCount++;
      catSpendMap[catName] = (catSpendMap[catName] || 0) + amtConverted;

      const recKey = tx.description.trim().toLowerCase();
      if (!recurringMap[recKey]) {
        recurringMap[recKey] = { label: tx.description, count: 0, total: 0, flagged: tx.is_recurring };
      }
      recurringMap[recKey].count += 1;
      recurringMap[recKey].total += amtConverted;
      if (tx.is_recurring) recurringMap[recKey].flagged = true;
    }
  });

  document.getElementById('fin-kpi-income').textContent = `+${totalIncome.toFixed(2)} ${dispCurr}`;
  document.getElementById('fin-kpi-income-count').textContent = `${incomeCount} ingresos en el periodo`;
  document.getElementById('fin-kpi-expense').textContent = `-${totalExpense.toFixed(2)} ${dispCurr}`;
  document.getElementById('fin-kpi-expense-count').textContent = `${expenseCount} gastos en el periodo`;

  // 3. Diagnóstico del Asesor Financiero
  const netFlow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((netFlow / totalIncome) * 100) : 0;
  const rateEl = document.getElementById('fin-kpi-savings-rate');
  const tipEl = document.getElementById('fin-advisor-tip');

  rateEl.textContent = `${savingsRate.toFixed(1)}%`;
  rateEl.style.color = savingsRate >= 20 ? '#34d399' : (savingsRate < 0 ? '#fda4af' : '#38bdf8');

  const topCats = Object.entries(catSpendMap).sort((a, b) => b[1] - a[1]);
  if (totalIncome === 0 && totalExpense === 0) {
    tipEl.textContent = 'Sin movimientos en este rango. Registra tus ingresos y gastos para evaluar tu flujo.';
  } else if (netFlow < 0) {
    tipEl.textContent = `Déficit de ${Math.abs(netFlow).toFixed(2)} ${dispCurr}. Revisa recortes en "${topCats[0]?.[0] || 'tus gastos'}".`;
  } else if (savingsRate >= 20) {
    tipEl.textContent = `Excelente margen: ahorras el ${savingsRate.toFixed(0)}% de tus ingresos (${netFlow.toFixed(2)} ${dispCurr} libres).`;
  } else {
    tipEl.textContent = `Superávit positivo de ${netFlow.toFixed(2)} ${dispCurr}. Intenta llevar tu ahorro sobre el 20%.`;
  }

  // 4. Categorías en las que más gastas
  const topCatsDiv = document.getElementById('fin-top-categories-list');
  topCatsDiv.innerHTML = '';
  if (topCats.length === 0) {
    topCatsDiv.innerHTML = `<p class="muted-text">No hay gastos registrados en este periodo.</p>`;
  } else {
    topCats.slice(0, 5).forEach(([catName, val]) => {
      const pct = totalExpense > 0 ? Math.round((val / totalExpense) * 100) : 0;
      const row = document.createElement('div');
      row.innerHTML = `
        <div class="slip-row" style="margin-bottom:0.3rem;">
          <span>${escapeHtml(catName)}</span>
          <strong>${val.toFixed(2)} ${dispCurr} (${pct}%)</strong>
        </div>
        <div class="prob-bar-bg"><div class="expense-bar-fill" style="width:${pct}%;"></div></div>
      `;
      topCatsDiv.appendChild(row);
    });
  }

  // 5. Gastos más recurrentes
  const recList = document.getElementById('fin-recurring-expenses-list');
  recList.innerHTML = '';
  const recurringItems = Object.values(recurringMap)
    .filter((r) => r.flagged || r.count > 1)
    .sort((a, b) => b.total - a.total);

  if (recurringItems.length === 0) {
    recList.innerHTML = `<li class="muted-text">Sin gastos recurrentes detectados aún.</li>`;
  } else {
    recurringItems.slice(0, 6).forEach((r) => {
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <div>
          <strong>${escapeHtml(r.label)}</strong>
          <div class="muted-text">${r.count} ${r.count === 1 ? 'vez' : 'veces'} en el periodo</div>
        </div>
        <span class="glass-pill overdue">${r.total.toFixed(2)} ${dispCurr}</span>
      `;
      recList.appendChild(li);
    });
  }

  // 6. Ingresos recibidos en el periodo
  const incSummaryList = document.getElementById('fin-incomes-summary-list');
  incSummaryList.innerHTML = '';
  if (incomeList.length === 0) {
    incSummaryList.innerHTML = `<li class="muted-text">No hay ingresos registrados en este periodo.</li>`;
  } else {
    incomeList.slice(0, 6).forEach((inc) => {
      const dStr = new Date(inc.tx_date).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' });
      const li = document.createElement('li');
      li.className = 'list-item';
      li.innerHTML = `
        <div>
          <strong>${escapeHtml(inc.description)}</strong>
          <div class="muted-text">${escapeHtml(inc.catName)} • ${dStr}</div>
        </div>
        <span class="glass-pill high-prob">+${inc.amtConverted.toFixed(2)} ${dispCurr}</span>
      `;
      incSummaryList.appendChild(li);
    });
  }

  // 7. Planificados (Suscripciones y Salarios)
  const planList = document.getElementById('fin-planned-list');
  planList.innerHTML = '';
  const freqLabels = {
    quincenal: 'Cada 15 días',
    mensual: 'Cada 30 días',
    trimestral: 'Cada 3 meses',
    semestral: 'Cada 6 meses',
    anual: 'Cada año'
  };

  finPlanned.forEach((p) => {
    const isInc = p.type === 'income';
    const li = document.createElement('li');
    li.className = 'list-item hover-glass';
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(p.title)}</strong>
        <div class="muted-text">${freqLabels[p.frequency] || p.frequency} • Próx: ${p.next_date}</div>
        <span class="glass-pill ${isInc ? 'high-prob' : 'overdue'}" style="margin-top:4px;">
          ${isInc ? '+' : '-'}${Number(p.amount).toFixed(2)} ${p.currency}
        </span>
      </div>
      <div class="item-actions">
        <button class="icon-btn hover-glass" onclick="executePlannedItem('${p.id}')" title="Registrar ahora">✓ Aplicar</button>
        <button class="icon-btn hover-glass" onclick="deletePlannedItem('${p.id}')">✕</button>
      </div>
    `;
    planList.appendChild(li);
  });

  // 8. Historial completo del periodo
  const histList = document.getElementById('fin-transactions-list');
  histList.innerHTML = '';
  document.getElementById('fin-history-count').textContent = `${filteredTx.length} registros`;

  filteredTx.forEach((tx) => {
    const isInc = tx.type === 'income';
    const acc = finAccounts.find((a) => a.id === tx.account_id);
    const cat = finCategories.find((c) => c.id === tx.category_id);
    const dStr = new Date(tx.tx_date).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' });

    const li = document.createElement('li');
    li.className = 'list-item hover-glass';
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(tx.description)}</strong>
        <div class="muted-text">
          ${escapeHtml(cat?.name || 'General')} • ${escapeHtml(acc?.name || 'Cuenta')} • ${dStr}
          ${tx.is_recurring ? '• 🔁 Recurrente' : ''}
        </div>
      </div>
      <div class="item-actions">
        <span class="glass-pill ${isInc ? 'high-prob' : 'overdue'}">
          ${isInc ? '+' : '-'}${Number(tx.amount).toFixed(2)} ${tx.currency}
        </span>
        <button class="icon-btn hover-glass" onclick="deleteFinTransaction('${tx.id}')">✕</button>
      </div>
    `;
    histList.appendChild(li);
  });
}

// ==========================================
// 11. PARLEYS & MERCADOS DETALLADOS
// ==========================================
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

  if (!parleysData.parleys || parleysData.parleys.length === 0) {
    grid.innerHTML = `
      <article class="glass-card widget-card hover-glass">
        <span class="glass-pill">Aviso</span>
        <h3>Sin partidos próximos en estas ligas</h3>
        <p class="muted-text">Ejecuta el Workflow en GitHub Actions para sincronizar la próxima jornada.</p>
      </article>
    `;
    return;
  }

  parleysData.parleys.forEach((p, idx) => {
    const card = document.createElement('article');
    card.className = 'glass-card widget-card hover-glass';

    const legsHtml = p.legs.map((leg) => `
      <div class="parley-leg-item">
        <div>
          <strong>${escapeHtml(leg.pick)}</strong>
          <div class="muted-text">${escapeHtml(leg.home)} vs ${escapeHtml(leg.away)} (${escapeHtml(leg.league)})</div>
        </div>
        <span class="glass-pill high-prob">${leg.probability}% • ${leg.odd}x</span>
      </div>
    `).join('');

    card.innerHTML = `
      <div class="widget-header">
        <span class="glass-pill high-prob">${escapeHtml(p.tag)}</span>
        <span class="glass-pill">Prob: ${p.combined_probability}% • Cuota ${p.combined_odd}x</span>
      </div>
      <h3>${escapeHtml(p.title)}</h3>
      <p class="muted-text">${escapeHtml(p.description)}</p>
      <div style="display:flex; flex-direction:column; gap:0.5rem;">${legsHtml}</div>
      <button class="glass-btn primary hover-glass" onclick="loadParleyToSlip(${idx})">Cargar al Boleto</button>
    `;
    grid.appendChild(card);
  });
}

function renderMatchesList() {
  const grid = document.getElementById('matches-list-grid');
  grid.innerHTML = '';

  const filtered = selectedLeagueFilter === 'ALL'
    ? (parleysData.matches || [])
    : (parleysData.matches || []).filter((m) => m.league === selectedLeagueFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="glass-card match-card"><p class="muted-text">No hay partidos próximos para esta liga.</p></div>`;
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
      return `
        <button type="button" class="market-opt-btn hover-glass ${isOptSelected ? 'selected' : ''}"
          onclick="selectMatchMarket('${m.id}', '${activeTab}', '${opt.key}')">
          <span>${escapeHtml(opt.label)}</span>
          <strong>${opt.probability}% • ${opt.odd}x</strong>
        </button>
      `;
    }).join('');

    const card = document.createElement('article');
    card.className = 'glass-card match-card hover-glass';
    card.innerHTML = `
      <div class="widget-header">
        <span class="glass-pill">${escapeHtml(m.league)}</span>
        <span class="muted-text">${matchDate}</span>
      </div>

      <div>
        <strong>${escapeHtml(m.home)} vs ${escapeHtml(m.away)}</strong>
        <div class="muted-text" style="margin-top:0.2rem;">Top pick: <strong style="color:#34d399;">${escapeHtml(m.pick)} (${m.probability}%)</strong></div>
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
  }

  renderMatchesList();
  renderSlip();
};

window.loadParleyToSlip = (parleyIndex) => {
  const chosen = parleysData.parleys[parleyIndex];
  if (!chosen) return;
  customSlipLegs = [...chosen.legs];
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
  document.getElementById('slip-payout').textContent = `${payout.toFixed(2)} ${currency}`;
}

document.getElementById('clear-slip-btn').addEventListener('click', () =>