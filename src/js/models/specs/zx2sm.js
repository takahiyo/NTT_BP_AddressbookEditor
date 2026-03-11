/**
 * ZX2SM 機種仕様定義
 * TypeS/M系ビジネスフォンのCSVフォーマットと制限事項
 *
 * 確認済み仕様：
 * - 名称: 20バイト（全角10文字/半角20文字）超過時自動カット
 * - フリガナ: 12バイト（半角12文字）非対応文字で読込エラー
 * - 電話番号: 32バイト（半角32文字）超過時自動カット、非対応文字で読込エラー
 * - 電話番号が空の行はエラー → 不要行は削除必須
 * - MATからANSI(Shift_JIS)出力、入力はANSI/UTF-8/UTF-16対応
 * - タイトル行: A〜Q列(17列)にデータ必須（内容不問）
 */

import { buildColumns } from '../base-fields.js';

/**
 * フィールドごとの制約定義
 * onOverflow: 'autoCut' = 実機が自動カット / 'error' = 実機がエラーを出す
 * onInvalidChar: 'error' = 非対応文字で実機がエラーを出す
 */
const FIELD_CONSTRAINTS = {
  name: {
    maxBytes: 20,
    unit: 'byte',
    onOverflow: 'autoCut',
  },
  furigana: {
    maxBytes: 12,
    unit: 'byte',
    charType: 'halfKana',
    onOverflow: 'error',
    onInvalidChar: 'error',
  },
};

/**
 * 電話番号フィールドの共通制約を生成
 * @param {number} slots - スロット数
 * @returns {Object} phoneN キーごとの制約
 */
function buildPhoneConstraints(slots) {
  const constraints = {};
  for (let i = 1; i <= slots; i++) {
    constraints[`phone${i}`] = {
      maxBytes: 32,
      unit: 'byte',
      onOverflow: 'autoCut',
      onInvalidChar: 'error',
    };
  }
  return constraints;
}

/** 電話番号スロット数 */
const PHONE_SLOTS = 4;

/** 全フィールドの上書き定義（base-fieldsに適用） */
const allOverrides = {
  ...FIELD_CONSTRAINTS,
  ...buildPhoneConstraints(PHONE_SLOTS),
};

/**
 * ZX2SM 機種仕様
 */
export const ZX2SM_SPEC = {
  /** 機種識別ID */
  id: 'zx2sm',

  /** 表示名 */
  name: 'ZX2SM',

  /** 機種ファミリー（TypeS/M系） */
  family: 'typeSM',

  /** 出力エンコーディング（MATからの出力形式） */
  encoding: 'Shift_JIS',

  /** 入力対応エンコーディング */
  inputEncodings: ['Shift_JIS', 'UTF-8', 'UTF-16'],

  /** 電話番号スロット数 */
  phoneNumberSlots: PHONE_SLOTS,

  /** CSVヘッダーのカラム数（A〜Q = 17列、内容不問） */
  headerColumns: 17,

  /** 電話番号がすべて空の行はエラーとなる */
  requirePhoneNumber: true,

  /** カラム定義（CSV列順） */
  columns: buildColumns(allOverrides, PHONE_SLOTS),

  /** フィールド制約（バリデーションエンジン用） */
  fieldConstraints: {
    ...FIELD_CONSTRAINTS,
    ...buildPhoneConstraints(PHONE_SLOTS),
  },

  phoneNumberSlots: 3,
  fields: [
    { key: 'memoryNo',    label: 'メモリ番号',  type: 'memory', width: 'col-memory' },
    { key: 'name',        label: '名称',        type: 'text',   width: 'col-name' },
    { key: 'furigana',    label: 'フリガナ',    type: 'text',   width: 'col-furigana' },
    { key: 'groupNo',     label: 'グループ',    type: 'text',   width: 'col-group' },
    { key: 'phone1',      label: '電話番号 1',  type: 'phone',  width: 'col-phone' },
    { key: 'icon1',       label: 'アイコン 1',  type: 'text',   width: 'col-icon' },
    { key: 'dialAttr1',   label: '発信属性 1',  type: 'text',   width: 'col-dial-attr' },
    { key: 'phone2',      label: '電話番号 2',  type: 'phone',  width: 'col-phone' },
    { key: 'icon2',       label: 'アイコン 2',  type: 'text',   width: 'col-icon' },
    { key: 'dialAttr2',   label: '発信属性 2',  type: 'text',   width: 'col-dial-attr' },
    { key: 'phone3',      label: '電話番号 3',  type: 'phone',  width: 'col-phone' },
    { key: 'icon3',       label: 'アイコン 3',  type: 'text',   width: 'col-icon' },
    { key: 'dialAttr3',   label: '発信属性 3',  type: 'text',   width: 'col-dial-attr' },
  ],

  /**
   * 桁数モード別メモリ番号範囲
   * shared: 共通電話帳, personal: 個別電話帳
   */
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

  /**
   * システム総数（共通＋個別の合計上限）
   */
  systemCapacity: {
    typeS: { '2digit': 280,   '3digit': 2800,  '4digit': 11800 },
    typeM: { '2digit': 880,   '3digit': 8800,  '4digit': 17800 },
  },
};
