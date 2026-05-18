// test_zxl_export.js
import { ZX2L_SPEC } from './src/js/models/specs/zx2l.js';
import { objectsToRows, buildCSVText } from './src/js/services/csv-exporter.js';

console.log('--- ZX2L Export Double Quote Test ---');

// ZX2L のカラム仕様
const columns = ZX2L_SPEC.columns;
console.log('Columns count:', columns.length);

// テスト用ダミーデータ (1行目は値あり、2行目は空欄)
const testData = [
  {
    ten: '0',
    dataType: '1',
    version: '1',
    memoryNo: '0',
    reserved1: '0',
    reserved2: '0',
    name: 'test00000',
    furigana: 'TEST00000',
    phone1: '1234567890',
    icon1: '16',
    dialAttr1: '0',
    phone2: '',
    icon2: '16',
    dialAttr2: '0',
    phone3: '',
    icon3: '16',
    dialAttr3: '0',
    phone4: '',
    icon4: '16',
    dialAttr4: '0'
  },
  {
    ten: '0',
    dataType: '1',
    version: '1',
    memoryNo: '1',
    reserved1: '0',
    reserved2: '0',
    name: '',
    furigana: '',
    phone1: '',
    icon1: '16',
    dialAttr1: '0',
    phone2: '',
    icon2: '16',
    dialAttr2: '0',
    phone3: '',
    icon3: '16',
    dialAttr3: '0',
    phone4: '',
    icon4: '16',
    dialAttr4: '0'
  }
];

// objectsToRows で2次元配列に変換
const rows = objectsToRows(testData, columns, ZX2L_SPEC);
const header = columns.map(c => c.label);

// CSVテキストをビルド
const csvText = buildCSVText(header, rows, ',', ZX2L_SPEC);

console.log('Build CSV Result:');
console.log(csvText);

// 行ごとに判定
const lines = csvText.trim().split('\r\n');
const expectedLine1 = '0,1,1,0,0,0,"""test00000""","""TEST00000""","""1234567890""",16,0,"""""",16,0,"""""",16,0,"""""",16,0';
const expectedLine2 = '0,1,1,1,0,0,"""""","""""","""""",16,0,"""""",16,0,"""""",16,0,"""""",16,0';

console.log('Line 1 match?', lines[0] === expectedLine1);
if (lines[0] !== expectedLine1) {
  console.error('Line 1 mismatch!');
  console.error('Expected:', expectedLine1);
  console.error('Actual:  ', lines[0]);
}

console.log('Line 2 match?', lines[1] === expectedLine2);
if (lines[1] !== expectedLine2) {
  console.error('Line 2 mismatch!');
  console.error('Expected:', expectedLine2);
  console.error('Actual:  ', lines[1]);
}

console.log('--- Test Completed ---');
