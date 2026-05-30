const STORAGE_KEY = 'voice-calendar-events-v1';

function readEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('读取本地日程失败', error);
    return [];
  }
}

function writeEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function createId() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getEvents() {
  return readEvents().sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
}

export function addEvent(eventInput) {
  const events = readEvents();
  const event = {
    id: createId(),
    title: eventInput.title.trim(),
    date: eventInput.date,
    time: eventInput.time,
    startAt: `${eventInput.date}T${eventInput.time}:00`,
    reminderMinutes: Number(eventInput.reminderMinutes || 0),
    reminded: false,
    createdAt: new Date().toISOString(),
  };
  events.push(event);
  writeEvents(events);
  return event;
}

export function deleteEvent(eventId) {
  const events = readEvents();
  const nextEvents = events.filter((event) => event.id !== eventId);
  writeEvents(nextEvents);
  return events.length !== nextEvents.length;
}

export function deleteEventsByKeyword(keyword) {
  const text = keyword.trim();
  if (!text) return [];
  const events = readEvents();
  const deleted = events.filter((event) => event.title.includes(text));
  const remain = events.filter((event) => !event.title.includes(text));
  writeEvents(remain);
  return deleted;
}

export function updateEvent(eventId, patch) {
  const events = readEvents();
  const nextEvents = events.map((event) => event.id === eventId ? { ...event, ...patch } : event);
  writeEvents(nextEvents);
}

export function getEventsByDate(date) {
  return getEvents().filter((event) => event.date === date);
}

export function getEventsBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T23:59:59`).getTime();
  return getEvents().filter((event) => {
    const time = new Date(event.startAt).getTime();
    return time >= start && time <= end;
  });
}
