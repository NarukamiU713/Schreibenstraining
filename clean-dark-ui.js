import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// The main background is kept pure black:
// <div className="min-h-screen bg-[#F8FAFC] dark:bg-black ...

content = content.replace(/bg-white dark:bg-black/g, 'bg-white dark:bg-[#0a0a0a]'); // zinc-950 equivalent for cards
content = content.replace(/bg-slate-50 dark:bg-black/g, 'bg-slate-50 dark:bg-[#111111]'); // Slightly lighter for headers
content = content.replace(/bg-\[#F8FAFC\] dark:bg-black/g, 'bg-[#F8FAFC] dark:bg-[#111111]'); // Inputs
content = content.replace(/bg-slate-200\/50 dark:bg-black/g, 'bg-slate-200/50 dark:bg-[#111111]'); // Tab bars
content = content.replace(/bg-blue-50 dark:bg-black/g, 'bg-blue-50 dark:bg-blue-950/30'); // Blue headers
content = content.replace(/bg-\[#003056\] dark:bg-black/g, 'bg-[#003056] dark:bg-[#0a0a0a]'); // Specific hero bg

// Replace borders to be slightly more subtle
content = content.replace(/dark:border-white\/10/g, 'dark:border-white/[0.06]');

// Make inner boxes distinct
content = content.replace(/dark:bg-zinc-950/g, 'dark:bg-[#111111]'); // Inner text boxes
content = content.replace(/dark:bg-zinc-900/g, 'dark:bg-[#1a1a1a]'); // Hover or active states

fs.writeFileSync('src/App.tsx', content);
console.log('Cleaned up dark mode UI hierarchy');
