import { defineSpec } from '../base-fields.js';

/**
 * ZXHome 機種仕様定義
 * ZX2SMと同じ17列・ヘッダー付きだが、ヘッダーラベルが異なる
 * （例: 「電話番号(1)」vs ZX2SMの「電話番号 1」）
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
    { key: `phone${i}`,     label: `電話番号(${i})`,     type: 'phone', width: 'col-phone',     constraints: { maxBytes: 32, unit: 'byte', onOverflow: 'autoCut', onInvalidChar: 'error' } },
    { key: `icon${i}`,      label: `アイコン番号(${i})`,  type: 'number', width: 'col-icon',     defaultValue: '1' },
    { key: `dialAttr${i}`,  label: `発信番号属性(${i})`,  type: 'number', width: 'col-dial-attr', defaultValue: '1' }
  );
}

export const ZXH_SPEC = defineSpec({
  id: 'zxh',
  name: 'ZXHome',
  family: 'typeH',
  encoding: 'Shift_JIS',
  inputEncodings: ['Shift_JIS', 'UTF-8'],
  phoneNumberSlots: PHONE_SLOTS,
  headerColumns: 17,
  requirePhoneNumber: true,
  requireTen: true,

  /* TEN番号の範囲 (0-8) */
  tenRange: { min: 0, max: 8 },

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

  /* 発信属性の範囲 (1-2) */
  dialAttrRange: { 
    min: 1, 
    max: 2,
    labels: {
      1: '発信',
      2: '通知'
    }
  },

  /* 書出時のエクスポート警告: データが存在しないcsvは読み込みエラーとなるため、空行警告を出す */
  exportWarnings: [
    { type: 'emptyPhoneRows', messageKey: 'EXPORT_WARNING_EMPTY_ROWS' }
  ],

  /**
   * 自動判別用: ヘッダーラベルに含まれるユニークなパターン
   * ZX2SMは「電話番号 1」だが、ZXHは「電話番号(1)」
   */
  headerSignature: '電話番号(1)',

  digitModes: {
    '2digit': {
      label: '2桁',
      shared:   { min: 0,    max: 79,   count: 80 },
    },
    '3digit': {
      label: '3桁（初期値）',
      shared:   { min: 0,    max: 799,  count: 800 },
    },
  },

  systemCapacity: {
    typeH: { '2digit': 80, '3digit': 800 },
  },
}, items);
