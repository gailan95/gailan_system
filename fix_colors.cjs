const fs = require('fs');
let content = fs.readFileSync('src/components/InventoryView.tsx', 'utf8');

// The active button color in the prompt says: "Style: Deep teal, pill-shaped button."
// The prompt also says: "A touch of alert red."

content = content.replace(
  "bg-[#0f766e] text-white",
  "bg-teal-600 text-white"
);
content = content.replace(
  "bg-[#0f766e] text-white",
  "bg-teal-600 text-white"
);

fs.writeFileSync('src/components/InventoryView.tsx', content);
