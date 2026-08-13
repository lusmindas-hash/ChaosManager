const russianDemo = new Map([
  ['Portfolio launch', 'Запуск портфолио'],
  ['Collect the best work and finally share it with the world.', 'Собрать лучшие работы и наконец показать их миру.'],
  ['Home refresh', 'Дом и уют'],
  ['Small changes, no rush.', 'Небольшие перемены без спешки.'],
  ['September trip', 'Путешествие'],
  ['Plan the September getaway.', 'Спланировать сентябрьскую поездку.'],
  ['Choose work for the portfolio', 'Выбрать работы для портфолио'],
  ['Reply to important emails', 'Ответить на важные письма'],
  ['Book the hotel', 'Забронировать отель'],
  ['Buy a desk lamp', 'Купить лампу для рабочего стола'],
  ['Call about the Spanish course', 'Позвонить насчёт курса по испанскому'],
  ['Watch the composition lecture', 'Посмотреть лекцию про композицию'],
  ['Project sync', 'Созвон по проекту'],
  ['Discuss the final structure', 'Обсудить финальную структуру'],
  ['Read for 20 minutes', '20 минут чтения'],
  ['Take a walk', 'Прогулка'],
  ['Morning glass of water', 'Стакан воды утром'],
  ['A quiet morning and a really good coffee.', 'За спокойное утро и вкусный кофе.']
]);

state.settings.name = 'Людмила';
for (const collection of [state.projects, state.tasks, state.inbox, state.events, state.habits, state.gratitude]) {
  for (const item of collection) {
    for (const key of ['title', 'description', 'text']) {
      if (russianDemo.has(item[key])) item[key] = russianDemo.get(item[key]);
    }
  }
}
const referenceTasks = [
  { title: 'Подготовиться к созвону с командой', time: '14:30', priority: 'medium', projectId: 'p1' },
  { title: 'Спланировать контент на неделю', time: '09:30', priority: 'low', projectId: 'p1' },
  { title: 'Тренировка', time: '19:00', priority: 'low', projectId: '' }
];
for (const task of referenceTasks) {
  if (task.projectId && !state.projects.some(project => project.id === task.projectId)) continue;
  if (!state.tasks.some(item => item.title === task.title)) {
    state.tasks.push({ id: uid(), ...task, completed: false, dueDate: today(), createdAt: Date.now() });
  }
}
save();

