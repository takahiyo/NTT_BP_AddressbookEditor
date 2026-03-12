/**
 * フリガナ生成サービス
 * 名称からフリガナ（半角カタカナ）を推測・生成する
 */

import { toHalfWidthKana, removeSymbols } from './converter.js';

/** 英数字から読み（全角カタカナ）へのマッピング */
const ALPHANUM_TO_KANA = {
  // 英大文字
  'A': 'エー', 'B': 'ビー', 'C': 'シー', 'D': 'ディー', 'E': 'イー',
  'F': 'エフ', 'G': 'ジー', 'H': 'エイチ', 'I': 'アイ', 'J': 'ジェー',
  'K': 'ケー', 'L': 'エル', 'M': 'エム', 'N': 'エヌ', 'O': 'オー',
  'P': 'ピー', 'Q': 'キュー', 'R': 'アール', 'S': 'エス', 'T': 'ティー',
  'U': 'ユー', 'V': 'ブイ', 'W': 'ダブリュー', 'X': 'エックス', 'Y': 'ワイ', 'Z': 'ゼット',
  
  // 英小文字
  'a': 'エー', 'b': 'ビー', 'c': 'シー', 'd': 'ディー', 'e': 'イー',
  'f': 'エフ', 'g': 'ジー', 'h': 'エイチ', 'i': 'アイ', 'j': 'ジェー',
  'k': 'ケー', 'l': 'エル', 'm': 'エム', 'n': 'エヌ', 'o': 'オー',
  'p': 'ピー', 'q': 'キュー', 'r': 'アール', 's': 'エス', 't': 'ティー',
  'u': 'ユー', 'v': 'ブイ', 'w': 'ダブリュー', 'x': 'エックス', 'y': 'ワイ', 'z': 'ゼット',

  // 数字
  '0': 'ゼロ', '1': 'イチ', '2': 'ニ', '3': 'サン', '4': 'ヨン',
  '5': 'ゴ', '6': 'ロク', '7': 'ナナ', '8': 'ハチ', '9': 'キュウ',
  
  // 全角英数字（念のため）
  'Ａ': 'エー', 'Ｂ': 'ビー', 'Ｃ': 'シー', 'Ｄ': 'ディー', 'Ｅ': 'イー',
  'Ｆ': 'エフ', 'Ｇ': 'ジー', 'Ｈ': 'エイチ', 'Ｉ': 'アイ', 'Ｊ': 'ジェー',
  'Ｋ': 'ケー', 'Ｌ': 'エル', 'Ｍ': 'エム', 'Ｎ': 'エヌ', 'Ｏ': 'オー',
  'Ｐ': 'ピー', 'Ｑ': 'キュー', 'Ｒ': 'アール', 'Ｓ': 'エス', 'Ｔ': 'ティー',
  'Ｕ': 'ユー', 'Ｖ': 'ブイ', 'Ｗ': 'ダブリュー', 'Ｘ': 'エックス', 'Ｙ': 'ワイ', 'Ｚ': 'ゼット',
  '０': 'ゼロ', '１': 'イチ', '２': 'ニ', '３': 'サン', '４': 'ヨン',
  '５': 'ゴ', '６': 'ロク', '７': 'ナナ', '８': 'ハチ', '９': 'キュウ',
};

/**
 * 単一の文字列からフリガナを生成
 * @param {string} name - 名称
 * @returns {string} 生成された半角カタカナ
 */
export function generateFurigana(name) {
  if (!name) return '';

  let furigana = '';
  const trimmedName = removeSymbols(name);

  for (const char of trimmedName) {
    // 英数字マッピングにあるか確認
    if (ALPHANUM_TO_KANA[char]) {
      furigana += ALPHANUM_TO_KANA[char];
    } else {
      // マッピングにない場合はそのまま（ひらがな・カタカナ・漢字想定）
      furigana += char;
    }
  }

  // 最後に一括で半角カタカナに変換（ひらがなは変換されないため、必要に応じて事前変換を検討）
  // ユーザー要求により「英数は入れない（ｴｰ, ｷｭｳの様にする）」を優先
  return toHalfWidthKana(toHiraganaToKatakana(furigana)).substring(0, 24);
}

/**
 * ひらがなをカタカナに変換
 * @param {string} str 
 * @returns {string}
 */
function toHiraganaToKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, function(match) {
    const chr = match.charCodeAt(0) + 0x60;
    return String.fromCharCode(chr);
  });
}

/**
 * 全データのフリガナ生成
 * @param {Array<Object>} data - 全行データ
 * @param {Object} spec - 機種仕様
 * @returns {Array<Object>} 比較用データ（{originalIndex, current, generated, fieldKey} の配列）
 */
export function processAllFurigana(data, spec) {
  const result = [];
  const nameKey = spec.columns.find(col => col.key.includes('name'))?.key || 'name';
  const kanaKey = spec.columns.find(col => col.key.includes('kana'))?.key || 'kana';

  data.forEach((row, index) => {
    const name = row[nameKey] || '';
    if (!name) return;

    const generated = generateFurigana(name);
    const current = row[kanaKey] || '';

    // 生成された値が現在の値と異なる場合、または現在の値が空の場合
    if (generated !== current) {
      result.push({
        index,
        fieldKey: kanaKey,
        current,
        generated,
        name
      });
    }
  });

  return result;
}
