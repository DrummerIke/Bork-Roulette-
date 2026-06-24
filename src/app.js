import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = window.BORK_SUPABASE_URL || window.NEXT_PUBLIC_SUPABASE_URL || 'https://mhtbolnovisgdliphsmf.supabase.co';
const SUPABASE_ANON_KEY = window.BORK_SUPABASE_ANON_KEY || window.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odGJvbG5vdmlzZ2RsaXBoc21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4Mjk1OTYsImV4cCI6MjA2NzQwNTU5Nn0.ureoaGoJ9Dsp6bRAGmqA9x0his3eRamYGs6fOXQOmB0';
const TABLE_ENTRIES = 'roulette_phone_entries';
const TABLE_DRAWS = 'roulette_draws';
const EMPLOYEES_TABLE = 'employees';
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const ROULETTE_PASSWORD = '06062025';
const PROTECTED_TABS = ['randomizer', 'stats'];
const CHECKLIST_ITEMS = window.BORK_CHECKLIST_ITEMS || [
  { id: 'greeting', title: 'Приветствие', info: 'Сотрудник поздоровался, представился и задал корректный тон диалога.' },
  { id: 'need', title: 'Выявление потребности', info: 'Сотрудник уточнил задачу клиента и зафиксировал ключевую потребность.' },
  { id: 'solution', title: 'Решение / предложение', info: 'Сотрудник предложил релевантное решение или следующий понятный шаг.' },
  { id: 'finish', title: 'Завершение диалога', info: 'Диалог завершен аккуратно: клиент понимает договоренности и дальнейшие действия.' },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: { headers: { 'x-client-info': 'bork-roulette-google-sites' } },
});

const $ = (id) => document.getElementById(id);
const state = { employees: [], currentWinner: null, selectedDate: new Date(), calendarMonth: new Date(), rouletteUnlocked: sessionStorage.getItem('borkRouletteUnlocked') === 'true', pendingProtectedTab: 'randomizer' };

const pad = (value) => String(value).padStart(2, '0');
const toLocalIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const toRuDate = (iso) => iso.split('-').reverse().join('-');
const todayRu = () => toRuDate(toLocalIso(new Date()));
const showToast = (message) => { $('toast').textContent = message; };
const setStatus = (message, type = '') => { $('connectionStatus').textContent = message; $('connectionStatus').className = `status ${type}`; };


function setSelectedDate(date) {
  state.selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  $('dateIsoInput').value = toLocalIso(state.selectedDate);
  $('dateInput').textContent = toRuDate($('dateIsoInput').value);
  renderCalendar();
}

function toggleCalendar(forceOpen) {
  const calendar = $('calendar');
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : calendar.hidden;
  calendar.hidden = !shouldOpen;
  $('dateTrigger').setAttribute('aria-expanded', String(shouldOpen));
}

function renderCalendar() {
  const year = state.calendarMonth.getFullYear();
  const month = state.calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const selectedIso = toLocalIso(state.selectedDate);
  const todayIso = toLocalIso(new Date());

  $('calendarTitle').textContent = `${MONTHS[month]} ${year}`;
  $('calendarGrid').innerHTML = '';

  for (let i = 0; i < startOffset; i += 1) {
    const empty = document.createElement('span');
    empty.className = 'calendar-empty';
    $('calendarGrid').append(empty);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const iso = toLocalIso(date);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'calendar-day';
    button.textContent = String(day);
    button.setAttribute('aria-label', toRuDate(iso));
    if (iso === selectedIso) button.classList.add('selected');
    if (iso === todayIso) button.classList.add('today');
    button.addEventListener('click', () => {
      setSelectedDate(date);
      toggleCalendar(false);
    });
    $('calendarGrid').append(button);
  }
}

async function loadEmployees() {
  const { data, error } = await supabase.from(EMPLOYEES_TABLE).select('id,name').order('name');
  if (error) throw error;
  state.employees = data || [];
  $('employeeSelect').innerHTML = '<option value="">Выберите сотрудника</option>' +
    state.employees.map((employee) => `<option value="${employee.id}">${employee.name}</option>`).join('');
}

async function loadEntryDates() {
  const { data, error } = await supabase.from(TABLE_ENTRIES).select('entry_date').order('entry_date', { ascending: false });
  if (error) throw error;
  const todayIso = toLocalIso(new Date());
  return [...new Set([todayIso, ...(data || []).map((row) => row.entry_date)])];
}

function fillDateSelect(selectId, dates, emptyText) {
  $(selectId).innerHTML = dates.length
    ? dates.map((date) => `<option value="${date}">${toRuDate(date)}</option>`).join('')
    : `<option value="">${emptyText}</option>`;
}

async function loadDrawDates() {
  const dates = await loadEntryDates();
  fillDateSelect('drawDateSelect', dates, 'Нет сохраненных дат');
  fillDateSelect('statsDateSelect', dates, 'Нет дат для статистики');
}

