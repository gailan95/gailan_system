const iso1 = "2026-09-17T05:00:00.000Z";
const iso2 = "2026-09-17";

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

console.log(formatDateOnly(iso1));
console.log(formatDateOnly(iso2));
