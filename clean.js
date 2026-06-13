import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/dark:hover:bg-\[#222\]/g, 'dark:hover:bg-white/5');
content = content.replace(/dark:divide-\[#222\]/g, 'dark:divide-white/10');
content = content.replace(/dark:bg-\[#222\]/g, 'dark:bg-zinc-900');
fs.writeFileSync('src/App.tsx', content);
console.log('Cleaned hover/divide #222');
