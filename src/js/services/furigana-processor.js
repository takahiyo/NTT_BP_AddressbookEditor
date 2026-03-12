/**
 * フリガナ生成サービス
 * 名称からフリガナ（半角カタカナ）を推測・生成する
 *
 * 処理フロー:
 * 1. 名称から記号を除去
 * 2. ユーザー辞書 + 内蔵辞書（FURIGANA_DICT）でマッチング
 *    - まずは最長一致（氏名まるごと、または苗字のみ等）を試行
 *    - 未解決の漢字がある場合、1文字ずつに分解して再試行
 * 3. 英数字をカタカナ読みに変換（ALPHANUM_TO_KANA）
 * 4. ひらがな・全角カタカナをそのまま利用
 * 5. それ以外の未解決漢字等は除去
 * 6. 半角カタカナに変換して出力
 */

import { toHalfWidthKana, removeSymbols } from './converter.js';
import { applyDictionary, FURIGANA_DICT } from '../utils/furigana-dict.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('furigana');

/* ============================================
 * 英数字→カタカナ読み マッピング
 * ============================================ */

const ALPHANUM_TO_KANA = {
  'A': 'エー', 'B': 'ビー', 'C': 'シー', 'D': 'ディー', 'E': 'イー',
  'F': 'エフ', 'G': 'ジー', 'H': 'エイチ', 'I': 'アイ', 'J': 'ジェー',
  'K': 'ケー', 'L': 'エル', 'M': 'エム', 'N': 'エヌ', 'O': 'オー',
  'P': 'ピー', 'Q': 'キュー', 'R': 'アール', 'S': 'エス', 'T': 'ティー',
  'U': 'ユー', 'V': 'ブイ', 'W': 'ダブリュー', 'X': 'エックス', 'Y': 'ワイ', 'Z': 'ゼット',
  'a': 'エー', 'b': 'ビー', 'c': 'シー', 'd': 'ディー', 'e': 'イー',
  'f': 'エフ', 'g': 'ジー', 'h': 'エイチ', 'i': 'アイ', 'j': 'ジェー',
  'k': 'ケー', 'l': 'エル', 'm': 'エム', 'n': 'エヌ', 'o': 'オー',
  'p': 'ピー', 'q': 'キュー', 'r': 'アール', 's': 'エス', 't': 'ティー',
  'u': 'ユー', 'v': 'ブイ', 'w': 'ダブリュー', 'x': 'エックス', 'y': 'ワイ', 'z': 'ゼット',
  '0': 'ゼロ', '1': 'イチ', '2': 'ニ', '3': 'サン', '4': 'ヨン',
  '5': 'ゴ', '6': 'ロク', '7': 'ナナ', '8': 'ハチ', '9': 'キュウ',
  'Ａ': 'エー', 'Ｂ': 'ビー', 'Ｃ': 'シー', 'Ｄ': 'ディー', 'Ｅ': 'イー',
  'Ｆ': 'エフ', 'Ｇ': 'ジー', 'Ｈ': 'エイチ', 'Ｉ': 'アイ', 'Ｊ': 'ジェー',
  'Ｋ': 'ケー', 'Ｌ': 'エル', 'Ｍ': 'エム', 'Ｎ': 'エヌ', 'Ｏ': 'オー',
  'Ｐ': 'ピー', 'Ｑ': 'キュー', 'Ｒ': 'アール', 'Ｓ': 'エス', 'Ｔ': 'ティー',
  'Ｕ': 'ユー', 'Ｖ': 'ブイ', 'Ｗ': 'ダブリュー', 'Ｘ': 'エックス', 'Ｙ': 'ワイ', 'Ｚ': 'ゼット',
  '０': 'ゼロ', '１': 'イチ', '２': 'ニ', '３': 'サン', '４': 'ヨン',
  '５': 'ゴ', '６': 'ロク', '７': 'ナナ', '８': 'ハチ', '９': 'キュウ',
};

/* ============================================
 * 文字種別判定ヘルパー
 * ============================================ */

function isHiragana(char) {
  const code = char.charCodeAt(0);
  return code >= 0x3041 && code <= 0x3096;
}

function isKatakana(char) {
  const code = char.charCodeAt(0);
  return code >= 0x30A1 && code <= 0x30FA;
}

function isKanji(char) {
  const code = char.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF);
}

/* ============================================
 * フリガナ生成
 * ============================================ */

/**
 * 名称から半角カタカナのフリガナを生成
 * @param {string} name - 名称
 * @param {Object} customDict - ユーザー辞書
 * @returns {string} 半角カタカナのフリガナ
 */
export function generateFurigana(name, customDict = {}) {
  if (!name) return '';

  // 1. 記号を除去
  const cleaned = removeSymbols(name);

  // 2. 辞書マッチング（一括置換。長文優先）
  let processed = applyDictionary(cleaned, customDict);

  // 3. 解決されなかった箇所を1文字ずつスキャンして処理
  const mergedDict = { ...FURIGANA_DICT, ...customDict };
  let katakana = '';
  
  // 1文字ずつ走査
  for (const char of processed) {
    if (ALPHANUM_TO_KANA[char]) {
      katakana += ALPHANUM_TO_KANA[char]; // 英数字
    } else if (isHiragana(char)) {
      katakana += String.fromCharCode(char.charCodeAt(0) + 0x60); // ひらがな→カタカナ
    } else if (isKatakana(char) || char === 'ー' || char === '・') {
      katakana += char; // そのまま
    } else if (isKanji(char)) {
      // 漢字が残っている場合は、1文字での辞書引きを試みる
      if (mergedDict[char]) {
        katakana += mergedDict[char];
      } else {
        log.debug('未知の漢字をスキップ', { char });
      }
    }
  }

  // 4. 半角カナに変換し、24文字制限に収める
  return toHalfWidthKana(katakana).substring(0, 24);
}

/* ============================================
 * 一括処理
 * ============================================ */

/**
 * 全データのフリガナを一括生成
 * @param {Array<Object>} data - 全行データ
 * @param {Object} spec - 機種仕様
 * @param {Object} customDict - ユーザー辞書
 * @returns {Promise<Array<Object>>} 比較用データの配列
 */
export async function processAllFurigana(data, spec, customDict = {}) {
  const result = [];
  const nameKey = spec.columns.find(col => col.key.includes('name'))?.key || 'name';
  const kanaKey = spec.columns.find(col => col.key.includes('furigana') || col.key.includes('kana'))?.key || 'furigana';

  log.info('フリガナ一括生成を開始', { 
    rows: data.length, 
    customDictCount: Object.keys(customDict).length 
  });

  data.forEach((row, index) => {
    const name = row[nameKey] || '';
    if (!name) return;

    try {
      const generated = generateFurigana(name, customDict);
      const current = row[kanaKey] || '';

      if (generated && generated !== current) {
        result.push({
          index,
          fieldKey: kanaKey,
          current,
          generated,
          name,
        });
      }
    } catch (err) {
      log.warn(`フリガナ生成失敗 [${index}]`, { name, error: err.message });
    }
  });

  log.info('フリガナ一括生成を完了', { 
    totalRows: data.length, 
    changedRows: result.length,
  });

  return result;
}
