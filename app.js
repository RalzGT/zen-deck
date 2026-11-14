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
  widget_sizes: {}
};

let currentRatesMap = {};
let parleysData = { parleys: [], matches: [], updated_at: null };
let selectedLeagueFilter = 'ALL';
let activeMatchTabs = {};
let customSlipLegs = [];
let activeTimers = {};

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
      widget_sizes: profile.widget_sizes || {}
    };
  }

  applyBuiltInWidgetSizes();
  initCurrencySelectors();

  loadWeather();
  loadExchangeRates();
  loadQuickLinks();
  loadTodos();
  loadReminders();
  loadCustomWidgets();
  loadParleysModule();
}

async function saveProfilePrefs(partial) {
  userPrefs = { ...userPrefs, ...partial };
  await sb.from('profiles').update(partial).eq('id', currentUser.id);
}

// Cambio de tamaño en widgets fijos
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
// 8. WIDGETS PERSONALIZABLES INTERACTIVOS Y REDIMENSIONABLES
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
// 9. PARLEYS & MERCADOS DETALLADOS
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
      updateLabel.textContent = 'Ejecuta el Workflow en GitHub Actions para generar los nuevos mercados.';
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
        <p class="muted-text">Ejecuta el Workflow en GitHub Actions tras subir la actualización.</p>
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

document.getElementById('clear-slip-btn').addEventListener('click', () => {
  customSlipLegs = [];
  renderMatchesList();
  renderSlip();
});

document.getElementById('slip-stake').addEventListener('input', renderSlip);
document.getElementById('slip-currency').addEventListener('change', renderSlip);
document.getElementById('refresh-parleys-btn').addEventListener('click', loadParleysModule);

document.querySelectorAll('#league-filters .nav-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#league-filters .nav-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedLeagueFilter = btn.dataset.league;
    renderMatchesList();
  });
});

// ==========================================
// 10. NAVEGACIÓN MODULAR
// ==========================================
document.querySelectorAll('.module-nav .nav-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.module-nav .nav-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const targetId = btn.dataset.target;
    document.getElementById('dashboard-module').classList.toggle('hidden', targetId !== 'dashboard-module');
    document.getElementById('parleys-module').classList.toggle('hidden', targetId !== 'parleys-module');
  });
});