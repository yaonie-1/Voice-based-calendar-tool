import { addEvent, deleteEvent, deleteEventsByKeyword, getEvents, getEventsByDate, getEventsBetween } from './calendarStore.js';
import { formatDateTime, getTodayString, isToday } from './dateUtils.js';
import { parseCommand } from './nlpParser.js';
import { createSpeechService, speak } from './voiceService.js';
import { requestNotificationPermission, startReminderLoop } from './reminderService.js';

const elements = {
  voiceButton: document.querySelector('#voiceButton'),
  voiceButtonText: document.querySelector('#voiceButtonText'),
  commandInput: document.querySelector('#commandInput'),
  runCommandButton: document.querySelector('#runCommandButton'),
  helpButton: document.querySelector('#helpButton'),
  statusBox: document.querySelector('#statusBox'),
  eventForm: document.querySelector('#eventForm'),
  titleInput: document.querySelector('#titleInput'),
  dateInput: document.querySelector('#dateInput'),
  timeInput: document.querySelector('#timeInput'),
  reminderInput: document.querySelector('#reminderInput'),
  eventList: document.querySelector('#eventList'),
  eventSummary: document.querySelector('#eventSummary'),
  todayButton: document.querySelector('#todayButton'),
  allButton: document.querySelector('#allButton'),
  exampleCommands: document.querySelectorAll('.example-command'),
};

let currentFilter = { type: 'all' };
let isListening = false;

function getCurrentEvents() {
  if (currentFilter.type === 'date') return getEventsByDate(currentFilter.date);
  if (currentFilter.type === 'week') return getEventsBetween(currentFilter.startDate, currentFilter.endDate);
  return getEvents();
}

function reply(message, shouldSpeak = true) {
  elements.statusBox.textContent = message;
  if (shouldSpeak) speak(message);
}

function renderEvents(events = getEvents()) {
  elements.eventList.innerHTML = '';
  elements.eventSummary.textContent = events.length ? `共 ${events.length} 个事件` : '暂无事件';

  if (events.length === 0) {
    elements.eventList.innerHTML = '<div class="empty-state">还没有日程，可以通过语音或表单添加。</div>';
    return;
  }

  events.forEach((event) => {
    const card = document.createElement('article');
    card.className = `event-card ${isToday(event.date) ? 'is-today' : ''}`;
    card.innerHTML = `
      <div>
        <h3 class="event-title">${escapeHtml(event.title)}</h3>
        <p class="event-meta">${formatDateTime(event)} · 提前 ${event.reminderMinutes} 分钟提醒</p>
        ${event.reminded ? '<span class="badge">已提醒</span>' : ''}
      </div>
      <button class="danger-button" data-id="${event.id}">删除</button>
    `;
    elements.eventList.appendChild(card);
  });
}

function escapeHtml(text) {
  return text.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  }[char]));
}

function handleAdd(command) {
  if (!command.title) {
    reply('没有识别到事件标题，请换一种说法。');
    return;
  }
  const event = addEvent(command);
  renderEvents();
  reply(`已添加：${event.title}，时间是${event.date} ${event.time}，提前${event.reminderMinutes}分钟提醒。`);
}

function handleDelete(command) {
  if (!command.keyword) {
    reply('请说出要删除的事件名称，例如：删除开会。');
    return;
  }
  const deleted = deleteEventsByKeyword(command.keyword);
  renderEvents();
  if (deleted.length === 0) {
    reply(`没有找到包含“${command.keyword}”的事件。`);
    return;
  }
  reply(`已删除${deleted.length}个事件：${deleted.map((event) => event.title).join('、')}。`);
}

function handleView(command) {
  let events = [];
  if (command.range === 'all') {
    events = getEvents();
    currentFilter = { type: 'all' };
  } else if (command.range === 'week') {
    events = getEventsBetween(command.startDate, command.endDate);
    currentFilter = { type: 'week', startDate: command.startDate, endDate: command.endDate };
  } else {
    events = getEventsByDate(command.date);
    currentFilter = { type: 'date', date: command.date };
  }
  renderEvents(events);
  if (events.length === 0) {
    reply('没有查到对应日程。');
    return;
  }
  const names = events.map((event) => `${event.time}${event.title}`).join('，');
  reply(`查到${events.length}个日程：${names}。`);
}

function showHelp() {
  const message = '你可以说：明天下午三点提醒我开会；查看今天的日程；删除开会；查看本周日程。也可以在输入框里输入文字指令。';
  reply(message);
}

function executeCommand(text) {
  const command = parseCommand(text);
  switch (command.intent) {
    case 'add':
      handleAdd(command);
      break;
    case 'delete':
      handleDelete(command);
      break;
    case 'view':
      handleView(command);
      break;
    case 'help':
      showHelp();
      break;
    default:
      reply('暂时没有理解这条指令。可以说：明天下午三点提醒我开会，或者查看今天日程。');
  }
}

const speechService = createSpeechService({
  onStart() {
    isListening = true;
    elements.voiceButton.classList.add('is-listening');
    elements.voiceButtonText.textContent = '正在聆听';
  },
  onEnd() {
    isListening = false;
    elements.voiceButton.classList.remove('is-listening');
    elements.voiceButtonText.textContent = '按下说话';
  },
  onResult(transcript) {
    elements.commandInput.value = transcript;
    executeCommand(transcript);
  },
  onError(message) {
    reply(message, false);
    isListening = false;
    elements.voiceButton.classList.remove('is-listening');
    elements.voiceButtonText.textContent = '按下说话';
  },
});

function bindEvents() {
  elements.voiceButton.addEventListener('click', async () => {
    await requestNotificationPermission();
    if (isListening) {
      speechService.stop();
      return;
    }
    speechService.start();
  });

  elements.runCommandButton.addEventListener('click', () => {
    executeCommand(elements.commandInput.value);
  });

  elements.helpButton.addEventListener('click', showHelp);

  elements.eventForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await requestNotificationPermission();
    const saved = addEvent({
      title: elements.titleInput.value,
      date: elements.dateInput.value,
      time: elements.timeInput.value,
      reminderMinutes: Number(elements.reminderInput.value),
    });
    elements.eventForm.reset();
    elements.dateInput.value = getTodayString();
    elements.timeInput.value = '09:00';
    renderEvents();
    reply(`已添加：${saved.title}。`);
  });

  elements.eventList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-id]');
    if (!button) return;
    deleteEvent(button.dataset.id);
    renderEvents(getCurrentEvents());
    reply('事件已删除。');
  });

  elements.todayButton.addEventListener('click', () => {
    currentFilter = { type: 'date', date: getTodayString() };
    renderEvents(getCurrentEvents());
  });

  elements.allButton.addEventListener('click', () => {
    currentFilter = { type: 'all' };
    renderEvents(getEvents());
  });

  elements.exampleCommands.forEach((button) => {
    button.addEventListener('click', () => {
      elements.commandInput.value = button.textContent.trim();
      executeCommand(elements.commandInput.value);
    });
  });
}

function init() {
  elements.dateInput.value = getTodayString();
  elements.timeInput.value = '09:00';
  bindEvents();
  renderEvents();
  startReminderLoop(() => renderEvents());
  if (!speechService.supported) {
    reply('当前浏览器不支持语音识别，可以先使用文字指令测试。建议使用 Chrome 或 Edge。', false);
  }
}

init();
