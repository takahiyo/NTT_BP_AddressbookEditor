import { defineSpec } from '../base-fields.js';

/**
 * ZX2SM 機種仕様定義
 */

const PHONE_SLOTS = 4;

const items = [
  { key: 'ten' },
  { key: 'memoryNo', type: 'memory', width: 'col-memory' },
  { key: 'name',     width: 'col-name',     constraints: { maxBytes: 20, unit: 'byte', onOverflow: 'autoCut' } },
  { key: 'furigana', width: 'col-furigana', constraints: { maxBytes: 12, unit: 'byte', charType: 'halfKana', onOverflow: 'error', onInvalidChar: 'error' } },
  { key: 'groupNo',  width: 'col-group' },
];

/* 電話番号スロット (1-4) を追加 */
for (let i = 1; i <= PHONE_SLOTS; i++) {
  items.push(
    { key: `phone${i}`,     label: `電話番号 ${i}`,   type: 'phone', width: 'col-phone',     constraints: { maxBytes: 32, unit: 'byte', onOverflow: 'autoCut', onInvalidChar: 'error' } },
    { key: `icon${i}`,      label: `アイコン ${i}`,   type: 'number', width: 'col-icon',     defaultValue: '1' },
    { key: `dialAttr${i}`,  label: `発信属性 ${i}`,   type: 'number', width: 'col-dial-attr', defaultValue: '1' }
  );
}

export const ZX2SM_SPEC = defineSpec({
  id: 'zx2sm',
  name: 'ZX2SM',
  family: 'typeSM',
  encoding: 'Shift_JIS',
  inputEncodings: ['Shift_JIS', 'UTF-8', 'UTF-16'],
  phoneNumberSlots: PHONE_SLOTS,
  /* 1行目をヘッダーとして扱う */
  headerColumns: 17,
  requirePhoneNumber: true,
  
  /* TEN番号の範囲 (0-40) */
  tenRange: { min: 0, max: 40 },

  /* アイコン番号の範囲 (1-8) */
  iconRange: { 
    min: 1, 
    max: 8,
    labels: {
      1: 'アイコン1',
      2: 'アイコン2',
      3: 'アイコン3',
      4: 'アイコン4',
      5: 'アイコン5',
      6: 'アイコン6',
      7: 'アイコン7',
      8: 'アイコン8'
    }
  },
  dialAttrRange: {
    min: 1,
    max: 2,
    labels: {
      1: '発信',
      2: '通知'
    }
  },
  
  exportWarnings: [
    { type: 'emptyPhoneRows', messageKey: 'EXPORT_WARNING_EMPTY_ROWS' }
  ],
  
  digitModes: {
    '2digit': {
      label: '2桁',
      shared:   { min: 0,    max: 79,   count: 80 },
      personal: { min: 80,   max: 99,   count: 20 },
    },
    '3digit': {
      label: '3桁（初期値）',
      shared:   { min: 0,    max: 799,  count: 800 },
      personal: { min: 800,  max: 999,  count: 200 },
    },
    '4digit': {
      label: '4桁',
      shared:   { min: 0,    max: 9799, count: 9800 },
      personal: { min: 9800, max: 9999, count: 200 },
    },
  },

  systemCapacity: {
    typeS: { '2digit': 280,   '3digit': 2800,  '4digit': 11800 },
    typeM: { '2digit': 880,   '3digit': 8800,  '4digit': 17800 },
  },
}, items);