function decorateToday() {
  if (view !== 'today') return;
  const page = document.querySelector('#app .page');
  const header = page?.querySelector('.page-header');
  const side = page?.querySelector('.dashboard-grid > aside');
  if (!page || !header || !side) return;
  page.classList.add('reference-today');
  const tasks = state.tasks.filter(task => task.dueDate === today());
  const completed = tasks.filter(task => task.completed).length;
  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  header.insertAdjacentHTML('beforeend', `<div class="hero-portrait" role="img" aria-label="Портрет Людмилы"></div><div class="header-tools" aria-hidden="true"><i data-lucide="search"></i><i data-lucide="bell"></i></div>`);
  side.insertAdjacentHTML('afterbegin', `<section class="panel day-progress"><div class="panel-head"><h2><i data-lucide="chart-no-axes-column-increasing"></i>Прогресс дня</h2></div><div class="progress-overview"><div class="progress-ring" style="--progress:${percent}"><svg viewBox="0 0 44 44" aria-label="Выполнено ${percent}%"><circle cx="22" cy="22" r="18"></circle><circle class="ring-value" cx="22" cy="22" r="18" pathLength="100" style="stroke-dasharray:${percent} 100"></circle></svg><strong>${percent}%</strong></div><div><b>${completed} из ${tasks.length} выполнено</b><span>Маленькие шаги тоже считаются.</span></div></div></section>`);
  const upcomingPanel = side.querySelectorAll('.panel')[1];
  const now = new Date();
  const futureEvent = [...state.events]
    .map(item => ({ ...item, startsAt: new Date(`${item.date}T${item.startTime || '23:59'}:00`) }))
    .filter(item => item.startsAt >= now)
    .sort((a, b) => a.startsAt - b.startsAt)[0];
  const latestTodayEvent = [...state.events]
    .filter(item => item.date === today())
    .sort((a, b) => (b.startTime || '').localeCompare(a.startTime || ''))[0];
  const upcomingEvent = futureEvent || (latestTodayEvent ? { ...latestTodayEvent, startsAt: new Date(`${latestTodayEvent.date}T${latestTodayEvent.startTime || '23:59'}:00`) } : null);
  if (upcomingPanel) {
    if (upcomingEvent) {
      const isTodayEvent = upcomingEvent.date === today();
      const dateLabel = isTodayEvent ? 'Сегодня' : upcomingEvent.startsAt.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
      upcomingPanel.innerHTML = `<div class="panel-head"><h2>Дальше</h2><i data-lucide="clock-3"></i></div><div class="event"><span class="next-event-date">${dateLabel}</span><strong>${upcomingEvent.startTime || 'Весь день'} — ${esc(upcomingEvent.title)}</strong>${upcomingEvent.description ? `<span class="meta">${esc(upcomingEvent.description)}</span>` : ''}</div>`;
    } else {
      upcomingPanel.innerHTML = `<div class="panel-head"><h2>Дальше</h2><i data-lucide="clock-3"></i></div><p class="muted">В календаре пока нет предстоящих событий.</p>`;
    }
  }
  const left = page.querySelector('.dashboard-grid > .stack');
  let todayPanel = left?.querySelectorAll('.panel')[1];
  if (!todayPanel && left) {
    left.insertAdjacentHTML('beforeend', '<section class="panel today-timeline"></section>');
    todayPanel = left.querySelector('.today-timeline');
  }
  if (todayPanel) {
    todayPanel.classList.add('today-timeline');
    const timelineTasks = state.tasks
      .filter(task => task.dueDate === today())
      .sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return a.createdAt - b.createdAt;
      })
      .slice(0, 7);
    const groups = [
      { label: 'Утро', icon: 'sunrise', className: 'morning', tasks: timelineTasks.filter(task => task.time && task.time < '12:00') },
      { label: 'День', icon: 'sun', className: 'afternoon', tasks: timelineTasks.filter(task => task.time >= '12:00' && task.time < '17:00') },
      { label: 'Вечер', icon: 'moon-star', className: 'evening', tasks: timelineTasks.filter(task => task.time >= '17:00') }
      ,{ label: 'Без времени', icon: 'list-todo', className: 'anytime', tasks: timelineTasks.filter(task => !task.time) }
    ].filter(group => group.tasks.length);
    todayPanel.innerHTML = `<div class="panel-head"><h2><i data-lucide="calendar-days"></i>Сегодня</h2><span class="meta">${timelineTasks.filter(task => task.completed).length} выполнено</span></div>${groups.length ? `<div class="timeline-groups">${groups.map(group => `<div class="timeline-group ${group.className}"><div class="time-label"><i data-lucide="${group.icon}"></i><span>${group.label}</span></div><div class="time-tasks">${group.tasks.map(task => taskRow(task, false)).join('')}</div></div>`).join('')}</div>` : '<div class="timeline-empty"><i data-lucide="calendar-check"></i><strong>На сегодня пока ничего нет</strong><span>Добавь задачу, и она появится в планере.</span></div>'}<button class="timeline-add" data-add-type="task"><i data-lucide="plus"></i>Добавить задачу</button>`;
  }
  left?.insertAdjacentHTML('beforeend', `<div class="daily-note"><i data-lucide="sparkles"></i><span>Маленькие шаги каждый день приводят к большим результатам.</span><i data-lucide="heart"></i></div>`);
  icon();
}

function decorateProject() {
  if (!view.startsWith('project/')) return;
  const projectId = view.split('/')[1];
  const currentProject = state.projects.find(item => item.id === projectId);
  const actions = document.querySelector('#app .page-header .header-actions');
  if (!currentProject || !actions || actions.querySelector('[data-delete-project]')) return;
  actions.insertAdjacentHTML('beforeend', `<button class="project-delete-button" data-delete-project="${currentProject.id}"><i data-lucide="trash-2"></i>Удалить проект</button>`);
  icon();
}

function decorateProjectList() {
  if (view !== 'projects') return;
  document.querySelectorAll('#app .project-card[data-project]').forEach(card => {
    if (card.querySelector('[data-delete-project]')) return;
    const projectId = card.dataset.project;
    const currentProject = state.projects.find(item => item.id === projectId);
    if (!currentProject) return;
    card.insertAdjacentHTML('beforeend', `<button class="project-card-delete" data-delete-project="${projectId}" aria-label="Удалить проект ${esc(currentProject.title)}" title="Удалить проект"><i data-lucide="trash-2"></i></button>`);
  });
  icon();
}

