const focusDefaults = { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 4 };

function ensureFocusState() {
  state.focusSettings = { ...focusDefaults, ...(state.focusSettings || {}) };
  state.focusSessions ||= [];
  state.activeFocus ||= null;
  if (state.activeFocus?.taskId && !state.tasks.some(task => task.id === state.activeFocus.taskId)) {
    state.activeFocus.taskId = '';
    save();
  }
}

ensureFocusState();
let focusTicker = null;

function focusDuration(type) {
  const settings = state.focusSettings;
  return type === 'short-break' ? settings.shortBreakMinutes : type === 'long-break' ? settings.longBreakMinutes : settings.focusMinutes;
}

function focusRemaining() {
  const active = state.activeFocus;
  if (!active) return 0;
  if (active.status === 'running') return Math.max(0, Math.ceil((active.endAt - Date.now()) / 1000));
  return Math.max(0, active.remainingSeconds || 0);
}

function focusTask() {
  return state.tasks.find(task => task.id === state.activeFocus?.taskId);
}

function focusLabel(type = state.activeFocus?.type) {
  return type === 'short-break' ? 'Короткий перерыв' : type === 'long-break' ? 'Длинный перерыв' : 'Фокус';
}

function formatFocusTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function prepareFocus(taskId = '', type = 'focus') {
  const duration = focusDuration(type);
  state.activeFocus = { id: uid(), taskId, type, status: 'idle', durationMinutes: duration, remainingSeconds: duration * 60, startedAt: null, endAt: null };
  save();
  openFocusMode();
}

function startFocus() {
  const active = state.activeFocus;
  if (!active) return;
  const remaining = focusRemaining();
  active.status = 'running';
  active.startedAt ||= new Date().toISOString();
  active.endAt = Date.now() + remaining * 1000;
  save();
  startFocusTicker();
  renderFocusUI();
}

function pauseFocus() {
  const active = state.activeFocus;
  if (!active || active.status !== 'running') return;
  active.remainingSeconds = focusRemaining();
  active.status = 'paused';
  active.endAt = null;
  save();
  renderFocusUI();
}

function resumeFocus() { startFocus(); }

function stopFocus() {
  state.activeFocus = null;
  save();
  closeFocusMode();
  renderFocusUI();
  document.title = 'Chaos Manager';
}

function addFocusMinutes() {
  const active = state.activeFocus;
  if (!active) return;
  if (active.status === 'running') active.endAt += 5 * 60 * 1000;
  else active.remainingSeconds = focusRemaining() + 5 * 60;
  active.durationMinutes += 5;
  save();
  renderFocusUI();
}

function completeFocusSession() {
  const active = state.activeFocus;
  if (!active || active.status === 'completed') return;
  state.focusSessions.push({ id: active.id, taskId: active.taskId || undefined, startedAt: active.startedAt || new Date().toISOString(), completedAt: new Date().toISOString(), durationMinutes: active.durationMinutes, type: active.type, completed: true });
  active.status = 'completed';
  active.remainingSeconds = 0;
  active.endAt = null;
  save();
  toast(active.type === 'focus' ? 'Фокус-сессия завершена' : 'Перерыв завершён');
  openFocusMode();
  renderFocusUI();
}

function completedFocusCount() {
  return state.focusSessions.filter(session => session.type === 'focus' && session.completed).length;
}

function nextBreakType() {
  const count = completedFocusCount();
  return count > 0 && count % state.focusSettings.sessionsBeforeLongBreak === 0 ? 'long-break' : 'short-break';
}

function startFocusTicker() {
  clearInterval(focusTicker);
  focusTicker = setInterval(() => {
    const active = state.activeFocus;
    if (!active || active.status !== 'running') return renderFocusMiniAndTitle();
    if (focusRemaining() <= 0) completeFocusSession();
    else updateFocusTick();
  }, 1000);
}

