
import { wwwaxe } from './dist/index.mjs';
import { readFileSync } from 'fs';
const fixtures = ['mdn', 'wikipedia', 'stripe', 'react-dev', 'bbc', 'vercel', 'nextjs', 'github-docs'];
for (const name of fixtures) {
  const html = readFileSync('/home/daytona/fixtures/' + name + '.html', 'utf8');
  const mode1 = wwwaxe(html);
  const mode2 = wwwaxe(html, { core: true });
  console.log(name + ': raw=' + html.length + ' mode1=' + mode1.length + ' mode2=' + mode2.length);
  // Check no chrome in mode2
  console.log('  chrome: nav=' + mode2.includes('<nav') + ' header=' + mode2.includes('<header') + ' footer=' + mode2.includes('<footer'));
  // Show first 200 chars of mode2
  console.log('  start: ' + mode2.slice(0, 200).replace(/\n/g, '\\n'));
}
