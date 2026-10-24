const d1 = new Date("2026-09-17");
const d2 = new Date("2026-09-17T00:00:00");
console.log("d1 (UTC midnight):", d1.toISOString());
console.log("d2 (Local midnight):", d2.toISOString());