function focusTodayMetric() {
  const sessions = state.focusSessions.filter(session => session.type === 'focus' && session.completedAt && localDateKey(new Date(session.completedAt)) === today());
  const total = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  if (!sessions.length) return 'пока 0 сессий';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${sessions.length} ${sessions.length === 1 ? 'сессия' : 'сессии'} · ${hours ? `${hours}ч ` : ''}${minutes ? `${minutes}м` : ''}`.trim();
}

function decorateFocusUI() {
  ensureFocusState();
  if (view === 'today') {
    const focusPanel = document.querySelector('.reference-today .dashboard-grid > .stack > .panel:first-child');
    const head = focusPanel?.querySelector('.panel-head');
    if (head && !head.querySelector('[data-focus-choose]')) head.insertAdjacentHTML('beforeend', `<button class="focus-head-button" data-focus-choose><i data-lucide="timer"></i>Фокус</button>`);
    focusPanel?.querySelectorAll('.task-row').forEach(row => {
      const checkbox = row.querySelector('[data-toggle-task]');
      if (!checkbox || row.querySelector('[data-focus-task]')) return;
      const taskId = checkbox.dataset.toggleTask;
      row.insertAdjacentHTML('beforeend', `<button class="focus-row-button" data-focus-task="${taskId}" aria-label="Начать фокус"><i data-lucide="play"></i><span>Фокус</span></button>`);
      if (state.activeFocus?.taskId === taskId && ['idle','running','paused'].includes(state.activeFocus.status)) row.classList.add('active-focus-task');
    });
    const progressPanel = document.querySelector('.day-progress .progress-overview > div:last-child');
    if (progressPanel && !progressPanel.querySelector('.focus-today-metric')) progressPanel.insertAdjacentHTML('beforeend', `<span class="focus-today-metric"><b>Фокус сегодня</b>${focusTodayMetric()}</span>`);
  }
  if (view === 'settings') decorateFocusSettings();
  renderFocusUI();
  icon();
}

function decorateFocusSettings() {
  const page = document.querySelector('#app .page');
  if (!page || page.querySelector('.focus-settings')) return;
  const settings = state.focusSettings;
  page.insertAdjacentHTML('beforeend', `<section class="panel focus-settings"><div class="panel-head"><div><h2>Фокус</h2><span class="meta">Настройки спокойных рабочих сессий.</span></div><i data-lucide="timer"></i></div><div class="focus-settings-grid"><label>Длительность фокуса<input data-focus-setting="focusMinutes" type="number" min="5" max="120" value="${settings.focusMinutes}"></label><label>Короткий перерыв<input data-focus-setting="shortBreakMinutes" type="number" min="1" max="30" value="${settings.shortBreakMinutes}"></label><label>Длинный перерыв<input data-focus-setting="longBreakMinutes" type="number" min="5" max="60" value="${settings.longBreakMinutes}"></label><label>Длинный перерыв после<input data-focus-setting="sessionsBeforeLongBreak" type="number" min="2" max="8" value="${settings.sessionsBeforeLongBreak}"></label></div><button class="soft-btn" data-reset-focus-settings><i data-lucide="rotate-ccw"></i>Сбросить настройки фокуса</button></section>`);
}

function focusChoiceModal() {
  const tasks = state.tasks.filter(task => task.dueDate === today() && !task.completed).slice(0, 3);
  document.querySelector('#focus-root').innerHTML = `<div class="focus-backdrop"><div class="focus-choice" role="dialog" aria-modal="true" aria-label="Выбор задачи для фокуса"><div class="focus-dialog-head"><div><span>Фокус</span><h2>На чём фокусируемся?</h2></div><button data-close-focus aria-label="Закрыть"><i data-lucide="x"></i></button></div><div class="focus-choice-list">${tasks.length ? tasks.map(task => `<button data-focus-task="${task.id}"><i data-lucide="circle"></i><span>${esc(task.title)}</span><i data-lucide="arrow-right"></i></button>`).join('') : '<p>На сегодня нет активных задач.</p>'}</div><button class="focus-without-task" data-focus-task="">Фокус без задачи</button></div></div>`;
  icon();
}

function openFocusMode() {
  if (!state.activeFocus) return focusChoiceModal();
  renderFocusModal();
  setTimeout(() => document.querySelector('.focus-dialog [data-focus-start],.focus-dialog [data-focus-pause],.focus-close')?.focus(), 20);
}

function closeFocusMode() { document.querySelector('#focus-root').innerHTML = ''; }

function renderFocusModal() {
  const root = document.querySelector('#focus-root');
  if (!root) return;
  const active = state.activeFocus;
  if (!active) return closeFocusMode();
  const remaining = focusRemaining();
  const total = Math.max(1, active.durationMinutes * 60);
  const progress = Math.min(100, Math.max(0, (1 - remaining / total) * 100));
  const task = focusTask();
  const project = task ? state.projects.find(item => item.id === task.projectId) : null;
  const completed = active.status === 'completed';
  const cycle = (completedFocusCount() % state.focusSettings.sessionsBeforeLongBreak) + 1;
  root.innerHTML = `<div class="focus-backdrop"><div class="focus-dialog" role="dialog" aria-modal="true" aria-label="Режим фокуса"><button class="focus-close" data-close-focus aria-label="Закрыть"><i data-lucide="x"></i></button>${completed ? `<div class="focus-complete"><span class="focus-kicker">${active.type === 'focus' ? 'Фокус-сессия завершена' : 'Перерыв завершён'}</span><h2>${active.type === 'focus' ? 'Как дела с задачей?' : 'Готовы продолжить?'}</h2>${task ? `<p>${esc(task.title)}</p>` : ''}<div class="focus-complete-actions">${active.type === 'focus' && task && !task.completed ? '<button class="focus-primary" data-focus-done><i data-lucide="check"></i>Готово</button>' : ''}<button class="focus-secondary" data-focus-again>Ещё один фокус</button>${active.type === 'focus' ? '<button class="focus-secondary" data-focus-break>Сделать перерыв</button>' : ''}</div></div>` : `<span class="focus-kicker">${active.type === 'focus' ? 'Сейчас только это' : focusLabel()}</span><h2>${active.type === 'focus' ? esc(task?.title || 'Фокус без задачи') : 'Время немного выдохнуть'}</h2>${project ? `<span class="focus-project">${esc(project.title)}</span>` : ''}<div class="focus-clock" style="--focus-progress:${progress}"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="53"></circle><circle class="focus-clock-value" cx="60" cy="60" r="53" pathLength="100" style="stroke-dasharray:${progress} 100"></circle></svg><time aria-label="Осталось ${formatFocusTime(remaining)}">${formatFocusTime(remaining)}</time></div><span class="focus-session-label">${active.type === 'focus' ? `Сессия ${cycle} из ${state.focusSettings.sessionsBeforeLongBreak}` : focusLabel()}</span><div class="focus-main-actions">${active.status === 'running' ? '<button class="focus-primary" data-focus-pause><i data-lucide="pause"></i>Пауза</button>' : `<button class="focus-primary" data-focus-start><i data-lucide="play"></i>${active.status === 'paused' ? 'Продолжить' : 'Начать'}</button>`}</div><div class="focus-minor-actions"><button data-focus-stop>Завершить</button><button data-focus-add>+5 мин</button></div><p class="focus-next-note">${active.type === 'focus' ? `После этой сессии — ${nextBreakType() === 'long-break' ? state.focusSettings.longBreakMinutes : state.focusSettings.shortBreakMinutes} минут отдыха.` : 'Следующая сессия — спокойный фокус.'}</p>`}</div></div>`;
  icon();
}

function renderMiniFocus() {
  const host = document.querySelector('#focus-mini');
  const active = state.activeFocus;
  if (!host) return;
  if (!active || !['running','paused'].includes(active.status)) { host.innerHTML = ''; return; }
  host.innerHTML = `<button class="focus-mini-pill" data-open-focus><span></span><b>${active.status === 'paused' ? 'Пауза' : focusLabel(active.type)}</b><time>${formatFocusTime(focusRemaining())}</time></button>`;
}

function renderFocusUI() {
  renderMiniFocus();
  if (document.querySelector('.focus-dialog')) renderFocusModal();
  renderFocusMiniAndTitle();
}

function renderFocusMiniAndTitle() {
  renderMiniFocus();
  const active = state.activeFocus;
  document.title = active && ['running','paused'].includes(active.status) ? `${formatFocusTime(focusRemaining())} · ${focusLabel(active.type)}` : 'Chaos Manager';
}

function updateFocusTick() {
  const active = state.activeFocus;
  const remaining = focusRemaining();
  const total = Math.max(1, (active?.durationMinutes || 1) * 60);
  const progress = Math.min(100, Math.max(0, (1 - remaining / total) * 100));
  const clock = document.querySelector('.focus-clock time');
  const ring = document.querySelector('.focus-clock-value');
  if (clock) { clock.textContent = formatFocusTime(remaining); clock.setAttribute('aria-label', `Осталось ${formatFocusTime(remaining)}`); }
  if (ring) ring.style.strokeDasharray = `${progress} 100`;
  renderFocusMiniAndTitle();
}

document.body.insertAdjacentHTML('beforeend', '<div id="focus-mini"></div><div id="focus-root"></div>');

document.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.hasAttribute('data-focus-choose')) focusChoiceModal();
  if (target.hasAttribute('data-focus-task')) prepareFocus(target.dataset.focusTask);
  if (target.hasAttribute('data-open-focus')) openFocusMode();
  if (target.hasAttribute('data-close-focus')) closeFocusMode();
  if (target.hasAttribute('data-focus-start')) state.activeFocus?.status === 'paused' ? resumeFocus() : startFocus();
  if (target.hasAttribute('data-focus-pause')) pauseFocus();
  if (target.hasAttribute('data-focus-stop')) stopFocus();
  if (target.hasAttribute('data-focus-add')) addFocusMinutes();
  if (target.hasAttribute('data-focus-again')) prepareFocus(state.activeFocus?.taskId || '', 'focus');
  if (target.hasAttribute('data-focus-break')) prepareFocus('', nextBreakType());
  if (target.hasAttribute('data-focus-done')) {
    const task = focusTask();
    if (task && !task.completed) task.completed = true;
    state.activeFocus = null;
    save(); closeFocusMode(); render(); toast('Задача выполнена');
  }
  if (target.hasAttribute('data-reset-focus-settings')) { state.focusSettings = { ...focusDefaults }; save(); render(); toast('Настройки фокуса сброшены'); }
});

document.addEventListener('change', event => {
  const key = event.target.dataset.focusSetting;
  if (!key) return;
  const limits = { focusMinutes:[5,120], shortBreakMinutes:[1,30], longBreakMinutes:[5,60], sessionsBeforeLongBreak:[2,8] };
  const [min,max] = limits[key];
  state.focusSettings[key] = Math.min(max, Math.max(min, Number(event.target.value) || focusDefaults[key]));
  event.target.value = state.focusSettings[key];
  save(); toast('Настройки фокуса сохранены');
});

document.addEventListener('keydown', event => {
  const focusOpen = !!document.querySelector('.focus-dialog');
  if (event.key === 'Escape' && document.querySelector('#focus-root').children.length) closeFocusMode();
  if (event.code === 'Space' && focusOpen && !['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    state.activeFocus?.status === 'running' ? pauseFocus() : startFocus();
  }
  if (event.key === 'Tab' && focusOpen) {
    const controls = [...document.querySelectorAll('#focus-root button:not([disabled]),#focus-root input:not([disabled]),#focus-root select:not([disabled])')];
    if (!controls.length) return;
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try { state = JSON.parse(event.newValue); ensureFocusState(); render(); } catch {}
});

const focusBaseRender = render;
render = function renderWithFocus() { focusBaseRender(); decorateFocusUI(); };
startFocusTicker();
if (state.activeFocus?.status === 'running' && focusRemaining() <= 0) completeFocusSession();
render();
