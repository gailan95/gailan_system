const employees = [
  { createdAt: "2026-09-17T13:56" },
  { createdAt: "2026-09-17T00:00:00.000Z" },
  { createdAt: "17/09/2026" }
];
const statsDate = "2026-09-15";

function formatDateOnly(isoString) {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  } catch {
    return isoString;
  }
}

const todaysRecords = employees.filter(emp => {
  if (!emp.createdAt) return false;
  const empDate = emp.createdAt.includes('T') ? formatDateOnly(emp.createdAt) : emp.createdAt.split(' ')[0];
  console.log("emp.createdAt:", emp.createdAt, "empDate:", empDate, "statsDate:", statsDate, "match:", empDate === statsDate);
  return empDate === statsDate;
});

console.log("todaysRecords.length:", todaysRecords.length);
