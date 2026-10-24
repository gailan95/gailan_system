const emp1 = { createdAt: "2026-09-16T21:49:00.000Z" }; // 17th in UTC+3
const emp2 = { createdAt: "2026-09-17 00:49:00" };
const statsDate = "2026-09-17";

const statsStart = new Date(`${statsDate}T00:00:00`).getTime();
const statsEnd = new Date(`${statsDate}T23:59:59.999`).getTime();

function matches(emp) {
    if (!emp.createdAt) return false;
    let time = 0;
    // Check if it's already an ISO string or just a local datetime string
    if (emp.createdAt.includes('T')) {
        time = new Date(emp.createdAt).getTime();
    } else {
        time = new Date(emp.createdAt.replace(' ', 'T')).getTime();
    }
    
    if (isNaN(time)) {
       // fallback for purely YYYY-MM-DD string
       return emp.createdAt.startsWith(statsDate);
    }
    
    return time >= statsStart && time <= statsEnd;
}

console.log("emp1 matches:", matches(emp1));
console.log("emp2 matches:", matches(emp2));
