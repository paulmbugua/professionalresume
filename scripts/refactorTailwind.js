const fs = require('fs');
const path = require('path');

// Tailwind utility groups you want to replace
const replacements = [
  {
    from: 'w-full py-3 rounded-lg bg-softPink text-white font-medium hover:bg-pink-700 transition duration-200',
    to: 'btn-primary',
  },
  {
    from: 'text-2xl font-bold text-center text-softPink',
    to: 'heading-2xl',
  },
  // Add more as needed
];

// Directories to scan
const targetDirs = [
  path.resolve(__dirname, '../apps/web/src/components'),
  path.resolve(__dirname, '../apps/web/src/pages'),
];

function scanAndReplace(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  replacements.forEach(({ from, to }) => {
    const pattern = new RegExp(from.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
    content = content.replace(pattern, to);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${filePath}`);
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
      console.log('🔍 Checking:', fullPath);
      scanAndReplace(fullPath);
    }
  });
}

console.log('🚀 Tailwind refactor started...\n');

targetDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    walkDir(dir);
  } else {
    console.warn(`⚠️ Directory not found: ${dir}`);
  }
});

console.log('\n🎉 Done.');
