const fs = require('fs');
let content = fs.readFileSync('tsconfig.json', 'utf8');

if (!content.includes('"exclude"')) {
  content = content.replace(
    '  "compilerOptions": {',
    '  "exclude": ["dist", "node_modules"],\n  "compilerOptions": {'
  );
  fs.writeFileSync('tsconfig.json', content);
}
