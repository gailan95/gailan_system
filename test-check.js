// Script to simulate checking if the filter matches
const employees = [
  { createdAt: "2026-09-17T00:49:00.000Z" }
];
const statsDate = "2026-09-17";

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
      const empDateStr = emp.createdAt.includes('T') ? formatDateOnly(emp.createdAt) : emp.createdAt.split(' ')[0];
      return empDateStr === statsDate;
});
console.log("Matched records:", todaysRecords.length);
