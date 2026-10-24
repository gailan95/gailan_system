const isoString = "2026-09-16T21:49:00.000Z";
const date = new Date(isoString);
const pad = (n) => n.toString().padStart(2, '0');
console.log(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
