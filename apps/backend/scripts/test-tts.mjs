// ESM script — run with: node scripts/test-tts.mjs
import { ttsSelfTest } from '../services/azureTtsService.js';

const ok = await ttsSelfTest('en-US-JennyNeural');
console.log('Self test:', ok ? 'OK' : 'FAIL');
process.exit(ok ? 0 : 1);
