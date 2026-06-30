import fs from 'fs';
import { spawnSync } from 'child_process';

const html = fs.readFileSync('app.html', 'utf8');
const start = html.indexOf('<script>\n');
const end = html.indexOf('\n  </script>\n', start);
if (start < 0 || end < 0) {
  console.error('script block not found', start, end);
  process.exit(1);
}
const js = html.slice(start + '<script>\n'.length, end);
fs.writeFileSync('_check-app.js', js);
const r = spawnSync(process.execPath, ['--check', '_check-app.js'], { encoding: 'utf8' });
if (r.status === 0) console.log('syntax ok');
else {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}
