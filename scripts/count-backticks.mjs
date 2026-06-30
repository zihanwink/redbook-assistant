import fs from 'fs';
const html = fs.readFileSync('app.html', 'utf8');
const start = html.indexOf('<script>\n');
const end = html.indexOf('\n  </script>\n', start);
const js = html.slice(start + '<script>\n'.length, end);
let inTemplate = false;
let line = 1;
let col = 0;
let openLine = 0;
for (let i = 0; i < js.length; i++) {
  const ch = js[i];
  if (ch === '\n') { line++; col = 0; continue; }
  col++;
  if (ch === '`') {
    if (!inTemplate) { inTemplate = true; openLine = line; }
    else inTemplate = false;
  }
}
console.log('inTemplate at end:', inTemplate, 'opened at line', openLine);
fs.writeFileSync('_check-app.js', js);
