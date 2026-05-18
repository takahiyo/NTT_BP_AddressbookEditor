// test_zxl_export.js
import { ZX2L_SPEC } from './src/js/models/specs/zx2l.js';
import { objectsToRows, buildCSVText } from './src/js/services/csv-exporter.js';
import { validateRow } from './src/js/services/validator.js';

console.log('--- ZX2L Specification & Validation Test ---');

// 1. 出力エンコーディングが UTF-8 に設定されているか確認
console.log('1. Encoding check:');
console.log('ZX2L encoding is:', ZX2L_SPEC.encoding);
if (ZX2L_SPEC.encoding !== 'UTF-8') {
  console.error('Error: ZX2L encoding is NOT UTF-8!');
  process.exit(1);
} else {
  console.log('SUCCESS: ZX2L encoding is UTF-8.');
}

// 2. 電話番号のハイフンチェックのテスト
console.log('\n2. Forbidden Phone Chars check:');
console.log('forbiddenPhoneChars defined:', ZX2L_SPEC.forbiddenPhoneChars);

// 正常なデータ
const validRow = {
  memoryNo: '0001',
  name: 'テスト名称',
  furigana: 'ﾃｽﾄ',
  phone1: '09012345678',
  icon1: '16',
  dialAttr1: '0'
};

// ハイフンが含まれるデータ
const invalidRow = {
  memoryNo: '0002',
  name: 'テスト名称',
  furigana: 'ﾃｽﾄ',
  phone1: '090-1234-5678', // ハイフンあり
  icon1: '16',
  dialAttr1: '0'
};

const validResults = validateRow(validRow, ZX2L_SPEC, new Set(), '4digit');
const invalidResults = validateRow(invalidRow, ZX2L_SPEC, new Set(), '4digit');

console.log('Valid row results (should be empty/no error):', JSON.stringify(validResults));
if (validResults.phone1) {
  console.error('Error: Valid row phone1 has unexpected validation errors!', validResults.phone1);
  process.exit(1);
} else {
  console.log('SUCCESS: Valid row phone1 has no validation errors.');
}

console.log('Invalid row results (should contain hyphen error):', JSON.stringify(invalidResults));
if (!invalidResults.phone1 || !invalidResults.phone1.some(r => r.severity === 'error' && r.message.includes('使用できない文字'))) {
  console.error('Error: Invalid row phone1 did NOT fail with SEVERITY.ERROR as expected!');
  process.exit(1);
} else {
  console.log('SUCCESS: Invalid row phone1 correctly failed with hyphen validation error.');
}

console.log('\n--- All Tests Completed Successfully! ---');
