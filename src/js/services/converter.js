/**
 * 文字変換ユーティリティ
 * 全角⇔半角変換、記号削除、超過文字カット
 */

import { getByteLength, truncateToBytes } from '../utils/char-utils.js';

/* ============================================
 * 全角⇔半角 変換テーブル
 * ============================================ */

/** 半角カナ → 全角カナ マッピング */
const HALF_TO_FULL_KANA = {
  'ｦ': 'ヲ', 'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
  'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ', 'ｯ': 'ッ', 'ｰ': 'ー',
  'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
  'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
  'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
  'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
  'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
  'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
  'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
  'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
  'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
  'ﾜ': 'ワ', 'ﾝ': 'ン',
  'ﾞ': '゛', 'ﾟ': '゜',
};

/** 濁音・半濁音の合成マッピング（半角2文字 → 全角1文字） */
const DAKUTEN_MAP = {
  'ｶﾞ': 'ガ', 'ｷﾞ': 'ギ', 'ｸﾞ': 'グ', 'ｹﾞ': 'ゲ', 'ｺﾞ': 'ゴ',
  'ｻﾞ': 'ザ', 'ｼﾞ': 'ジ', 'ｽﾞ': 'ズ', 'ｾﾞ': 'ゼ', 'ｿﾞ': 'ゾ',
  'ﾀﾞ': 'ダ', 'ﾁﾞ': 'ヂ', 'ﾂﾞ': 'ヅ', 'ﾃﾞ': 'デ', 'ﾄﾞ': 'ド',
  'ﾊﾞ': 'バ', 'ﾋﾞ': 'ビ', 'ﾌﾞ': 'ブ', 'ﾍﾞ': 'ベ', 'ﾎﾞ': 'ボ',
  'ﾊﾟ': 'パ', 'ﾋﾟ': 'ピ', 'ﾌﾟ': 'プ', 'ﾍﾟ': 'ペ', 'ﾎﾟ': 'ポ',
  'ｳﾞ': 'ヴ',
};

/** 全角カナ → 半角カナ の逆マッピングを自動生成 */
const FULL_TO_HALF_KANA = {};
Object.entries(HALF_TO_FULL_KANA).forEach(([half, full]) => {
  FULL_TO_HALF_KANA[full] = half;
});
/* 濁音・半濁音の逆マッピング */
Object.entries(DAKUTEN_MAP).forEach(([half, full]) => {
  FULL_TO_HALF_KANA[full] = half;
});

/**
 * 全角英数字を半角に変換
 * @param {string} str - 対象文字列
 * @returns {string} 変換後文字列
 */
export function toHalfWidthAlphaNum(str) {
  if (!str) return '';
  return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, char =>
    String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
  );
}

/**
 * 半角英数字を全角に変換
 * @param {string} str - 対象文字列
 * @returns {string} 変換後文字列
 */
export function toFullWidthAlphaNum(str) {
  if (!str) return '';
  return str.replace(/[A-Za-z0-9]/g, char =>
    String.fromCharCode(char.charCodeAt(0) + 0xFEE0)
  );
}

/**
 * 全角カナを半角カナに変換
 * @param {string} str - 対象文字列
 * @returns {string} 変換後文字列
 */
export function toHalfWidthKana(str) {
  if (!str) return '';
  let result = '';
  for (const char of str) {
    result += FULL_TO_HALF_KANA[char] || char;
  }
  return result;
}

/**
 * 半角カナを全角カナに変換（濁音・半濁音対応）
 * @param {string} str - 対象文字列
 * @returns {string} 変換後文字列
 */
export function toFullWidthKana(str) {
  if (!str) return '';
  let result = '';
  let i = 0;
  const chars = [...str];

  while (i < chars.length) {
    /* 濁音・半濁音の合成チェック（2文字セット） */
    if (i + 1 < chars.length) {
      const pair = chars[i] + chars[i + 1];
      if (DAKUTEN_MAP[pair]) {
        result += DAKUTEN_MAP[pair];
        i += 2;
        continue;
      }
    }
    result += HALF_TO_FULL_KANA[chars[i]] || chars[i];
    i++;
  }
  return result;
}

/**
 * 文字列全体を半角に変換（英数字＋カナ）
 * @param {string} str - 対象文字列
 * @returns {string} 変換後文字列
 */
export function toHalfWidth(str) {
  return toHalfWidthKana(toHalfWidthAlphaNum(str));
}

/**
 * 文字列全体を全角に変換（英数字＋カナ）
 * @param {string} str - 対象文字列
 * @returns {string} 変換後文字列
 */
export function toFullWidth(str) {
  return toFullWidthKana(toFullWidthAlphaNum(str));
}

/* ============================================
 * 記号削除
 * ============================================ */

/** 削除対象の記号パターン（フリガナ等から除去） */
const SYMBOL_PATTERN = /[()（）\[\]【】「」『』、。,.・\-\s#＃]/g;

/**
 * 記号を一括削除
 * @param {string} str - 対象文字列
 * @returns {string} 記号削除後の文字列
 */
export function removeSymbols(str) {
  if (!str) return '';
  return str.replace(SYMBOL_PATTERN, '');
}

/* ============================================
 * 一括処理
 * ============================================ */

/**
 * 指定バイト数超過分を一括カット
 * @param {Array<Object>} data - 全行データ
 * @param {string} fieldKey - 対象フィールドのキー
 * @param {number} maxBytes - 最大バイト数
 * @returns {{ data: Array<Object>, truncatedCount: number }} 処理後データと変更件数
 */
export function truncateField(data, fieldKey, maxBytes) {
  let truncatedCount = 0;
  const newData = data.map(row => {
    const value = row[fieldKey] || '';
    if (getByteLength(value) > maxBytes) {
      truncatedCount++;
      return { ...row, [fieldKey]: truncateToBytes(value, maxBytes) };
    }
    return row;
  });
  return { data: newData, truncatedCount };
}

/**
 * 電話番号が全スロット空の行を削除
 * @param {Array<Object>} data - 全行データ
 * @param {number} phoneSlots - 電話番号スロット数
 * @returns {{ data: Array<Object>, deletedCount: number }}
 */
export function deleteEmptyPhoneRows(data, phoneSlots) {
  const before = data.length;
  const filtered = data.filter(row => {
    for (let i = 1; i <= phoneSlots; i++) {
      if (row[`phone${i}`] && row[`phone${i}`].trim().length > 0) {
        return true;
      }
    }
    return false;
  });
  return { data: filtered, deletedCount: before - filtered.length };
}
