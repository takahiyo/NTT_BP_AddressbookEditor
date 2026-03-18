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
  if (!str) return '';
  // ひらがなを全角カタカナに変換
  const val = str.replace(/[\u3041-\u3096]/g, match => 
    String.fromCharCode(match.charCodeAt(0) + 0x60)
  );
  return toHalfWidthKana(toHalfWidthAlphaNum(val));
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

/**
 * 電話番号とアイコン・属性の不整合を一括補正
 * @param {Array<Object>} data - 全行データ
 * @param {Object} spec - 機種仕様
 * @returns {{ data: Array<Object>, changedCount: number }}
 */
export function normalizePhoneInconsistencies(data, spec) {
  const phoneSlots = spec.phoneNumberSlots;
  const iconRange = spec.iconRange || { min: 1, max: 8 };
  const dialAttrRange = spec.dialAttrRange || { min: 1, max: 2 };

  let changedCount = 0;
  const newData = data.map(row => {
    let rowChanged = false;
    const newRow = { ...row };

    for (let i = 1; i <= phoneSlots; i++) {
      const pKey = `phone${i}`;
      const iKey = `icon${i}`;
      const dKey = `dialAttr${i}`;

      const phone = (row[pKey] || '').trim();
      const icon = row[iKey];
      const dialAttr = row[dKey];

      const hasPhone = phone.length > 0;

      /* アイコン・属性の妥当性チェック */
      const numIcon = parseInt(icon, 10);
      let isValidIcon = false;
      if (iconRange.allowed) {
        isValidIcon = icon && iconRange.allowed.includes(numIcon);
      } else {
        isValidIcon = icon && !isNaN(numIcon) && numIcon >= iconRange.min && numIcon <= iconRange.max;
      }
      
      const numDialAttr = parseInt(dialAttr, 10);
      const isValidDialAttr = dialAttr && !isNaN(numDialAttr) && numDialAttr >= dialAttrRange.min && numDialAttr <= dialAttrRange.max;

      if (hasPhone) {
        /* 電話番号あり: いずれかが不正なら初期値に（iconは定義があればそれを、なければ1） */
        if (!isValidIcon || !isValidDialAttr) {
          if (!isValidIcon) newRow[iKey] = (iconRange.default || (iconRange.allowed ? iconRange.allowed[0] : 1)).toString();
          if (!isValidDialAttr) newRow[dKey] = (dialAttrRange.default || dialAttrRange.min || 1).toString();
          rowChanged = true;
        }
      } else {
        /* 電話番号なし: いずれかがデフォルト(1 or specのdefault)以外なら初期値に */
        const defIcon = (iconRange.default || (iconRange.allowed ? iconRange.allowed[0] : 1)).toString();
        const defDialAttr = (dialAttrRange.default || dialAttrRange.min || 1).toString();
        
        if (icon !== defIcon || dialAttr !== defDialAttr) {
          newRow[iKey] = defIcon;
          newRow[dKey] = defDialAttr;
          rowChanged = true;
        }
      }
    }

    if (rowChanged) changedCount++;
    return newRow;
  });

  return { data: newData, changedCount };
}

/**
 * アイコン番号のみを機種仕様に合わせて正規化
 * @param {Array<Object>} data - 全行データ
 * @param {Object} spec - 機種仕様
 * @returns {{ data: Array<Object>, normalizedCount: number }}
 */
export function normalizeIcons(data, spec) {
  const phoneSlots = spec.phoneNumberSlots;
  const iconRange = spec.iconRange || { min: 1, max: 8 };
  const defaultIcon = (iconRange.default || (iconRange.allowed ? iconRange.allowed[0] : 1)).toString();

  let normalizedCount = 0;
  const newData = data.map(row => {
    let rowChanged = false;
    const newRow = { ...row };

    for (let i = 1; i <= phoneSlots; i++) {
      const iKey = `icon${i}`;
      const icon = row[iKey];
      const numIcon = parseInt(icon, 10);

      let isValid = false;
      if (iconRange.allowed) {
        isValid = icon && iconRange.allowed.includes(numIcon);
      } else {
        isValid = icon && !isNaN(numIcon) && numIcon >= iconRange.min && numIcon <= iconRange.max;
      }

      if (!isValid) {
        newRow[iKey] = defaultIcon;
        rowChanged = true;
        normalizedCount++;
      }
    }

    return newRow;
  });

  return { data: newData, normalizedCount };
}
