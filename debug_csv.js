import { parseCSVText } from './src/js/services/csv-parser.js';
import fs from 'fs';

const filePath = 'C:/TEMP/GitHub/NTT_BP_AddressbookEditor/NTT_BP_AddressbookEditor/電話帳テスト2_ZXL.csv';
const content = fs.readFileSync(filePath, 'utf8');
const rows = parseCSVText(content);

console.log('Row count:', rows.length);
if (rows.length > 0) {
    console.log('Line 1 column count:', rows[0].length);
    console.log('Line 1 data:', JSON.stringify(rows[0], null, 2));
}
