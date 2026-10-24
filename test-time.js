const date = new Date();
const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Baghdad',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
}).formatToParts(date);

const p = {};
parts.forEach(({ type, value }) => { p[type] = value; });
console.log(`${p.year}/${p.month}/${p.day} - ${p.hour}:${p.minute} ${p.dayPeriod}`);
