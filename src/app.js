import { createClient } from './supabase-client.js';

const SUPABASE_URL = window.BORK_SUPABASE_URL || window.NEXT_PUBLIC_SUPABASE_URL || 'https://mhtbolnovisgdliphsmf.supabase.co';
const SUPABASE_ANON_KEY = window.BORK_SUPABASE_ANON_KEY || window.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odGJvbG5vdmlzZ2RsaXBoc21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4Mjk1OTYsImV4cCI6MjA2NzQwNTU5Nn0.ureoaGoJ9Dsp6bRAGmqA9x0his3eRamYGs6fOXQOmB0';
const TABLE_ENTRIES = 'roulette_phone_entries';
const TABLE_DRAWS = 'roulette_draws';
const EMPLOYEES_TABLE = 'employees';
const DRAW_POSITION = 'Personal Consultant';
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const WEEKDAYS = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
const ROULETTE_PASSWORD = '06062025';
const PROTECTED_TABS = ['randomizer', 'stats'];
const CHECKLIST_ITEMS = window.BORK_CHECKLIST_ITEMS || [
  {
    "id": "voice_energy",
    "title": "Улыбка, позитив и энергия в голосе",
    "info": "Критерий засчитывается, если ПК звучит живо, позитивно, с улыбкой в голосе и искренним желанием сделать разговор приятным для клиента. В голосе есть энергия продажника: интерес, вовлечённость, радость контакта и ощущение, что покупка клиента действительно важна. Что ожидаем услышать: тёплую интонацию, эмоциональную включённость, лёгкость, доброжелательный темп, естественную улыбку в голосе, живую реакцию на слова клиента. Не засчитываем, если ПК звучит нейтрально, сухо, устало, механически, без эмоций и позитивной энергии."
  },
  {
    "id": "client_language",
    "title": "Один язык с клиентом",
    "info": "Критерий засчитывается, если ПК быстро считывает стиль клиента и говорит с ним на одном языке: по темпу, длине фраз, уровню детализации, эмоциональности и деловому настрою. Что ожидаем услышать: с открытым клиентом — теплее и подробнее; с сомневающимся — спокойно и уверенно; с торопящимся — быстро, по сути, но ёмко. Не засчитываем, если ПК говорит одинаково со всеми, не слышит состояние клиента, перебивает или продолжает скрипт без учета реакции."
  },
  {
    "id": "purchase_history",
    "title": "Работа с историей покупок и опытом клиента",
    "info": "Критерий засчитывается, если ПК использует историю клиента конкретно: связывает текущий заказ с предыдущими покупками, спрашивает об опыте использования или показывает, что видит путь клиента с брендом. Для нового клиента ПК уточняет первое ли это знакомство с BORK, что заинтересовало, как прошел выбор на сайте или в приложении. Не засчитываем общие фразы, которые подошли бы любому клиенту, или отсутствие обращения к прошлому опыту/первому знакомству."
  },
  {
    "id": "congrats_compliment",
    "title": "Поздравление и предметный комплимент выбору",
    "info": "Критерий засчитывается, если ПК поздравляет клиента с приобретением и предметно усиливает выбор: объясняет, почему модель, подарок или сценарий действительно удачны. Что ожидаем услышать: поздравление плюс конкретная ценность выбора — эстетика, статусность, функциональность, технология, удобство владения, подарочный эффект или точное попадание в сценарий. Не засчитываем общее «поздравляю, отличный выбор» без объяснения."
  },
  {
    "id": "purchase_scenario",
    "title": "Работа со сценарием покупки: подарок или для себя",
    "info": "Критерий засчитывается, если ПК не просто спрашивает «для себя или в подарок», а использует ответ клиента дальше. Если подарок — благодарит за доверие подарка BORK, подчеркивает ответственность за впечатление и предлагает подарочное оформление. Если для себя — поддерживает выбор и уточняет сценарий использования: дом, кухня, офис, загородное пространство, ежедневный ритуал или конкретная задача. Не засчитываем, если ответ клиента дальше не используется."
  },
  {
    "id": "unique_feature",
    "title": "Усиление выбора через одну уникальную особенность модели",
    "info": "Критерий засчитывается, если ПК добавляет к заказу точный экспертный акцент, усиливающий уверенность клиента. Что ожидаем услышать: не пересказ карточки товара, а короткое объяснение важной особенности модели, связанной со сценарием клиента — пользой, эстетикой, удобством, технологией, подарочным эффектом или ежедневным использованием. Не засчитываем общие слова вроде «модель хорошая», «популярная позиция», «клиенты довольны»."
  },
  {
    "id": "purchase_expansion",
    "title": "Расширение покупки",
    "info": "Критерий засчитывается, если ПК выходит за рамки текущего заказа и предлагает конкретное расширение покупки: дополнительный продукт, новинку, аксессуар, расходный материал, BORK-Care и т.д. Нужно назвать конкретную позицию или категорию и объяснить ценность через сценарий клиента. Не засчитываем отсутствие предложения, провоцирующие отказ формулировки («не хотите ещё приобрести», «за отдельную плату») или предложение без объяснения ценности."
  },
  {
    "id": "useful_advice",
    "title": "Полезный совет по использованию, уходу или первому запуску",
    "info": "Критерий засчитывается, если ПК дает короткий полезный совет, который поможет быстрее и правильнее получить удовольствие от покупки. Что ожидаем услышать: практичный комментарий по первому запуску, уходу, настройке, хранению, расходным материалам, подарочному вручению или сценарию использования. Не засчитываем, если есть только подтверждение заказа. Общая фраза про рецепты не засчитывается, если ПК не говорит, что отправит их лично в мессенджер или на почту."
  },
  {
    "id": "personal_support",
    "title": "Персональное сопровождение после звонка",
    "info": "Критерий засчитывается, если ПК завершает диалог так, чтобы клиент понимал: после звонка у него есть конкретный человек, к которому можно обратиться. Что ожидаем услышать: ПК еще раз представляется как персональный консультант, подтверждает удобный канал связи, обещает отправить визитку каждому клиенту и проговаривает готовность помочь по доставке, первому запуску, дополнительным вопросам или будущим покупкам. Не засчитываем формальное завершение без ощущения личного сопровождения."
  },
  {
    "id": "live_reaction",
    "title": "Живая реакция на то, что важно для клиента",
    "info": "Критерий засчитывается, если клиент делится личной деталью, опытом, эмоцией, сомнением или важным обстоятельством, а ПК обязательно реагирует словами и не проходит мимо. Что ожидаем услышать: не формальное «понял», «хорошо», «угу», а благодарность, поддержка, уточняющий вопрос, понимание или личный контроль важного момента. Например: важная дата доставки, прошлый опыт, негативный опыт или личная деталь вроде поездки. Не засчитываем, если ПК игнорирует важную информацию и продолжает оформление по скрипту."
  }
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
const fromIsoDate = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const toWeekday = (iso) => WEEKDAYS[fromIsoDate(iso).getDay()];
const formatDateOption = (iso) => `${toRuDate(iso)} · ${toWeekday(iso)}`;
const todayRu = () => toRuDate(toLocalIso(new Date()));
const showToast = (message) => { $('toast').textContent = message; };
const setStatus = (message, type = '') => { $('connectionStatus').textContent = message; $('connectionStatus').className = `status ${type}`; };

function getRandomIndex(maxExclusive) {
  if (maxExclusive <= 0) return 0;
  const cryptoObject = window.crypto || window.msCrypto;
  if (!cryptoObject?.getRandomValues) return Math.floor(Math.random() * maxExclusive);

  const maxUint = 0xffffffff;
  const limit = maxUint - (maxUint % maxExclusive);
  const values = new Uint32Array(1);
  do {
    cryptoObject.getRandomValues(values);
  } while (values[0] >= limit);

  return values[0] % maxExclusive;
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
  const { data, error } = await supabase.from(EMPLOYEES_TABLE).select('id,name,Position').eq('Position', DRAW_POSITION).order('name');
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

function fillSelect(selectId, options, emptyText) {
  $(selectId).innerHTML = options.length
    ? options.map((option) => `<option value="${option.value}">${option.label}</option>`).join('')
    : `<option value="">${emptyText}</option>`;
}

function getWeekendDates(iso) {
  const date = fromIsoDate(iso);
  const day = date.getDay();
  const friday = new Date(date);
  friday.setDate(date.getDate() - (day === 0 ? 2 : day - 5));
  return [0, 1, 2].map((offset) => {
    const next = new Date(friday);
    next.setDate(friday.getDate() + offset);
    return toLocalIso(next);
  });
}

function buildDrawOptions(dates) {
  const optionsByKey = new Map();
  dates.forEach((date) => {
    const day = fromIsoDate(date).getDay();
    if ([5, 6, 0].includes(day)) {
      const weekendDates = getWeekendDates(date);
      const key = weekendDates.join('|');
      optionsByKey.set(key, {
        value: key,
        sortDate: weekendDates[0],
        label: `${toRuDate(weekendDates[0])} · ПТ — ${toRuDate(weekendDates[2])} · ВС`,
      });
      return;
    }

    optionsByKey.set(date, { value: date, sortDate: date, label: formatDateOption(date) });
  });

  return [...optionsByKey.values()].sort((a, b) => b.sortDate.localeCompare(a.sortDate));
}

async function loadDrawDates() {
  const dates = await loadEntryDates();
  fillSelect('drawDateSelect', buildDrawOptions(dates), 'Нет сохраненных дат');
  fillSelect('statsDateSelect', dates.map((date) => ({ value: date, label: formatDateOption(date) })), 'Нет дат для статистики');
}

async function loadResultDates() {
  const { data, error } = await supabase.from(TABLE_DRAWS).select('source_date').order('source_date', { ascending: false });
  if (error) throw error;
  const dates = [...new Set((data || []).map((row) => row.source_date))];
  fillSelect('resultDateSelect', dates.map((date) => ({ value: date, label: formatDateOption(date) })), 'Нет сохраненных отборов');
}

function renderChecklist() {
  $('dialogChecklist').innerHTML = CHECKLIST_ITEMS.map((item) => `
    <article class="checklist-item">
      <label class="check-main">
        <input type="checkbox" data-checklist-id="${item.id}" />
        <span class="check-copy">
          <strong>${item.title}</strong>
          <span class="info-dot" tabindex="0" aria-label="Пояснение">i<span class="tooltip">${item.info}</span></span>
        </span>
      </label>
      ${item.id === 'live_reaction' ? '<label class="not-applicable"><input type="checkbox" data-checklist-na="live_reaction" />Не применим</label>' : ''}
    </article>
  `).join('');
  bindTooltipPositioning();
  bindNotApplicable();
}

function bindTooltipPositioning() {
  document.querySelectorAll('.info-dot').forEach((dot) => {
    const placeTooltip = () => {
      const tooltip = dot.querySelector('.tooltip');
      if (!tooltip) return;
      const dotRect = dot.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const margin = 12;
      const width = Math.min(tooltipRect.width || 640, window.innerWidth - margin * 2);
      const height = tooltipRect.height || 180;
      const hasSpaceBelow = dotRect.bottom + height + margin <= window.innerHeight;
      const top = hasSpaceBelow
        ? dotRect.bottom + 8
        : Math.max(margin, dotRect.top - height - 8);
      const left = Math.min(
        Math.max(margin, dotRect.right - width),
        window.innerWidth - width - margin,
      );
      tooltip.style.setProperty('--tooltip-top', `${top}px`);
      tooltip.style.setProperty('--tooltip-left', `${left}px`);
    };
    dot.addEventListener('mouseenter', placeTooltip);
    dot.addEventListener('focus', placeTooltip);
  });
}

function getChecklistState() {
  return CHECKLIST_ITEMS.reduce((acc, item) => {
    const input = document.querySelector(`[data-checklist-id="${item.id}"]`);
    const notApplicableInput = document.querySelector(`[data-checklist-na="${item.id}"]`);
    const notApplicable = Boolean(notApplicableInput?.checked);
    acc[item.id] = { title: item.title, checked: !notApplicable && Boolean(input?.checked), notApplicable };
    return acc;
  }, {});
}

function bindNotApplicable() {
  document.querySelectorAll('[data-checklist-na]').forEach((input) => {
    input.addEventListener('change', () => {
      const target = document.querySelector(`[data-checklist-id="${input.dataset.checklistNa}"]`);
      if (!target) return;
      target.disabled = input.checked;
      if (input.checked) target.checked = false;
    });
  });
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
  const selectedPeriod = $('drawDateSelect').value;
  if (!selectedPeriod) return showToast('Выберите дату, где есть номера');
  const periodDates = selectedPeriod.split('|');
  const entriesQuery = supabase
    .from(TABLE_ENTRIES)
    .select('id,phone,entry_date,employee_id,employees(name)');
  const { data: entries, error } = await (periodDates.length > 1
    ? entriesQuery.in('entry_date', periodDates)
    : entriesQuery.eq('entry_date', periodDates[0]));
  if (error) return showToast(`Ошибка отбора: ${error.message}`);
  const consultantIds = new Set(state.employees.map((employee) => employee.id));
  const eligibleEntries = (entries || []).filter((entry) => consultantIds.has(entry.employee_id));
  if (!eligibleEntries.length) return showToast('На эту дату нет номеров Personal Consultant');

  const entriesByEmployee = eligibleEntries.reduce((acc, entry) => {
    if (!acc.has(entry.employee_id)) acc.set(entry.employee_id, []);
    acc.get(entry.employee_id).push(entry);
    return acc;
  }, new Map());
  const employeeGroups = [...entriesByEmployee.values()];
  const selectedEmployeeEntries = employeeGroups[getRandomIndex(employeeGroups.length)];
  const winner = selectedEmployeeEntries[getRandomIndex(selectedEmployeeEntries.length)];
  state.currentWinner = winner;
  $('winnerPhone').textContent = winner.phone;
  $('winnerEmployee').textContent = winner.employees?.name || 'Сотрудник не найден';
  $('winnerChance').textContent = `Отбор за ${periodDates.map(formatDateOption).join(' / ')}. Сотрудников Personal Consultant: ${employeeGroups.length}. Номеров в пуле: ${eligibleEntries.length}`;
  renderChecklist();
  $('drawWorkspace').hidden = false;
  $('drawButton').disabled = true;
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
    const result = checklist[item.id] || {};
    const checked = Boolean(result.checked);
    const notApplicable = Boolean(result.notApplicable);
    const marker = notApplicable ? 'Н/П' : (checked ? '✓' : '—');
    return `<span class="result-check ${checked ? 'checked' : ''} ${notApplicable ? 'not-applicable-result' : ''}">${marker} ${item.title}</span>`;
  }).join('');
}

function getChecklistScore(checklist = {}) {
  return CHECKLIST_ITEMS.reduce((score, item) => {
    const result = checklist[item.id] || {};
    if (result.notApplicable) return score;
    score.total += 1;
    if (result.checked) score.checked += 1;
    return score;
  }, { checked: 0, total: 0 });
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
    ? data.map((draw) => {
      const score = getChecklistScore(draw.checklist);
      return `
      <article class="result-card">
        <div>
          <strong>${draw.selected_phone}</strong>
          <small>${employeeById[draw.winner_employee_id] || 'Сотрудник не найден'} · ${new Date(draw.drawn_at).toLocaleString('ru-RU')}</small>
          <span class="result-score">Присутствует: ${score.checked} из ${score.total}</span>
        </div>
        <div class="result-checks">${renderChecklistResult(draw.checklist)}</div>
      </article>
    `;
    }).join('')
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
