import { defineSpec } from '../base-fields.js';

/**
 * ZX-L 機種仕様定義
 */

const PHONE_SLOTS = 4;

const items = [
  { key: 'ten',           label: 'TEN',       type: 'number', width: 'col-ten',     defaultValue: '0' },
  { key: 'dataType',      label: 'データ種別', type: 'number', width: 'col-default', defaultValue: '1' },
  { key: 'version',       label: 'バージョン', type: 'number', width: 'col-default', defaultValue: '1' },
  { key: 'memoryNo',      label: 'メモリ番号', type: 'memory', width: 'col-memory' },
  { key: 'reserved1',     label: '予約1',      type: 'number', width: 'col-default', defaultValue: '0' },
  { key: 'reserved2',     label: '予約2',      type: 'number', width: 'col-default', defaultValue: '0' },
  { key: 'name',          label: '名称',       type: 'text',   width: 'col-name',     constraints: { maxBytes: 20, unit: 'byte', onOverflow: 'autoCut' } },
  { key: 'furigana',      label: 'ﾌﾘｶﾞﾅ',      type: 'text',   width: 'col-furigana', constraints: { maxBytes: 12, unit: 'byte', charType: 'halfKana', onOverflow: 'error', onInvalidChar: 'error' } },
];

/* 電話番号スロット (1-4) */
for (let i = 1; i <= PHONE_SLOTS; i++) {
  items.push(
    { key: `phone${i}`,     label: `電話番号 ${i}`,   type: 'phone', width: 'col-phone',     constraints: { maxBytes: 32, unit: 'byte', onOverflow: 'error', onInvalidChar: 'error' } },
    { key: `icon${i}`,      label: `アイコン ${i}`,   type: 'number', width: 'col-icon',     defaultValue: '16' },
    { key: `dialAttr${i}`,  label: `発信属性 ${i}`,   type: 'number', width: 'col-dial-attr', defaultValue: '0' }
  );
}

export const ZXL_SPEC = defineSpec({
  id: 'zxl',
  name: 'ZX-L',
  family: 'typeL',
  encoding: 'Shift_JIS',
  inputEncodings: ['Shift_JIS', 'UTF-8'],
  phoneNumberSlots: PHONE_SLOTS,
  expectedColumns: 20,    // メタデータ6 + 名称/フリガナ2 + (電話/アイコン/属性)*4 = 20
  hasHeader: false,       // ヘッダーなし
  requirePhoneNumber: true,
  
  /* 引用符の扱い: 名称、フリガナ、電話番号をトリプル引用符対象とする */
  tripleQuoteColumns: [
    'name', 'furigana', 
    'phone1', 'phone2', 'phone3', 'phone4'
  ],

  /* アイコン・属性の範囲定義 */
  iconRange: { 
    allowed: [16, 17, 20, 21, 24, 25, 28, 52, 23],
    default: 16
  },
  dialAttrRange: { 
    min: 0, 
    max: 2,
    default: 0
  },

  /* 文字列としてのメモリ番号を常に行番号ベースで出力する */
  autoMemoryNoOnExport: true,

  digitModes: {
    '4digit': {
      label: '4桁',
      shared:   { min: 0,    max: 19799, count: 19800 },
    },
  },

  systemCapacity: {
    typeL: { '4digit': 19800 },
  },
}, items);
