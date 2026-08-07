import { createClient } from './supabase-client.js';

const SUPABASE_URL = window.BORK_SUPABASE_URL || window.NEXT_PUBLIC_SUPABASE_URL || 'https://mhtbolnovisgdliphsmf.supabase.co';
const SUPABASE_ANON_KEY = window.BORK_SUPABASE_ANON_KEY || window.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odGJvbG5vdmlzZ2RsaXBoc21mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4Mjk1OTYsImV4cCI6MjA2NzQwNTU5Nn0.ureoaGoJ9Dsp6bRAGmqA9x0his3eRamYGs6fOXQOmB0';
const TABLE_ENTRIES = 'roulette_phone_entries';
const TABLE_DRAWS = 'roulette_draws';
const EMPLOYEES_TABLE = 'employees';
const OFFICE_SHIFTS_TABLE = window.BORK_OFFICE_SHIFTS_TABLE || 'office_shifts';
const WORKING_EMPLOYEES_RPC = 'get_roulette_working_employees';
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
const state = { employees: [], allEmployees: [], currentWinner: null, selectedDate: new Date(), calendarMonth: new Date(), rouletteUnlocked: sessionStorage.getItem('borkRouletteUnlocked') === 'true', pendingProtectedTab: 'randomizer', savePopupTimer: null };

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
const showToast = (message, type = '') => {
  $('toast').textContent = message;
  $('toast').className = `toast ${type}`;
};
const setStatus = (message, type = '') => { $('connectionStatus').textContent = message; $('connectionStatus').className = `status ${type}`; };

function showSavePopup(message, type = 'success') {
  const popup = $('savePopup');
  popup.textContent = message;
  popup.className = `save-popup ${type}`;
  popup.hidden = false;
  const phoneRect = $('phoneInput').getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const margin = 12;
  const left = Math.min(
    Math.max(margin, phoneRect.left + (phoneRect.width / 2) - (popupRect.width / 2)),
    window.innerWidth - popupRect.width - margin,
  );
  const top = Math.max(margin, phoneRect.top - popupRect.height - 10);
  popup.style.setProperty('--save-popup-left', `${left}px`);
  popup.style.setProperty('--save-popup-top', `${top}px`);
  clearTimeout(state.savePopupTimer);
  state.savePopupTimer = setTimeout(() => {
    popup.hidden = true;
  }, 3200);
}

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
  // Фильтруем роль на клиенте: так записи не исчезнут из-за регистра или
  // случайных пробелов в Position, добавленных через Table Editor. Второй
  // запрос поддерживает проекты, где столбец был переименован в position.
  let { data, error } = await supabase.from(EMPLOYEES_TABLE).select('id,name,Position').order('name');
  if (error?.code === '42703' || error?.code === 'PGRST204') {
    ({ data, error } = await supabase.from(EMPLOYEES_TABLE).select('id,name,position').order('name'));
  }
  if (error?.code === '42501' || /permission denied/i.test(error?.message || '')) {
    ({ data, error } = await supabase.rpc('get_roulette_employees'));
  }
  if (error?.code === 'PGRST202' || /get_roulette_employees.*schema cache/i.test(error?.message || '')) {
    throw new Error('Supabase не настроен: выполните актуальный supabase.sql в SQL Editor и обновите страницу');
  }
  if (error) throw error;
  state.allEmployees = (data || []).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const expectedPosition = DRAW_POSITION.toLocaleLowerCase('en-US');
  state.employees = state.allEmployees.filter((employee) =>
    String(employee.Position ?? employee.position ?? employee.role ?? '').trim().toLocaleLowerCase('en-US') === expectedPosition);
  if (!state.employees.length) {
    throw new Error(`В employees не найдено сотрудников с Position = "${DRAW_POSITION}"`);
  }
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

