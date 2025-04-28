// scripts/check-native-modules.js
const { execSync } = require('child_process');
const { readdirSync, readFileSync, statSync } = require('fs');
const path = require('path');

const nativePackages = new Set();
const usedPackages = new Set();

// known prefixes for native packages
const nativeKeywords = [
  'expo-',                 // Expo modules (expo-camera, expo-av, etc.)
  '@react-native-',         // Scoped react-native modules (@react-native-picker/picker)
  'react-native-',          // Common react-native modules (react-native-reanimated)
];

const mobileSrcPath = path.join(__dirname, '..', 'apps', 'mobile', 'src');

// Recursive file scanner
function scanFiles(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      scanFiles(fullPath);
    } else if (stats.isFile() && (entry.endsWith('.tsx') || entry.endsWith('.ts') || entry.endsWith('.jsx') || entry.endsWith('.js'))) {
      const content = readFileSync(fullPath, 'utf8');
      const matches = content.match(/from\s+['"]([^'"]+)['"]/g) || [];
      matches.forEach(match => {
        const pkg = match.split('from')[1].trim().replace(/['"]/g, '');
        if (nativeKeywords.some(keyword => pkg.startsWith(keyword))) {
          usedPackages.add(pkg.split('/')[0].startsWith('@') ? pkg.split('/').slice(0,2).join('/') : pkg.split('/')[0]);
        }
      });
    }
  }
}

// Main run
function main() {
  console.log('🔍 Scanning for used native modules...');

  scanFiles(mobileSrcPath);

  if (!usedPackages.size) {
    console.log('✅ No native packages found.');
    return;
  }

  console.log('📦 Found these native packages:');
  console.log(Array.from(usedPackages).map(p => `- ${p}`).join('\n'));

  console.log('\n📋 Installing missing packages...');

  const installCommand = `yarn add -W ${Array.from(usedPackages).join(' ')}`;

  console.log(`\n> ${installCommand}\n`);
  execSync(installCommand, { stdio: 'inherit' });

  console.log('\n✅ Native modules installed successfully!');
}

main();
