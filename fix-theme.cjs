const fs = require('fs');
const path = require('path');

const replaceInFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Text Colors
  content = content.replace(/text-white/g, 'text-text-main');
  content = content.replace(/text-slate-\d00/g, (match) => {
    const level = parseInt(match.split('-')[2]);
    if (level <= 300) return 'text-text-main';
    return 'text-text-muted';
  });
  
  // Borders
  content = content.replace(/border-white\/[0-9]+/g, 'border-glass-border');
  content = content.replace(/border-slate-[0-9]+/g, 'border-glass-border');

  // Background Overlays
  content = content.replace(/bg-white\/5/g, 'bg-text-main/5');
  content = content.replace(/bg-slate-800/g, 'bg-surface');
  content = content.replace(/bg-slate-900/g, 'bg-surface');
  content = content.replace(/bg-slate-700/g, 'bg-muted');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${path.basename(filePath)} successfully.`);
};

['Dashboard.tsx', 'NewCampaign.tsx', 'Login.tsx'].forEach(file => {
  replaceInFile(path.join(__dirname, 'src', 'components', file));
});
