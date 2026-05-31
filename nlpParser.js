import { parseDateFromText, parseTimeFromText, getTodayString, getTomorrowString, getWeekRange } from './dateUtils.js';

function normalize(text) {
  return text
    .replace(/[，。！？、,.!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseReminderMinutes(text) {
  const minuteMatch = text.match(/提前\s*(\d+|[一二两三四五六七八九十]+)\s*分钟/);
  if (minuteMatch) return toNumber(minuteMatch[1]);
  const hourMatch = text.match(/提前\s*(\d+|[一二两三四五六七八九十]+)\s*(小时|个小时)/);
  if (hourMatch) return toNumber(hourMatch[1]) * 60;
  return 10;
}

function toNumber(value) {
  const map = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  if (/^\d+$/.test(value)) return Number(value);
  if (value === '十') return 10;
  if (value.startsWith('十')) return 10 + (map[value.slice(1)] || 0);
  if (value.includes('十')) {
    const [ten, one] = value.split('十');
    return (map[ten] || 1) * 10 + (map[one] || 0);
  }
  return map[value] || 0;
}

function removeTimeWords(text) {
  return text
    .replace(/(20\d{2})[年\/-](\d{1,2})[月\/-](\d{1,2})[日号]?/g, ' ')
    .replace(/(\d{1,2})[月\/-](\d{1,2})[日号]?/g, ' ')
    .replace(/今天|今日|明天|明日|后天|本周|这周|下周|下星期|周[一二三四五六日天]|星期[一二三四五六日天]/g, ' ')
    .replace(/(凌晨|早上|上午|中午|下午|晚上|夜里)?\s*([零一二两三四五六七八九十\d]{1,3})点(半|[零一二两三四五六七八九十\d]{1,3}分?)?/g, ' ')
    .replace(/\d{1,2}[:：]\d{1,2}/g, ' ')
    .replace(/提前\s*(\d+|[一二两三四五六七八九十]+)\s*(分钟|小时|个小时)提醒?/g, ' ')
    .replace(/提醒我|提醒|添加|新增|创建|安排|记录|帮我|日程|事件/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTitle(text) {
  const normalized = normalize(text);
  const afterKeyword = normalized.match(/(?:提醒我|提醒|添加|新增|创建|安排|记录)(.+)/);
  const rawTitle = removeTimeWords(afterKeyword ? afterKeyword[1] : normalized);
  return rawTitle || '未命名事件';
}

function parseAdd(text) {
  return {
    intent: 'add',
    title: parseTitle(text),
    date: parseDateFromText(text),
    time: parseTimeFromText(text),
    reminderMinutes: parseReminderMinutes(text),
    originalText: text,
  };
}

function parseDelete(text) {
  const keyword = removeTimeWords(text.replace(/删除|取消|移除|删掉/g, ' '));
  return {
    intent: 'delete',
    keyword: keyword || '',
    originalText: text,
  };
}

function parseView(text) {
  if (/全部|所有|所有日程/.test(text)) {
    return { intent: 'view', range: 'all', originalText: text };
  }
  if (/本周|这周/.test(text)) {
    const range = getWeekRange();
    return { intent: 'view', range: 'week', startDate: range.start, endDate: range.end, originalText: text };
  }
  if (/明天|明日/.test(text)) {
    return { intent: 'view', range: 'date', date: getTomorrowString(), originalText: text };
  }
  if (/今天|今日/.test(text)) {
    return { intent: 'view', range: 'date', date: getTodayString(), originalText: text };
  }
  return { intent: 'view', range: 'date', date: parseDateFromText(text), originalText: text };
}

export function parseCommand(rawText) {
  const text = normalize(rawText);
  if (!text) {
    return { intent: 'unknown', reason: 'empty' };
  }
  if (/帮助|怎么用|指令/.test(text)) {
    return { intent: 'help', originalText: text };
  }
  if (/删除|取消|移除|删掉/.test(text)) {
    return parseDelete(text);
  }
  if (/查看|查询|看看|有哪些|日程|安排|事件/.test(text) && !/添加|新增|创建|提醒我|安排.+点/.test(text)) {
    return parseView(text);
  }
  if (/添加|新增|创建|提醒我|提醒|安排|记录|有.+点|点.+/.test(text)) {
    return parseAdd(text);
  }
  return { intent: 'unknown', reason: 'unmatched', originalText: text };
}
