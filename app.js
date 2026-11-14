// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE (ZEN DECK)
// ==========================================
const SUPABASE_URL = 'https://lxrdrqjjuzpxtysakpvb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DXx0j5HaveKep0XHgjor_A_Kmrp9ll6';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isRegisterMode = false;
let currentUser = null;
let currentUsdToHnl = 0;

const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// ==========================================
// 2. AUTENTICACIÓN (LOGIN / REGISTRO)
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
    const msg = err.message === 'Invalid login credentials'
      ? 'Correo o contraseña incorrectos.'
      : (err.message || 'Error de autenticación.');
    authError.textContent = msg;
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
// 3. INICIALIZACIÓN Y DATOS EN VIVO
// ==========================================
async function initDashboard() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('current-date').textContent = new Date().toLocaleDateString('es-HN', options);

  const { data: profile } = await sb
    .from('profiles')
    .select('full_name')
    .eq('id', currentUser.id)
    .single();

  const displayName = profile?.full_name || currentUser.user_metadata?.full_name || 'Usuario';
  document.getElementById('welcome-user').textContent = `Hola, ${displayName}`;

  loadWeatherSPS();
  loadUsdToHnl();
  loadTodos();
  loadReminders();
  loadCustomWidgets();
}

async function loadWeatherSPS() {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=15.5042&longitude=-88.0250&current_weather=true';
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

async function loadUsdToHnl() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    currentUsdToHnl = data.rates.HNL;

    document.getElementById('usd-hnl-rate').textContent = `L. ${currentUsdToHnl.toFixed(4)}`;
    updateCurrencyConversion();
  } catch {
    document.getElementById('usd-hnl-rate').textContent = 'Error de red';
  }
}

function updateCurrencyConversion() {
  const usdAmount = parseFloat(document.getElementById('usd-input').value) || 0;
  const hnlResult = usdAmount * currentUsdToHnl;
  document.getElementById('hnl-output').textContent = `L. ${hnlResult.toFixed(2)}`;
}

document.getElementById('usd-input').addEventListener('input', updateCurrencyConversion);

// ==========================================
// 4. TAREAS PENDIENTES (TO-DO)
// ==========================================
async function loadTodos() {
  const { data: todos } = await sb
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false });

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

// ==========================================
// 5. RECORDATORIOS
// ==========================================
async function loadReminders() {
  const { data: reminders } = await sb
    .from('reminders')
    .select('*')
    .order('remind_at', { ascending: true });

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
// 6. WIDGETS PERSONALIZABLES
// ==========================================
const widgetModal = document.getElementById('widget-modal');

document.getElementById('open-widget-modal-btn').addEventListener('click', () => {
  widgetModal.classList.remove('hidden');
});

document.getElementById('close-widget-modal-btn').addEventListener('click', () => {
  widgetModal.classList.add('hidden');
});

async function loadCustomWidgets() {
  const { data: widgets } = await sb
    .from('custom_widgets')
    .select('*')
    .order('created_at', { ascending: true });

  const container = document.getElementById('custom-widgets-container');
  container.innerHTML = '';

  (widgets || []).forEach((w) => {
    const card = document.createElement('article');
    card.className = 'glass-card widget-card hover-glass';
    card.innerHTML = `
      <div class="widget-header">
        <span class="glass-pill">${escapeHtml(w.tag)}</span>
        <button class="icon-btn hover-glass" onclick="deleteCustomWidget('${w.id}')">✕</button>
      </div>
      <h3>${escapeHtml(w.title)}</h3>
      <p class="custom-widget-text">${escapeHtml(w.content)}</p>
    `;
    container.appendChild(card);
  });
}

document.getElementById('custom-widget-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('widget-title').value.trim();
  const tag = document.getElementById('widget-tag').value.trim() || 'Personal';
  const content = document.getElementById('widget-content').value.trim();

  await sb.from('custom_widgets').insert({
    user_id: currentUser.id,
    title,
    tag,
    content
  });

  e.target.reset();
  widgetModal.classList.add('hidden');
  loadCustomWidgets();
});

window.deleteCustomWidget = async (id) => {
  await sb.from('custom_widgets').delete().eq('id', id);
  loadCustomWidgets();
};

// ==========================================
// 7. NAVEGACIÓN MODULAR
// ==========================================
document.querySelectorAll('.nav-pill').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-pill').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const targetId = btn.dataset.target;
    document.getElementById('dashboard-module').classList.toggle('hidden', targetId !== 'dashboard-module');
    document.getElementById('parleys-module').classList.toggle('hidden', targetId !== 'parleys-module');
  });
});