async function loadResultDates() {
  const { data, error } = await supabase.from(TABLE_DRAWS).select('source_date').order('source_date', { ascending: false });
  if (error) throw error;
  const dates = [...new Set((data || []).map((row) => row.source_date))];
  fillDateSelect('resultDateSelect', dates, 'Нет сохраненных отборов');
}

function renderChecklist() {
  $('dialogChecklist').innerHTML = CHECKLIST_ITEMS.map((item) => `
    <label class="checklist-item">
      <input type="checkbox" data-checklist-id="${item.id}" />
      <span class="check-copy">
        <strong>${item.title}</strong>
        <span class="info-dot" tabindex="0" aria-label="Пояснение">i<span class="tooltip">${item.info}</span></span>
      </span>
    </label>
  `).join('');
}

function getChecklistState() {
  return CHECKLIST_ITEMS.reduce((acc, item) => {
    const input = document.querySelector(`[data-checklist-id="${item.id}"]`);
    acc[item.id] = { title: item.title, checked: Boolean(input?.checked) };
    return acc;
  }, {});
}

async function saveEntry(event) {
  event.preventDefault();
  const employeeId = $('employeeSelect').value;
  const phone = $('phoneInput').value.trim();
  const entryDate = $('dateIsoInput').value;
  if (!entryDate) return showToast('Выберите дату');

  const { error } = await supabase.from(TABLE_ENTRIES).insert({ employee_id: employeeId, phone, entry_date: entryDate });
  if (error) return showToast(`Ошибка сохранения: ${error.message}`);
  $('phoneInput').value = '';
  showToast('Номер сохранен');
  await loadDrawDates();
  await renderStats();
}

async function renderStats() {
  if (!state.rouletteUnlocked) return;
  const date = $('statsDateSelect').value || toLocalIso(new Date());
  if (!date) return;
  const { data: entries, error } = await supabase
    .from(TABLE_ENTRIES)
    .select('employee_id,phone,employees(name)')
    .eq('entry_date', date);
  if (error) {
    showToast(`Ошибка статистики: ${error.message}`);
    return;
  }

  const filledByEmployee = (entries || []).reduce((acc, entry) => {
    if (!acc[entry.employee_id]) acc[entry.employee_id] = [];
    acc[entry.employee_id].push(entry.phone);
    return acc;
  }, {});
  const filled = state.employees.filter((employee) => filledByEmployee[employee.id]);
  const missing = state.employees.filter((employee) => !filledByEmployee[employee.id]);

  $('statsSummary').innerHTML = `<span>Заполнили: ${filled.length}</span><span>Не заполнили: ${missing.length}</span>`;
  $('filledList').innerHTML = filled.length
    ? filled.map((employee) => `<article class="person filled"><strong>${employee.name}</strong><small>${filledByEmployee[employee.id].join(', ')}</small></article>`).join('')
    : '<p class="empty-state">Пока никто не заполнил.</p>';
  $('missingList').innerHTML = missing.length
    ? missing.map((employee) => `<article class="person missing"><strong>${employee.name}</strong></article>`).join('')
    : '<p class="empty-state">Все сотрудники заполнили.</p>';
}

async function drawWinner() {
  if (!state.rouletteUnlocked) return requestRoulettePassword();
  const date = $('drawDateSelect').value;
  if (!date) return showToast('Выберите дату, где есть номера');
  const { data: entries, error } = await supabase
    .from(TABLE_ENTRIES)
    .select('id,phone,entry_date,employee_id,employees(name)')
    .eq('entry_date', date);
  if (error) return showToast(`Ошибка отбора: ${error.message}`);
  if (!entries?.length) return showToast('На эту дату нет номеров');

  const winner = entries[Math.floor(Math.random() * entries.length)];
  state.currentWinner = winner;
  $('winnerPhone').textContent = winner.phone;
  $('winnerEmployee').textContent = winner.employees?.name || 'Сотрудник не найден';
  $('winnerChance').textContent = `Отбор за дату ${toRuDate(date)}. Всего номеров: ${entries.length}`;
  renderChecklist();
  $('drawWorkspace').hidden = false;
  $('redrawButton').disabled = false;
  $('saveDrawButton').disabled = false;
  showToast('Кандидат отобран. Нажмите «Сохранить», чтобы зафиксировать результат.');
}

async function saveDraw() {
  if (!state.currentWinner) return;
  const { error } = await supabase.from(TABLE_DRAWS).insert({
    entry_id: state.currentWinner.id,
    winner_employee_id: state.currentWinner.employee_id,
    selected_phone: state.currentWinner.phone,
    source_date: state.currentWinner.entry_date,
    checklist: getChecklistState(),
  });
  if (error) return showToast(`Ошибка сохранения отбора: ${error.message}`);
  $('saveDrawButton').disabled = true;
  await loadResultDates();
  await renderDrawResults();
  showToast('Результат отбора сохранен');
}

