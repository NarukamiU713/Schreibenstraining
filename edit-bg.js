import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// #0a0a0a -> #18181B (zinc-900, upper panes/cards)
content = content.replace(/dark:bg-\[#0a0a0a\]/g, 'dark:bg-zinc-900');

// #111111 -> #27272a (zinc-800, inputs, headers, inner backgrounds)
content = content.replace(/dark:bg-\[#111111\]/g, 'dark:bg-zinc-800');

// #1a1a1a -> #3f3f46 (zinc-700, hovers, active states)
content = content.replace(/dark:bg-\[#1a1a1a\]/g, 'dark:bg-zinc-700');

// also adjust borders if they are too subtle
content = content.replace(/dark:border-white\/\[0\.06\]/g, 'dark:border-white/10');

fs.writeFileSync('src/App.tsx', content);
console.log('Done!');
