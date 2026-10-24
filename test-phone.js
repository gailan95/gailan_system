const phones = [
  "+9647706996075",
  "07706996075",
  "+964+964+9647706996075",
  "9647706996075",
  "07501234567"
];

function formatPhoneNumber(phone) {
  if (!phone) return '—';
  
  let cleaned = phone;
  // Clean up weird multiple +964
  cleaned = cleaned.replace(/(\+?964)+/g, '+964');
  
  const hasPlus = cleaned.startsWith('+');
  const digits = cleaned.replace(/\D/g, '');
  
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    let prefix = digits.slice(0, -10);
    
    const p1 = last10.slice(0, 3);
    const p2 = last10.slice(3, 6);
    const p3 = last10.slice(6, 10);
    
    if (prefix === '0') {
      return `0${p1} ${p2} ${p3}`;
    }
    
    if (prefix === '964') {
        prefix = '+964';
    } else if (hasPlus && prefix) {
        prefix = '+' + prefix;
    }
    
    if (prefix) {
        return `${prefix} ${p1} ${p2} ${p3}`;
    }
    
    return `${p1} ${p2} ${p3}`;
  }
  
  return phone;
}

phones.forEach(p => console.log(`${p} -> ${formatPhoneNumber(p)}`));
