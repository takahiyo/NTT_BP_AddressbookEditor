import { fillMemoryGaps } from './src/js/services/memory-service.js';
import { ZXSMH_SPEC } from './src/js/models/specs/zxsmh.js';
import assert from 'assert';

console.log('--- fillMemoryGaps 関数の検証テスト ---');

// テスト用データ (メモリ番号: 000, 001, 003)
const mockData = [
  { memoryNo: '000', name: 'テスト太郎', phone1: '09011112222' },
  { memoryNo: '001', name: 'テスト次郎', phone1: '09033334444' },
  { memoryNo: '003', name: 'テスト四郎', phone1: '09077778888' }
];

// 桁数モードは '3digit' (ZX-SMHのデフォルト)
const result = fillMemoryGaps(mockData, ZXSMH_SPEC, '3digit');

console.log('変換後のデータ件数:', result.length);
console.log('変換後のデータ:', JSON.stringify(result, null, 2));

try {
  // 検証1: データ件数が4件になっていること (000, 001, 002, 003)
  assert.strictEqual(result.length, 4, 'データ件数が4件でありません');

  // 検証2: 0番目のデータが テスト太郎
  assert.strictEqual(result[0].name, 'テスト太郎');
  assert.strictEqual(result[0].memoryNo, '000');

  // 検証3: 1番目のデータが テスト次郎
  assert.strictEqual(result[1].name, 'テスト次郎');
  assert.strictEqual(result[1].memoryNo, '001');

  // 検証4: 2番目のデータが空行 (欠番 002 の補完)
  assert.strictEqual(result[2].name, '', '空行のnameが空文字でありません');
  assert.strictEqual(result[2].memoryNo, '002', '空行のmemoryNoが002でありません');
  assert.strictEqual(result[2].icon1, '1', '空行のデフォルトアイコンが1でありません');

  // 検証5: 3番目のデータが テスト四郎
  assert.strictEqual(result[3].name, 'テスト四郎');
  assert.strictEqual(result[3].memoryNo, '003');

  console.log('すべての検証テストに合格しました！');
} catch (err) {
  console.error('検証失敗:', err.message);
  process.exit(1);
}
