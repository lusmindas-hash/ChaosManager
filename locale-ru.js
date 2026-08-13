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
  const left = page.querySelector('.dashboard-grid > .stack');
  const todayPanel = left?.querySelectorAll('.panel')[1];
  if (todayPanel) {
    todayPanel.classList.add('today-timeline');
    const timelineTasks = state.tasks.filter(task => task.dueDate === today()).slice(0, 7);
    const groups = [
      { label: 'Утро', icon: 'sunrise', className: 'morning', tasks: timelineTasks.filter((task, index) => (task.time && task.time < '11:00') || (!task.time && index % 3 === 0)) },
      { label: 'День', icon: 'sun', className: 'afternoon', tasks: timelineTasks.filter((task, index) => (task.time >= '11:00' && task.time < '17:00') || (!task.time && index % 3 !== 0)) },
      { label: 'Вечер', icon: 'moon-star', className: 'evening', tasks: timelineTasks.filter(task => task.time >= '17:00') }
    ].filter(group => group.tasks.length);
    todayPanel.innerHTML = `<div class="panel-head"><h2><i data-lucide="calendar-days"></i>Сегодня</h2><span class="meta">${timelineTasks.filter(task => task.completed).length} выполнено</span></div><div class="timeline-groups">${groups.map(group => `<div class="timeline-group ${group.className}"><div class="time-label"><i data-lucide="${group.icon}"></i><span>${group.label}</span></div><div class="time-tasks">${group.tasks.map(task => taskRow(task, false)).join('')}</div></div>`).join('')}</div><button class="timeline-add" data-add-type="task"><i data-lucide="plus"></i>Добавить задачу</button>`;
  }
  left?.insertAdjacentHTML('beforeend', `<div class="daily-note"><i data-lucide="sparkles"></i><span>Маленькие шаги каждый день приводят к большим результатам.</span><i data-lucide="heart"></i></div>`);
  icon();
}

const baseRender = render;
render = function renderRussianTheme() {
  baseRender();
  decorateToday();
};
render();
