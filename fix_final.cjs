const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components');
let files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx')).map(f => path.join(dir, f));
files.push(path.join(__dirname, 'src', 'App.tsx'));

function fixStates(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');

  // Fix all hover/focus/active bugs globally using Regex
  // Matches e.g. hover:bg-zinc-100 dark:bg-slate-800 and changes to hover:bg-zinc-100 dark:hover:bg-slate-800
  const states = ['hover', 'focus', 'active', 'group-hover'];
  
  states.forEach(state => {
    // For backgrounds, texts, and borders
    const regex = new RegExp(`(${state}:(bg|text|border)-[a-z]+-[0-9]+(\\/[0-9]+)?)\\s+(dark:(bg|text|border)-[a-z]+-[0-9]+(\\/[0-9]+)?)`, 'g');
    content = content.replace(regex, `$1 dark:${state}:$5`);
    
    // Also handle cases where dark is already correct but maybe we missed some bg-white
    const regexWhite = new RegExp(`(${state}:bg-white)\\s+(dark:bg-[a-z]+-[0-9]+(\\/[0-9]+)?)`, 'g');
    content = content.replace(regexWhite, `$1 dark:${state}:$2`);
  });

  // Ensure AdminPanel.tsx has dark mode classes (in case add_dark_admin.cjs failed)
  if (filePath.includes('AdminPanel.tsx') || filePath.includes('HostDashboard.tsx')) {
    content = content.replace(/bg-white(?!(\s+dark:bg|\s*\"))/g, 'bg-white dark:bg-slate-800');
    content = content.replace(/bg-zinc-50(?!(\s+dark:bg|\s*\"))/g, 'bg-zinc-50 dark:bg-slate-900/50');
    content = content.replace(/text-zinc-900(?!(\s+dark:text|\s*\"))/g, 'text-zinc-900 dark:text-slate-100');
  }

  fs.writeFileSync(filePath, content);
}

files.forEach(fixStates);
console.log('Quét và vá toàn bộ lỗi hover/focus/nền trắng thành công!');