function requestDuplicateAction(existingEntries, entryDate) {
  return new Promise((resolve) => {
    const dialog = $('duplicateDialog');
    const summary = $('duplicateSummary');
    const firstPhone = existingEntries[0]?.phone || 'номер уже внесен';
    summary.textContent = `На ${toRuDate(entryDate)} уже есть запись: ${firstPhone}. Что сделать с новым номером?`;

    const buttons = [...dialog.querySelectorAll('[data-duplicate-action]')];
    const finish = (action) => {
      buttons.forEach((button) => button.removeEventListener('click', onClick));
      dialog.hidden = true;
      resolve(action);
    };
    const onClick = (event) => finish(event.currentTarget.dataset.duplicateAction);

    buttons.forEach((button) => button.addEventListener('click', onClick));
    dialog.hidden = false;
  });
}

async function saveEntry(event) {
  event.preventDefault();
  const employeeId = $('employeeSelect').value;
  const phone = $('phoneInput').value.trim();
  const entryDate = $('dateIsoInput').value;
  const submitButton = event.submitter || event.currentTarget.querySelector('button[type="submit"]');
  if (!employeeId) return showToast('Выберите сотрудника', 'warning');
  if (!phone) return showToast('Введите номер телефона', 'warning');
  if (!entryDate) return showToast('Выберите дату');

  if (submitButton) submitButton.disabled = true;
  try {
    const { data: existingEntries, error: duplicateError } = await supabase
      .from(TABLE_ENTRIES)
      .select('id,phone,created_at')
      .eq('employee_id', employeeId)
      .eq('entry_date', entryDate)
      .order('created_at', { ascending: false });
    if (duplicateError) return showToast(`Ошибка проверки дубля: ${duplicateError.message}`, 'error');

    let saveAction = 'append';
    if (existingEntries?.length) {
      saveAction = await requestDuplicateAction(existingEntries, entryDate);
      if (saveAction === 'cancel') {
        showToast('Ваш номер уже внесен на эту дату. Сохранение отменено.', 'warning');
        return;
      }
    }

    const { error } = saveAction === 'overwrite'
      ? await supabase.from(TABLE_ENTRIES).eq('id', existingEntries[0].id).update({ phone })
      : await supabase.from(TABLE_ENTRIES).insert({ employee_id: employeeId, phone, entry_date: entryDate });
    if (error) return showToast(`Ошибка сохранения: ${error.message}`, 'error');
    $('phoneInput').value = '';
    document.querySelector('#entryPanel .card')?.classList.add('save-success');
    setTimeout(() => document.querySelector('#entryPanel .card')?.classList.remove('save-success'), 1800);
    const resultText = saveAction === 'overwrite' ? '✅ Номер перезаписан' : '✅ Номер сохранен';
    showToast(`${resultText}: ${phone} · ${toRuDate(entryDate)}`, 'success');
    showSavePopup(`${resultText}: ${phone}`);
    await loadDrawDates();
    await renderStats();
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function renderStats() {
  if (!state.rouletteUnlocked) return;
  const date = $('statsDateSelect').value || toLocalIso(new Date());
  if (!date) return;
  const [entriesResult, scheduleResult] = await Promise.all([
    supabase.from(TABLE_ENTRIES).select('employee_id,phone').eq('entry_date', date),
    loadWorkingEmployees(date),
  ]);
  if (entriesResult.error) {
    showToast(`Ошибка статистики: ${entriesResult.error.message}`);
    return;
  }

  const filledByEmployee = (entriesResult.data || []).reduce((acc, entry) => {
    if (!acc[entry.employee_id]) acc[entry.employee_id] = [];
    acc[entry.employee_id].push(entry.phone);
    return acc;
  }, {});
  const filled = state.employees.filter((employee) => filledByEmployee[employee.id]);
  const workingIds = new Set((scheduleResult.data || []).map((row) => row.employee_id));
  // Если кто-то уже отправил номер, но график вернул ноль сотрудников, ответ
  // графика нельзя считать достоверным и тем более писать «все заполнили».
  const scheduleAvailable = !scheduleResult.error && (workingIds.size > 0 || filled.length === 0);
  const working = scheduleAvailable
    ? state.employees.filter((employee) => workingIds.has(employee.id))
    : [];
  const missing = working.filter((employee) => !filledByEmployee[employee.id]);

  $('statsSummary').innerHTML = scheduleAvailable
    ? `<span>Заполнили: ${filled.length}</span><span>Работали: ${working.length}</span><span>Не заполнили из работавших: ${missing.length}</span>`
    : `<span>Заполнили: ${filled.length}</span><span>График недоступен</span>`;
  $('filledList').innerHTML = filled.length
    ? filled.map((employee) => `<article class="person filled"><strong>${employee.name}</strong><small>${filledByEmployee[employee.id].join(', ')}</small></article>`).join('')
    : '<p class="empty-state">Пока никто не заполнил.</p>';
  $('missingList').innerHTML = !scheduleAvailable
    ? `<p class="empty-state">Не удалось прочитать график. Без графика список не показывается, чтобы не отметить выходных как не заполнивших.<br><small>Причина: ${scheduleResult.error?.message || 'за выбранную дату график вернул 0 сотрудников'}</small></p>`
    : missing.length
      ? missing.map((employee) => `<article class="person missing"><strong>${employee.name}</strong></article>`).join('')
      : '<p class="empty-state">Все работавшие сотрудники заполнили.</p>';
}

const MISSING_COLUMN_CODES = new Set(['42703', 'PGRST204']);
const NON_WORKING_SHIFT_VALUES = new Set([
  'off', 'day off', 'weekend', 'vacation', 'sick',
  'выходной', 'вых', 'в', 'отпуск', 'о', 'больничный', 'б', 'не работает',
  '', '-', '—', '0', 'false', 'нет',
]);

function normalizeScheduleValue(value) {
  return String(value ?? '').trim().toLocaleLowerCase('ru');
}

function normalizePersonName(value) {
  return String(value ?? '')
    .toLocaleLowerCase('ru')
    .replaceAll('ё', 'е')
    .replace(/[^а-яa-z\s-]/gi, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

function findEmployeeByReference(value) {
  const reference = String(value ?? '').trim();
  if (!reference) return null;
  const byId = state.allEmployees.find((employee) => employee.id === reference);
  if (byId) return byId;
  const normalizedName = normalizePersonName(reference);
  return state.allEmployees.find((employee) => normalizePersonName(employee.name) === normalizedName) || null;
}

function detectEmployeeColumn(rows) {
  const columns = ['col1', 'col2', 'col3', 'col4', 'col5', 'col6'];
  const result = columns
    .map((column) => ({ column, matches: rows.filter((row) => findEmployeeByReference(row[column])).length }))
    .sort((a, b) => b.matches - a.matches)[0];
  return result?.matches ? result.column : null;
}

function normalizeColumnMatrixShifts(rows, date) {
  const weekDay = fromIsoDate(date).getDay();
  if (weekDay < 1 || weekDay > 5) return [];

  const columns = ['col1', 'col2', 'col3', 'col4', 'col5', 'col6'];
  const employeeColumn = detectEmployeeColumn(rows);
  if (!employeeColumn) return [];

  const weekdayColumns = columns.filter((column) => column !== employeeColumn);
  const shiftColumn = weekdayColumns[weekDay - 1];
  const workingRows = rows
    .filter((row) => !NON_WORKING_SHIFT_VALUES.has(normalizeScheduleValue(row[shiftColumn])))
    .map((row) => {
      const employee = findEmployeeByReference(row[employeeColumn]);
      return { employee_id: employee?.id, status: row[shiftColumn] };
    });
  return normalizeWorkingShifts(workingRows);
}

function normalizeGenericColumnRows(rows) {
  const employeeColumn = detectEmployeeColumn(rows);
  if (!employeeColumn) return [];
  return normalizeWorkingShifts(rows.map((row) => ({
    employee_id: findEmployeeByReference(row[employeeColumn])?.id,
    status: 'working',
  })));
}

function normalizeWorkingShifts(rows) {
  const ids = new Set();
  rows.forEach((row) => {
    const nestedEmployee = row.employee && typeof row.employee === 'object' ? row.employee : null;
    const rawEmployee = typeof row.employee === 'string' ? row.employee.trim() : '';
    const employeeName = String(row.employee_name ?? nestedEmployee?.name ?? row.full_name ?? row.name ?? rawEmployee).trim();
    const matchedEmployee = findEmployeeByReference(employeeName);
    const employeeStringId = state.allEmployees.some((employee) => employee.id === rawEmployee) ? rawEmployee : null;
    const employeeId = row.employee_id ?? row.consultant_id ?? row.user_id ?? row.staff_id
      ?? nestedEmployee?.id ?? employeeStringId ?? matchedEmployee?.id;
    const status = String(row.status ?? row.shift_type ?? row.type ?? 'working').trim().toLocaleLowerCase('ru');
    const isWorking = String(row.is_working ?? 'true').trim().toLocaleLowerCase('en-US');
    if (employeeId && !NON_WORKING_SHIFT_VALUES.has(status) && !['false', '0', 'no'].includes(isWorking)) {
      ids.add(employeeId);
    }
  });
  return [...ids].map((employeeId) => ({ employee_id: employeeId }));
}

function scheduleRowContainsDate(row, date) {
  const [year, month, day] = date.split('-');
  const ruDate = toRuDate(date);
  const variants = [
    date,
    `${year}/${month}/${day}`,
    `${year}.${month}.${day}`,
    `${year}_${month}_${day}`,
    ruDate,
    ruDate.replaceAll('-', '.'),
    ruDate.replaceAll('-', '/'),
    ruDate.replaceAll('-', '_'),
  ];
  const serialized = JSON.stringify(row);
  if (variants.some((variant) => serialized.includes(variant))) return true;

  // Месячные графики часто хранят месяц отдельно, а номер дня — ключом JSON.
  const monthVariants = [`${year}-${month}`, `${year}/${month}`, `${year}.${month}`, `${year}_${month}`];
  const numericDay = String(Number(day));
  if (monthVariants.some((variant) => serialized.includes(variant)) && serialized.includes(`"${numericDay}"`)) return true;

  // Поддерживаем Unix timestamp в секундах и миллисекундах.
  const start = fromIsoDate(date).getTime();
  const end = start + 86400000;
  return Object.values(row).some((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return false;
    if (numeric >= 20000 && numeric <= 80000) {
      const excelMilliseconds = Math.round((numeric - 25569) * 86400000);
      return excelMilliseconds >= start && excelMilliseconds < end;
    }
    const milliseconds = numeric > 100000000000 ? numeric : numeric * 1000;
    return milliseconds >= start && milliseconds < end;
  });
}

function describeScheduleRows(rows) {
  if (!rows.length) return `Таблица ${OFFICE_SHIFTS_TABLE} доступна, но в ней нет строк`;
  const keys = [...new Set(rows.slice(0, 5).flatMap((row) => Object.keys(row)))].slice(0, 20);
  const dateSamples = JSON.stringify(rows.slice(0, 20)).match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/g) || [];
  const samples = [...new Set(dateSamples)].slice(0, 5);
  const matrixSample = rows.slice(0, 2).map((row) =>
    ['col1', 'col2', 'col3', 'col4', 'col5', 'col6']
      .filter((key) => key in row)
      .map((key) => `${key}=${String(row[key] ?? '').slice(0, 28)}`)
      .join(', ')).filter(Boolean).join(' | ');
  return `Прочитано строк: ${rows.length}. Поля: ${keys.join(', ') || 'не определены'}. Примеры дат: ${samples.join(', ') || 'не найдены'}. Пример матрицы: ${matrixSample || 'нет'}`;
}

async function loadWorkingEmployees(date) {
  const rpcResult = await supabase.rpc(WORKING_EMPLOYEES_RPC, { p_work_date: date });
  if (!rpcResult.error && rpcResult.data?.length) return rpcResult;

  // Пустой ответ RPC также перепроверяем напрямую: он может означать, что дата
  // хранится как timestamp или что приложение графика использует другое имя поля.
  const dateColumns = ['shift_date', 'date', 'work_date', 'day', 'start_at', 'starts_at'];
  const nextDate = fromIsoDate(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateIso = toLocalIso(nextDate);
  let directError = null;
  for (const dateColumn of dateColumns) {
    const result = await supabase
      .from(OFFICE_SHIFTS_TABLE)
      .select('*')
      .gte(dateColumn, date)
      .lt(dateColumn, nextDateIso);
    if (!result.error && result.data?.length) {
      const normalized = normalizeWorkingShifts(result.data || []);
      if (result.data?.length && !normalized.length) {
        return { data: null, error: { message: 'В строках office_shifts не найден сотрудник' } };
      }
      return { data: normalized, error: null };
    }
    if (!result.error) continue;
    directError = result.error;
    if (!MISSING_COLUMN_CODES.has(result.error.code)) break;
  }

  // Последняя ступень поддерживает графики, где дни лежат внутри JSON/массива
  // или записаны как ДД-ММ-ГГГГ. Забираем строки и ищем дату во всей записи.
  const broadResult = await supabase.from(OFFICE_SHIFTS_TABLE).select('*');
  if (!broadResult.error) {
    const allRows = broadResult.data || [];
    const hasColumnMatrix = allRows.some((row) => ['col1', 'col2', 'col3', 'col4', 'col5', 'col6'].every((key) => key in row));
    if (hasColumnMatrix) {
      const matrixEmployees = normalizeColumnMatrixShifts(allRows, date);
      if (matrixEmployees.length) return { data: matrixEmployees, error: null };
    }
    const datedRows = allRows.filter((row) => scheduleRowContainsDate(row, date));
    const normalized = normalizeWorkingShifts(datedRows);
    const genericColumns = normalized.length ? normalized : normalizeGenericColumnRows(datedRows);
    if (genericColumns.length) return { data: genericColumns, error: null };
    return {
      data: null,
      error: { message: `За ${toRuDate(date)} рабочие строки не найдены. ${describeScheduleRows(allRows)}` },
    };
  }

  return {
    data: null,
    error: broadResult.error || directError || rpcResult.error || { message: 'График на выбранную дату не найден' },
  };
}

async function drawWinner() {
  if (!state.rouletteUnlocked) return requestRoulettePassword();
  const selectedPeriod = $('drawDateSelect').value;
  if (!selectedPeriod) return showToast('Выберите дату, где есть номера');
  const periodDates = selectedPeriod.split('|');
  const entriesQuery = supabase
    .from(TABLE_ENTRIES)
    .select('id,phone,entry_date,employee_id');
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
  const winnerEmployee = state.allEmployees.find((employee) => employee.id === winner.employee_id);
  $('winnerEmployee').textContent = winnerEmployee?.name || 'Сотрудник не найден';
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
  const employeeById = state.allEmployees.reduce((acc, employee) => {
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
  const startupTasks = [
    ['сотрудники', loadEmployees],
    ['даты номеров', loadDrawDates],
    ['результаты отборов', loadResultDates],
  ];
  const results = await Promise.allSettled(startupTasks.map(([, task]) => task()));
  const failures = results
    .map((result, index) => result.status === 'rejected'
      ? `${startupTasks[index][0]}: ${result.reason?.message || result.reason}`
      : null)
    .filter(Boolean);

  if (state.rouletteUnlocked && state.employees.length) {
    await Promise.allSettled([renderStats(), renderDrawResults()]);
  }

  if (failures.length) {
    setStatus('Подключено частично', 'error');
    showToast(`Ошибка загрузки — ${failures.join('; ')}`, 'error');
    return;
  }

  setStatus('Supabase подключен', 'ok');
  showToast(`Готово: сотрудники загружены (${state.employees.length}). ${todayRu()}`);
}

init();
