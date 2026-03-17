import { detectSpecFromCSV } from './src/js/services/csv-parser.js';
import { ZXL_SPEC } from './src/js/models/specs/zxl.js';
import { A1_SPEC } from './src/js/models/specs/a1.js';
import { ZX2SM_SPEC } from './src/js/models/specs/zx2sm.js';

const allSpecs = [ZXL_SPEC, A1_SPEC, ZX2SM_SPEC];

function test(name, fields, hasBOM = false) {
    const result = detectSpecFromCSV(fields, hasBOM, allSpecs);
    console.log(`Test: ${name} -> Detected: ${result}`);
}

// Case 1: ZX2SM (17 cols, with header)
test('ZX2SM Header', ['TEN', 'メモリ番号', '名称', 'ﾌﾘｶﾞﾅ', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17']);

// Case 2: A1 (17 cols, no header)
test('A1 Data', ['0', '1', '1', '0', '1', '0', '0', 'Name', 'Kana', 'Phone1', '1', '1', 'Phone2', '1', '1', '0', 'DI']);

// Case 3: ZX-L (20 cols, no header)
test('ZX-L Data', ['0', '1', '1', '0', '0', '0', 'Name', 'Kana', 'Phone1', '16', '0', 'Phone2', '16', '0', 'Phone3', '16', '0', 'Phone4', '16', '0']);

// Case 4: A1 with BOM
test('A1 with BOM', ['0', '1', '1', '0', '1', '0', '0', 'Name', 'Kana', 'Phone1', '1', '1', 'Phone2', '1', '1', '0', 'DI'], true);
