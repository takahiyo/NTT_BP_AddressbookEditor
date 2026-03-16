import { defineSpec } from '../base-fields.js';

/**
 * A1 Directory 機種仕様定義
 */

const items = [
  { key: 'ten', label: 'TEN', type: 'number', width: 'col-ten', defaultValue: '0' },
  { key: 'dataType', label: 'データ種別', type: 'number', width: 'col-default', defaultValue: '1' },
  { key: 'version', label: 'バージョン', type: 'number', width: 'col-default', defaultValue: '1' },
  { key: 'memoryNo', label: 'メモリ番号', type: 'memory', width: 'col-memory' },
  { key: 'sharedGroupNo', label: '共用G', type: 'number', width: 'col-group', defaultValue: '1' },
  { key: 'groupNo', label: 'グループ', type: 'number', width: 'col-group', defaultValue: '0' },
  { key: 'lenType', label: 'LEN種別', type: 'number', width: 'col-default', defaultValue: '0' },
  { key: 'name', label: '名称', type: 'text', width: 'col-name', constraints: { maxBytes: 40, unit: 'byte', onOverflow: 'autoCut' } },
  { key: 'furigana', label: 'ﾌﾘｶﾞﾅ', type: 'text', width: 'col-furigana', constraints: { maxBytes: 12, unit: 'byte', charType: 'halfKana', onOverflow: 'error', onInvalidChar: 'error' } },
  { key: 'phone1', label: '電話番号 1', type: 'phone', width: 'col-phone', constraints: { maxBytes: 32, unit: 'byte', onOverflow: 'autoCut', onInvalidChar: 'error' } },
  { key: 'icon1', label: 'アイコン 1', type: 'number', width: 'col-icon', defaultValue: '1' },
  { key: 'dialAttr1', label: '発信属性 1', type: 'number', width: 'col-dial-attr', defaultValue: '1' },
  { key: 'phone2', label: '電話番号 2', type: 'phone', width: 'col-phone', constraints: { maxBytes: 32, unit: 'byte', onOverflow: 'autoCut', onInvalidChar: 'error' } },
  { key: 'icon2', label: 'アイコン 2', type: 'number', width: 'col-icon', defaultValue: '1' },
  { key: 'dialAttr2', label: '発信属性 2', type: 'number', width: 'col-dial-attr', defaultValue: '1' },
  { key: 'dialInType', label: 'DI種別', type: 'number', width: 'col-default', defaultValue: '0' },
  { key: 'dialInContent', label: 'DI内容', type: 'text', width: 'col-default' }
];

export const A1_SPEC = defineSpec({
  id: 'a1',
  name: 'A1 Directory',
  family: 'typeA1',
  encoding: 'UTF-8BOM',   // 出力はUTF-8BOM
  inputEncodings: ['UTF-8'], // 入力はUTF-8(BOM)のみ
  phoneNumberSlots: 2,
  expectedColumns: 17,    // ヘッダーなし17列
  hasHeader: false,       // ヘッダー行なし
  requirePhoneNumber: true,
  forbiddenChars: ['&', '<', '>', '"', "'", ','],
  forceQuoteColumns: ['name', 'furigana', 'phone1', 'phone2', 'dialInContent'], // 出力時に"で囲む列
  iconRange: { min: 1, max: 9 },      // アイコン番号は1-9
  dialAttrRange: { min: 0, max: 2 },  // 発信属性は0-2

  digitModes: {
    '4digit': {
      label: '4桁',
      shared:   { min: 0,    max: 19999, count: 20000 },
      personal: { min: 20000, max: 20199, count: 200 },
    },
  },

  systemCapacity: {
    typeA1: { '4digit': 20200 },
  },
}, items);
