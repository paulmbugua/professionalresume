// android-health.js
const { execSync } = require('child_process');
const { existsSync, readFileSync, readdirSync } = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const mobileAndroidPath = path.join(repoRoot, 'apps', 'mobile', 'android');
const localPropertiesPath = path.join(mobileAndroidPath, 'local.properties');
const gradlewPath = path.join(mobileAndroidPath, 'gradlew.bat');

const args = process.argv.slice(2);
const isFixMode = args.includes('--fix');

function run(command, cwd = repoRoot) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit', cwd });
}

function checkLocalProperties() {
  console.log('\n🔍 Checking local.properties...');
  if (!existsSync(localPropertiesPath)) {
    console.error('❌ local.properties file missing!');
    if (isFixMode) {
      console.log('⚡ Attempting to create a basic local.properties...');
      const sdkPath = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;
      if (sdkPath) {
        const content = `sdk.dir=${sdkPath.replace(/\\/g, '/')}\n`;
        require('fs').writeFileSync(localPropertiesPath, content, 'utf8');
        console.log('✅ local.properties created.');
      } else {
        console.error('❌ Cannot auto-create local.properties: ANDROID_SDK_ROOT not set.');
      }
    }
    return;
  }

  const content = readFileSync(localPropertiesPath, 'utf8');
  if (content.includes('sdk.dir')) {
    console.log('✅ sdk.dir found in local.properties.');
  } else {
    console.warn('⚠️  sdk.dir missing in local.properties.');
  }
  if (content.includes('ndk.dir')) {
    console.log('✅ ndk.dir found in local.properties.');
  } else {
    console.warn('⚠️  ndk.dir missing in local.properties.');
  }
}

function checkInstalledNDKs() {
  console.log('\n🔍 Checking installed NDKs...');
  const ndkPath =
    process.env.ANDROID_NDK_HOME ||
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'ndk');
  if (existsSync(ndkPath)) {
    const ndkVersions = readdirSync(ndkPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    if (ndkVersions.length) {
      console.log('✅ Installed NDK versions:');
      ndkVersions.forEach((v) => console.log(`- ${v}`));
    } else {
      console.warn('⚠️  No NDK versions found.');
    }
  } else {
    console.warn('⚠️  No NDK directory found.');
  }
}

function checkGradleWrapper() {
  console.log('\n🔍 Checking Gradle Wrapper...');
  if (!existsSync(gradlewPath)) {
    console.error('❌ gradlew.bat not found!');
    return;
  }
  try {
    run('gradlew.bat --version', mobileAndroidPath);
  } catch (err) {
    console.warn('⚠️  Gradlew check failed.');
  }
}

function checkSdkManager() {
  console.log('\n🔍 Checking Android SDK Manager...');
  const sdkManagerPath = path.join(
    process.env.ANDROID_SDK_ROOT || '',
    'tools',
    'bin',
    'sdkmanager.bat'
  );
  if (existsSync(sdkManagerPath)) {
    try {
      run('"' + sdkManagerPath + '" --list');
    } catch {
      console.warn('⚠️  sdkmanager command failed.');
    }
  } else {
    console.warn('⚠️  sdkmanager not found. Skipping SDK package list.');
  }
}

async function main() {
  console.log('⚡ Running Android Health Check (Super Version)...');

  checkLocalProperties();
  checkInstalledNDKs();
  checkGradleWrapper();
  checkSdkManager();

  console.log('\n✅ Android Health Check Complete!');
}

main().catch((err) => {
  console.error('❌ Android Health Check failed:', err);
  process.exit(1);
});
