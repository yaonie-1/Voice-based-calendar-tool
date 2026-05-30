const WEEKDAY_MAP = {
  日: 0,
  天: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
};

const CHINESE_NUM_MAP = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

export function toDateString(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayString() {
  return toDateString(new Date());
}

export function getTomorrowString() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toDateString(date);
}

export function getWeekRange() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: toDateString(monday),
    end: toDateString(sunday),
  };
}

export function parseChineseNumber(input) {
  if (!input) return NaN;
  if (/^\d+$/.test(input)) return Number(input);
  if (input === '十') return 10;
  if (input.startsWith('十')) {
    return 10 + (CHINESE_NUM_MAP[input.slice(1)] || 0);
  }
  if (input.includes('十')) {
    const [ten, one] = input.split('十');
    return (CHINESE_NUM_MAP[ten] || 1) * 10 + (CHINESE_NUM_MAP[one] || 0);
  }
  return CHINESE_NUM_MAP[input];
}

export function parseDateFromText(text) {
  const now = new Date();
  if (/今天|今日/.test(text)) return toDateString(now);
  if (/明天|明日/.test(text)) {
    const date = new Date(now);
    date.setDate(now.getDate() + 1);
    return toDateString(date);
  }
  if (/后天/.test(text)) {
    const date = new Date(now);
    date.setDate(now.getDate() + 2);
    return toDateString(date);
  }

  const fullDate = text.match(/(20\d{2})[年\/-](\d{1,2})[月\/-](\d{1,2})[日号]?/);
  if (fullDate) {
    const [, year, month, day] = fullDate;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const monthDay = text.match(/(\d{1,2})[月\/-](\d{1,2})[日号]?/);
  if (monthDay) {
    const [, month, day] = monthDay;
    return `${now.getFullYear()}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const weekMatch = text.match(/(下周|下星期|本周|这周|周|星期)([一二三四五六日天])/);
  if (weekMatch) {
    const prefix = weekMatch[1];
    const targetDay = WEEKDAY_MAP[weekMatch[2]];
    const currentDay = now.getDay();
    let diff = targetDay - currentDay;
    if (prefix === '下周' || prefix === '下星期') {
      diff += 7;
    } else if (diff < 0) {
      diff += 7;
    }
    const date = new Date(now);
    date.setDate(now.getDate() + diff);
    return toDateString(date);
  }

  return toDateString(now);
}

export function parseTimeFromText(text) {
  const colonTime = text.match(/(\d{1,2})[:：](\d{1,2})/);
  if (colonTime) {
    const hour = Number(colonTime[1]);
    const minute = Number(colonTime[2]);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  const timeMatch = text.match(/(凌晨|早上|上午|中午|下午|晚上|夜里)?\s*([零一二两三四五六七八九十\d]{1,3})点(半|[零一二两三四五六七八九十\d]{1,3}分?)?/);
  if (timeMatch) {
    const period = timeMatch[1] || '';
    let hour = parseChineseNumber(timeMatch[2]);
    let minute = 0;
    if (timeMatch[3]) {
      minute = timeMatch[3] === '半' ? 30 : parseChineseNumber(timeMatch[3].replace('分', ''));
    }
    if ((period.includes('下午') || period.includes('晚上') || period.includes('夜里')) && hour < 12) {
      hour += 12;
    }
    if (period.includes('凌晨') && hour === 12) {
      hour = 0;
    }
    return `${String(hour).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}`;
  }

  return '09:00';
}

export function formatDateTime(event) {
  return `${event.date} ${event.time}`;
}

export function isToday(dateString) {
  return dateString === getTodayString();
}