habitsView = function habitsViewWithDelete() {
  const dates = weekDates();
  return `<section class="page">${header('Привычки','Небольшие повторения, на которых держатся хорошие недели.',`<button class="primary-btn" data-add-type="habit"><i data-lucide="plus"></i>Новая привычка</button>`)}<section class="panel habit-table"><div class="habit-grid habit-grid-actions"><b>Текущая неделя</b>${dates.map(date => `<span class="meta habit-day-label">${['ВС','ПН','ВТ','СР','ЧТ','ПТ','СБ'][date.getDay()]}</span>`).join('')}<b class="meta">Ритм</b><span></span>${state.habits.map(habit => `<strong class="habit-name">${esc(habit.title)}</strong>${dates.map(date => { const dateString = localDateKey(date); const done = isHabitDone(habit.id,dateString); return `<button class="day-check ${done?'done':''}" data-habit="${habit.id}" data-date="${dateString}" aria-label="Отметить ${esc(habit.title)}">${done?'<i data-lucide="check"></i>':''}</button>`; }).join('')}<span class="meta">${habitWeekPercent(habit.id,dates)}% · ${streak(habit.id)} дн.</span><button class="habit-delete" data-delete-habit="${habit.id}" aria-label="Удалить привычку ${esc(habit.title)}" title="Удалить привычку"><i data-lucide="trash-2"></i></button>`).join('')}</div></section></section>`;
};

document.addEventListener('click', event => {
  const button = event.target.closest('[data-delete-habit]');
  if (!button) return;
  const habit = state.habits.find(item => item.id === button.dataset.deleteHabit);
  if (!habit || !confirm(`Удалить привычку «${habit.title}» вместе со всеми отметками?`)) return;
  state.habits = state.habits.filter(item => item.id !== habit.id);
  delete state.habitCompletions[habit.id];
  save();
  render();
  toast('Привычка удалена');
});

function openDayPanel(date) {
  const events = state.events.filter(item => item.date === date).sort((a,b) => a.startTime.localeCompare(b.startTime));
  const tasks = state.tasks.filter(item => item.dueDate === date);
  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop"><div class="modal day-modal" role="dialog" aria-modal="true" aria-labelledby="day-title"><div class="modal-head"><div><p class="eyebrow">Календарь</p><h2 id="day-title">${formattedDate}</h2></div><button class="icon-btn" data-close aria-label="Закрыть"><i data-lucide="x"></i></button></div><div class="modal-body"><section class="day-section"><div class="day-section-head"><h3>События</h3><button class="day-add-link" data-day-add-event="${date}"><i data-lucide="plus"></i>Событие</button></div>${events.length ? events.map(item => `<article class="day-event-row"><div class="day-event-time">${item.startTime || 'Весь день'}</div><div class="day-event-copy"><strong>${esc(item.title)}</strong>${item.description ? `<span>${esc(item.description)}</span>` : ''}</div><button class="event-delete" data-delete-event="${item.id}" aria-label="Удалить событие ${esc(item.title)}" title="Удалить событие"><i data-lucide="trash-2"></i></button></article>`).join('') : `<div class="day-empty">На этот день событий нет.</div>`}</section><section class="day-section"><div class="day-section-head"><h3>Задачи</h3><button class="day-add-link" data-day-add-task="${date}"><i data-lucide="plus"></i>Задача</button></div>${tasks.length ? tasks.map(item => `<div class="day-task-row"><span class="check ${item.completed?'done':''}">${item.completed?'<i data-lucide="check"></i>':''}</span><div><strong>${esc(item.title)}</strong>${item.time?`<span>${item.time}</span>`:''}</div></div>`).join('') : `<div class="day-empty">Задач пока нет.</div>`}</section></div></div></div>`;
  icon();
}

document.addEventListener('click', event => {
  const day = event.target.closest('[data-day]');
  if (day) {
    event.preventDefault();
    event.stopPropagation();
    openDayPanel(day.dataset.day);
    return;
  }
  const addEvent = event.target.closest('[data-day-add-event]');
  if (addEvent) {
    event.preventDefault();
    event.stopPropagation();
    openModal('event', { date: addEvent.dataset.dayAddEvent });
    return;
  }
  const addTask = event.target.closest('[data-day-add-task]');
  if (addTask) {
    event.preventDefault();
    event.stopPropagation();
    openModal('task', { date: addTask.dataset.dayAddTask });
    return;
  }
  const deleteButton = event.target.closest('[data-delete-event]');
  if (!deleteButton) return;
  event.preventDefault();
  event.stopPropagation();
  const calendarEvent = state.events.find(item => item.id === deleteButton.dataset.deleteEvent);
  if (!calendarEvent || !confirm(`Удалить событие «${calendarEvent.title}»?`)) return;
  const date = calendarEvent.date;
  state.events = state.events.filter(item => item.id !== calendarEvent.id);
  save();
  openDayPanel(date);
  toast('Событие удалено');
}, true);

