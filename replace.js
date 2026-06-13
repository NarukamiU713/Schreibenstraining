import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(/dark:bg-\[#111\]/g, 'dark:bg-black');
content = content.replace(/dark:bg-\[#0a0a0a\]/g, 'dark:bg-zinc-950');
content = content.replace(/dark:bg-\[#222\]/g, 'dark:bg-zinc-900');
content = content.replace(/dark:border-\[#222\]/g, 'dark:border-white/10');
content = content.replace(/line-through decoration-red-[0-9]+/g, ''); // just in case
fs.writeFileSync('src/App.tsx', content);
console.log('Done!');
