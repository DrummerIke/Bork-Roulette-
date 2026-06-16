import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = window.BORK_SUPABASE_URL || window.NEXT_PUBLIC_SUPABASE_URL || 'https://mhtbolnovisgdliphsmf.supabase.co';
const SUPABASE_ANON_KEY = window.BORK_SUPABASE_ANON_KEY || window.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odGJvbG5vdmlzZ2RsaXBoc21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4Mjk1OTYsImV4cCI6MjA2NzQwNTU5Nn0.ureoaGoJ9Dsp6bRAGmqA9x0his3eRamYGs6fOXQOmB0';
const TABLE_ENTRIES = 'roulette_phone_entries';
const TABLE_DRAWS = 'roulette_draws';
const EMPLOYEES_TABLE = 'employees';
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: { headers: { 'x-client-info': 'bork-roulette-google-sites' } },
});

const $ = (id) => document.getElementById(id);
const state = { employees: [], currentWinner: null, selectedDate: new Date(), calendarMonth: new Date() };

const pad = (value) => String(value).padStart(2, '0');
const toLocalIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const toRuDate = (iso) => iso.split('-').reverse().join('-');
const todayRu = () => toRuDate(toLocalIso(new Date()));
const showToast = (message) => { $('toast').textContent = message; };
const setStatus = (message, type = '') => { $('connectionStatus').textContent = message; $('connectionStatus').className = `status ${type}`; };

function startOfWeek(date = new Date()) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() - day + 1);
  return copy.toISOString().slice(0, 10);
}

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

async function loadDrawDates() {
  const { data, error } = await supabase.from(TABLE_ENTRIES).select('entry_date').order('entry_date', { ascending: false });
  if (error) throw error;
  const dates = [...new Set((data || []).map((row) => row.entry_date))];
  $('drawDateSelect').innerHTML = dates.length
    ? dates.map((date) => `<option value="${date}">${toRuDate(date)}</option>`).join('')
    : '<option value="">Нет сохраненных дат</option>';
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
}

async function drawWinner() {
  const date = $('drawDateSelect').value;
  if (!date) return showToast('Выберите дату, где есть номера');
  const weekStart = startOfWeek();
  const [{ data: entries, error: entriesError }, { data: draws, error: drawsError }] = await Promise.all([
    supabase.from(TABLE_ENTRIES).select('id,phone,entry_date,employee_id,employees(name)').eq('entry_date', date),
    supabase.from(TABLE_DRAWS).select('winner_employee_id').gte('drawn_at', `${weekStart}T00:00:00Z`),
  ]);
  if (entriesError || drawsError) return showToast(`Ошибка отбора: ${(entriesError || drawsError).message}`);
  if (!entries?.length) return showToast('На эту дату нет номеров');

  const weeklyWins = (draws || []).reduce((acc, draw) => {
    acc[draw.winner_employee_id] = (acc[draw.winner_employee_id] || 0) + 1;
    return acc;
  }, {});
  const weighted = entries.map((entry) => ({ ...entry, weight: 1 / (1 + (weeklyWins[entry.employee_id] || 0) * 8) }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = Math.random() * total;
  const winner = weighted.find((entry) => (cursor -= entry.weight) <= 0) || weighted.at(-1);
  state.currentWinner = winner;
  $('winnerPhone').textContent = winner.phone;
  $('winnerEmployee').textContent = winner.employees?.name || 'Сотрудник не найден';
  $('winnerChance').textContent = `Вес отбора: ${winner.weight.toFixed(3)}. Побед на неделе: ${weeklyWins[winner.employee_id] || 0}`;
  $('winnerCard').hidden = false;
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
  });
  if (error) return showToast(`Ошибка сохранения отбора: ${error.message}`);
  $('saveDrawButton').disabled = true;
  showToast('Результат отбора сохранен');
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

function bindUi() {
  document.querySelectorAll('.tab').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.tab,.panel').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    $(`${button.dataset.tab}Panel`).classList.add('active');
  }));
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
    setStatus('Supabase подключен', 'ok');
    showToast(`Готово: сотрудники загружены (${state.employees.length}). ${todayRu()}`);
  } catch (error) {
    setStatus('Ошибка подключения', 'error');
    showToast(`Проверьте RLS/CORS и таблицы employees, ${TABLE_ENTRIES}, ${TABLE_DRAWS}: ${error.message}`);
  }
}

init();