document.addEventListener('click', event => {
  const button = event.target.closest('[data-delete-project]');
  if (!button) return;
  const currentProject = state.projects.find(item => item.id === button.dataset.deleteProject);
  if (!currentProject) return;
  const taskCount = state.tasks.filter(item => item.projectId === currentProject.id).length;
  const message = taskCount
    ? `Удалить проект «${currentProject.title}» и все связанные задачи (${taskCount})? Это действие нельзя отменить.`
    : `Удалить проект «${currentProject.title}»? Это действие нельзя отменить.`;
  if (!confirm(message)) return;
  state.projects = state.projects.filter(item => item.id !== currentProject.id);
  state.tasks = state.tasks.filter(item => item.projectId !== currentProject.id);
  state.events = state.events.map(item => item.projectId === currentProject.id ? { ...item, projectId: '' } : item);
  save();
  view = 'projects';
  location.hash = 'projects';
  render();
  toast('Проект полностью удалён');
});

const baseOpenModal = openModal;
openModal = function openModalWithSchedule(type = 'inbox', defaults = {}) {
  baseOpenModal(type, defaults);
  if (type !== 'event') return;
  const startDate = document.querySelector('#f-date')?.value || today();
  const endDate = new Date(`${startDate}T12:00:00`);
  endDate.setFullYear(endDate.getFullYear() + 1);
  const actions = document.querySelector('#add-form .modal-actions');
  actions?.insertAdjacentHTML('beforebegin', `<div class="schedule-fields"><div class="field"><label>Повторять</label><select id="f-repeat"><option value="none">Не повторять</option><option value="weekly">Каждую неделю</option></select></div><div class="field repeat-until-field" hidden><label>Расписание до</label><input id="f-repeat-until" type="date" value="${localDateKey(endDate)}" min="${startDate}" max="${localDateKey(endDate)}"></div><p class="schedule-hint" hidden>Будут созданы занятия на этот день недели, максимум на год вперёд.</p></div>`);
};

document.addEventListener('change', event => {
  if (event.target.id !== 'f-repeat') return;
  const isWeekly = event.target.value === 'weekly';
  document.querySelector('.repeat-until-field')?.toggleAttribute('hidden', !isWeekly);
  document.querySelector('.schedule-hint')?.toggleAttribute('hidden', !isWeekly);
});

const baseSubmitForm = submitForm;
submitForm = function submitFormWithSchedule(form) {
  const isWeeklyEvent = form.dataset.type === 'event' && value('f-repeat') === 'weekly';
  const eventData = isWeeklyEvent ? {
    title: value('f-title').trim(),
    date: value('f-date'),
    startTime: value('f-time'),
    description: value('f-description'),
    until: value('f-repeat-until')
  } : null;
  baseSubmitForm(form);
  if (!eventData?.title || !eventData.date || !eventData.until) return;
  const seriesId = uid();
  const original = state.events.findLast ? state.events.findLast(item => item.title === eventData.title && item.date === eventData.date && item.startTime === eventData.startTime) : [...state.events].reverse().find(item => item.title === eventData.title && item.date === eventData.date && item.startTime === eventData.startTime);
  if (original) original.seriesId = seriesId;
  const cursor = new Date(`${eventData.date}T12:00:00`);
  const requestedEnd = new Date(`${eventData.until}T12:00:00`);
  const maximumEnd = new Date(cursor);
  maximumEnd.setFullYear(maximumEnd.getFullYear() + 1);
  const end = requestedEnd < maximumEnd ? requestedEnd : maximumEnd;
  let created = 1;
  cursor.setDate(cursor.getDate() + 7);
  while (cursor <= end) {
    state.events.push({ id: uid(), title: eventData.title, date: localDateKey(cursor), startTime: eventData.startTime, endTime: '', description: eventData.description, projectId: '', seriesId });
    created++;
    cursor.setDate(cursor.getDate() + 7);
  }
  save();
  render();
  toast(`Расписание добавлено: ${created} занятий`);
};

const baseRender = render;
render = function renderRussianTheme() {
  baseRender();
  decorateToday();
  decorateProject();
  decorateProjectList();
};
render();
