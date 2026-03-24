import { defineSpec } from '../base-fields.js';

/**
 * ZX2L 機種仕様定義
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

export const ZX2L_SPEC = defineSpec({
  id: 'zx2l',
  name: 'ZX2L',
  family: 'typeL',
  encoding: 'Shift_JIS',
  inputEncodings: ['Shift_JIS', 'UTF-8'],
  phoneNumberSlots: PHONE_SLOTS,
  expectedColumns: 20,    // メタデータ6 + 名称/フリガナ2 + (電話/アイコン/属性)*4 = 20
  hasHeader: false,       // ヘッダーなし
  requirePhoneNumber: true,
  
  /* 出力時に引用符で囲むカラム: 名称、フリガナ、電話番号 */
  forceQuoteColumns: [
    'name', 'furigana', 
    'phone1', 'phone2', 'phone3', 'phone4'
  ],

  /* TEN番号の範囲 (0-576) */
  tenRange: { min: 0, max: 576 },

  /* アイコン・属性の範囲定義 */
  iconRange: { 
    /* 記載順が他機種のアイコン番号 1-9 と対応する */
    allowed: [
      16, // 1: 標準
      17, // 2: 
      20, // 3: 
      21, // 4: 
      24, // 5: 
      25, // 6: 
      28, // 7: 
      52, // 8: 
      23  // 9: 
    ],
    labels: {
      16: '一般電話（黒電話マーク）',
      17: '携帯電話（携帯端末マーク）',
      20: '会社（ビルマーク）',
      21: '自宅（家マーク）',
      24: '代表（「代」の文字）',
      25: '直通（「直」の文字）',
      28: 'FAX（「FAX」の文字）',
      52: 'TV電話（ビデオカメラマーク）',
      23: '内線（「内」の文字）'
    },
    default: 16
  },
  dialAttrRange: { 
    min: 0, 
    max: 2,
    labels: {
      0: '一般外線番号',
      1: 'PBX内線番号',
      2: '内線番号'
    },
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
