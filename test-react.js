const employees = [
  { createdAt: "2026-09-17T13:50" }
];
const statsDate = "2026-09-15";
const todaysRecords = employees.filter(emp => {
  if (!emp.createdAt) return false;
  const empDate = emp.createdAt.includes('T') ? emp.createdAt.split('T')[0] : emp.createdAt.split(' ')[0];
  return empDate === statsDate;
});
console.log(todaysRecords.length);