function renderChecklistResult(checklist = {}) {
  return CHECKLIST_ITEMS.map((item) => {
    const checked = Boolean(checklist[item.id]?.checked);
    return `<span class="result-check ${checked ? 'checked' : ''}">${checked ? '✓' : '—'} ${item.title}</span>`;
  }).join('');
}

async function renderDrawResults() {
  if (!state.rouletteUnlocked) return;
  const date = $('resultDateSelect').value;
  if (!date) {
    $('drawResultsList').innerHTML = '<p class="empty-state">Нет сохраненных результатов.</p>';
    return;
  }
  const { data, error } = await supabase
    .from(TABLE_DRAWS)
    .select('selected_phone,winner_employee_id,source_date,drawn_at,checklist')
    .eq('source_date', date)
    .order('drawn_at', { ascending: false });
  if (error) {
    showToast(`Ошибка результатов: ${error.message}`);
    return;
  }
  const employeeById = state.employees.reduce((acc, employee) => {
    acc[employee.id] = employee.name;
    return acc;
  }, {});
  $('drawResultsList').innerHTML = data?.length
    ? data.map((draw) => `
      <article class="result-card">
        <div>
          <strong>${draw.selected_phone}</strong>
          <small>${employeeById[draw.winner_employee_id] || 'Сотрудник не найден'} · ${new Date(draw.drawn_at).toLocaleString('ru-RU')}</small>
        </div>
        <div class="result-checks">${renderChecklistResult(draw.checklist)}</div>
      </article>
    `).join('')
    : '<p class="empty-state">На эту дату результатов нет.</p>';
}


function bindCalendar() {
  $('dateTrigger').addEventListener('click', () => toggleCalendar());
  $('prevMonth').addEventListener('click', () => {
    state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  $('nextMonth').addEventListener('click', () => {
    state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1);
    renderCalendar();
  });
  document.addEventListener('click', (event) => {
    if (!$('calendar').hidden && !$('calendar').contains(event.target) && !$('dateTrigger').contains(event.target)) {
      toggleCalendar(false);
    }
  });
}

function openTab(tabName) {
  document.querySelectorAll('.tab,.panel').forEach((item) => item.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  $(`${tabName}Panel`).classList.add('active');
}

function requestRoulettePassword(tabName = 'randomizer') {
  state.pendingProtectedTab = tabName;
  $('rouletteLock').hidden = false;
  $('passwordInput').value = '';
  $('passwordInput').focus();
  showToast('Для доступа к закрытому разделу введите пароль.');
}

function unlockRoulette(event) {
  event.preventDefault();
  if ($('passwordInput').value !== ROULETTE_PASSWORD) {
    showToast('Неверный пароль');
    return;
  }
  state.rouletteUnlocked = true;
  sessionStorage.setItem('borkRouletteUnlocked', 'true');
  $('rouletteLock').hidden = true;
  openTab(state.pendingProtectedTab);
  if (state.pendingProtectedTab === 'stats') { renderStats(); renderDrawResults(); }
  showToast('Доступ открыт');
}

function bindUi() {
  document.querySelectorAll('.tab').forEach((button) => button.addEventListener('click', () => {
    if (PROTECTED_TABS.includes(button.dataset.tab) && !state.rouletteUnlocked) {
      requestRoulettePassword(button.dataset.tab);
      return;
    }
    openTab(button.dataset.tab);
    if (button.dataset.tab === 'stats') { renderStats(); renderDrawResults(); }
  }));
  $('passwordForm').addEventListener('submit', unlockRoulette);
  $('statsDateSelect').addEventListener('change', renderStats);
  $('refreshStatsButton').addEventListener('click', renderStats);
  $('resultDateSelect').addEventListener('change', renderDrawResults);
  $('refreshResultsButton').addEventListener('click', renderDrawResults);
  $('rouletteLock').addEventListener('click', (event) => {
    if (event.target === $('rouletteLock')) $('rouletteLock').hidden = true;
  });
  bindCalendar();
  $('entryForm').addEventListener('submit', saveEntry);
  $('drawButton').addEventListener('click', drawWinner);
  $('redrawButton').addEventListener('click', drawWinner);
  $('saveDrawButton').addEventListener('click', saveDraw);
}

async function init() {
  setSelectedDate(new Date());
  bindUi();
  try {
    await loadEmployees();
    await loadDrawDates();
    await loadResultDates();
    if (state.rouletteUnlocked) { await renderStats(); await renderDrawResults(); }
    setStatus('Supabase подключен', 'ok');
    showToast(`Готово: сотрудники загружены (${state.employees.length}). ${todayRu()}`);
  } catch (error) {
    setStatus('Ошибка подключения', 'error');
    showToast(`Проверьте RLS/CORS и таблицы employees, ${TABLE_ENTRIES}, ${TABLE_DRAWS}: ${error.message}`);
  }
}

init();
