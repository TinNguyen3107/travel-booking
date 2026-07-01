const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components');
let files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx')).map(f => path.join(dir, f));
files.push(path.join(__dirname, 'src', 'App.tsx'));

function cleanUp(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Dọn dẹp chính xác chuỗi bị lặp
  content = content.replace(/ border border-white\/50 shadow-sm/g, '');
  content = content.replace(/ border border-white\/50/g, '');
  content = content.replace(/ border shadow-sm/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log('Cleaned up:', path.basename(filePath));
  }
}

files.forEach(cleanUp);
console.log('Đã dọn dẹp các class lặp lại!');
