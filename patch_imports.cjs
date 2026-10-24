const fs = require('fs');
let content = fs.readFileSync('src/components/InventoryView.tsx', 'utf8');

content = content.replace(
  "  MoreVertical,",
  "  MoreVertical,\n  Globe,\n  Tag,\n  FileCheck,"
);

fs.writeFileSync('src/components/InventoryView.tsx', content);
