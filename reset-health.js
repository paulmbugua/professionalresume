// reset-health.js
const { execSync } = require('child_process');
const { existsSync, unlinkSync, copyFileSync } = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const mobilePath = path.join(repoRoot, 'apps', 'mobile');
const metroConfigPath = path.join(mobilePath, 'metro.config.js');
const defaultMetroConfigPath = path.join(repoRoot, 'default-metro-config.txt');
const expoCliPath = path.join(repoRoot, 'node_modules', 'expo', 'bin', 'cli.js');

const args = process.argv.slice(2);
const isFast = args.includes('--fast');
const isDoctorOnly = args.includes('--doctor-only');

function run(command, cwd = repoRoot) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit', cwd });
}

function safeDelete(filePath) {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
    console.log(`Deleted ${filePath}`);
  }
}

async function main() {
  console.log('⚡ Resetting Expo Health (Super Version)...');

  if (isDoctorOnly) {
    console.log('\n🩺 Running expo doctor only...');
    if (existsSync(expoCliPath)) {
      try {
        run('npx expo-doctor', mobilePath);
      } catch (err) {
        console.warn('⚠️ Warning: expo-doctor failed.');
      }
    } else {
      console.warn('⚠️ Warning: expo not installed. Skipping expo-doctor.');
    }
    console.log('\n✅ Expo Doctor Check Complete!');
    return;
  }

  if (!isFast) {
    console.log('\n🧹 Cleaning node_modules and yarn.lock...');
    safeDelete(path.join(repoRoot, 'yarn.lock'));
    safeDelete(path.join(mobilePath, 'yarn.lock'));
    run('rm -rf node_modules', repoRoot);
    run('rm -rf apps/mobile/node_modules', repoRoot);

    console.log('\n🧹 Cleaning yarn cache...');
    run('yarn cache clean', repoRoot);
  } else {
    console.log('\n⚡ Fast mode active: Skipping cleaning node_modules and yarn.lock.');
  }

  console.log('\n📚 Installing all dependencies...');
  run('yarn install', repoRoot);

  console.log('\n🔍 Checking metro.config.js...');
  if (!existsSync(metroConfigPath)) {
    console.log('❗ metro.config.js not found, creating it...');
    copyFileSync(defaultMetroConfigPath, metroConfigPath);
    console.log('✅ metro.config.js created.');
  } else {
    console.log('✅ metro.config.js already exists.');
  }

  // Running expo doctor
  console.log('\n🩺 Running expo doctor...');
  if (existsSync(expoCliPath)) {
    try {
      run('npx expo-doctor', mobilePath);
    } catch (err) {
      console.warn('⚠️ Warning: expo-doctor failed.');
    }
  } else {
    console.warn('⚠️ Warning: expo not installed. Skipping expo-doctor.');
  }

  console.log('\n✅ Full Expo Health Reset Complete!');
}

main().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
