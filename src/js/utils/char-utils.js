/**
 * 文字種判定・バイト数計算ユーティリティ
 * Shift_JISバイト幅での文字数カウント、文字種チェック等
 */

/**
 * 文字のShift_JISバイト幅を取得
 * 全角文字=2バイト、半角文字=1バイト
 * @param {string} char - 1文字
 * @returns {number} バイト幅（1 or 2）
 */
export function getCharByteWidth(char) {
  const code = char.charCodeAt(0);
  /* 半角カナ: U+FF61〜U+FF9F */
  if (code >= 0xFF61 && code <= 0xFF9F) {
    return 1;
  }
  /* ASCII制御文字＋印刷可能文字: U+0000〜U+007F */
  if (code <= 0x007F) {
    return 1;
  }
  /* その他（全角文字等）は2バイト */
  return 2;
}

/**
 * 文字列のShift_JISバイト数を計算
 * @param {string} str - 対象文字列
 * @returns {number} バイト数
 */
export function getByteLength(str) {
  if (!str) return 0;
  let bytes = 0;
  for (const char of str) {
    bytes += getCharByteWidth(char);
  }
  return bytes;
}

/**
 * 指定バイト数以内で文字列を切り詰める
 * 全角文字の途中で切れないよう調整
 * @param {string} str - 対象文字列
 * @param {number} maxBytes - 最大バイト数
 * @returns {string} 切り詰め後の文字列
 */
export function truncateToBytes(str, maxBytes) {
  if (!str) return '';
  let bytes = 0;
  let result = '';
  for (const char of str) {
    const charBytes = getCharByteWidth(char);
    if (bytes + charBytes > maxBytes) break;
    bytes += charBytes;
    result += char;
  }
  return result;
}

/**
 * 文字が半角カナかどうか判定
 * @param {string} char - 1文字
 * @returns {boolean}
 */
export function isHalfWidthKana(char) {
  const code = char.charCodeAt(0);
  return code >= 0xFF61 && code <= 0xFF9F;
}

/**
 * 文字が半角英数記号かどうか判定（ASCII印刷可能文字）
 * @param {string} char - 1文字
 * @returns {boolean}
 */
export function isHalfWidthAlphaNum(char) {
  const code = char.charCodeAt(0);
  return code >= 0x0020 && code <= 0x007E;
}

/**
 * 文字列が半角文字のみで構成されているか判定
 * （半角英数記号 + 半角カナ）
 * @param {string} str - 対象文字列
 * @returns {boolean}
 */
export function isAllHalfWidth(str) {
  if (!str) return true;
  for (const char of str) {
    if (!isHalfWidthAlphaNum(char) && !isHalfWidthKana(char)) {
      return false;
    }
  }
  return true;
}

/**
 * 電話番号として有効な文字かどうか判定
 * 半角数字、ハイフン、アスタリスク、シャープ、プラス
 * @param {string} char - 1文字
 * @returns {boolean}
 */
export function isValidPhoneChar(char) {
  return /^[0-9\-*#+ ]$/.test(char);
}

/**
 * 文字列内の非対応文字をすべて検出
 * @param {string} str - 対象文字列
 * @param {Function} validatorFn - 文字ごとの判定関数（trueで有効）
 * @returns {Array<{char: string, index: number}>} 非対応文字の配列
 */
export function findInvalidChars(str, validatorFn) {
  if (!str) return [];
  const invalid = [];
  let index = 0;
  for (const char of str) {
    if (!validatorFn(char)) {
      invalid.push({ char, index });
    }
    index++;
  }
  return invalid;
}

/**
 * よくある誤入力パターンを検出
 * 全角数字、全角ハイフン等の電話番号欄での誤入力
 * @param {string} str - 対象文字列
 * @returns {Array<{char: string, index: number, suggestion: string}>}
 */
export function findCommonMistakes(str) {
  if (!str) return [];
  /** よくある誤入力マッピング（全角→正しい半角） */
  const mistakeMap = {
    '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
    '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
    'Ｏ': '0',  /* 全角アルファベットO → 数字0 */
    'ｏ': '0',  /* 全角小文字o → 数字0 */
    'O': '0',   /* 半角アルファベットO → 数字0（文脈による） */
    'ー': '-',  /* 長音 → ハイフン */
    '－': '-',  /* 全角ハイフン → 半角ハイフン */
    '—': '-',   /* emダッシュ → ハイフン */
    '–': '-',   /* enダッシュ → ハイフン */
    '―': '-',   /* ホリゾンタルバー → ハイフン */
  };

  const mistakes = [];
  let index = 0;
  for (const char of str) {
    if (mistakeMap[char]) {
      mistakes.push({
        char,
        index,
        suggestion: mistakeMap[char],
      });
    }
    index++;
  }
  return mistakes;
}
