/**
 * フリガナ生成サービス
 * 名称からフリガナ（半角カタカナ）を推測・生成する
 *
 * 処理フロー:
 * 1. 名称から記号を除去
 * 2. kuromoji.js（形態素解析）でトークンに分割
 * 3. 各トークンを処理:
 *    - 英数字 → ALPHANUM_TO_KANA マッピングで変換
 *    - それ以外 → kuromoji の reading（カタカナ）を使用
 * 4. 半角カタカナに変換して出力
 */

import { toHalfWidthKana, removeSymbols } from './converter.js';
import { tokenize } from '../utils/tokenizer.js';
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
 * ヘルパー
 * ============================================ */

/** 文字列が全て英数字（マッピング対象）かどうかを判定 */
function isAllAlphaNum(str) {
  for (const ch of str) {
    if (!ALPHANUM_TO_KANA[ch]) return false;
  }
  return str.length > 0;
}

/** 英数字文字列をカタカナ読みに変換 */
function alphaNumToKana(str) {
  let result = '';
  for (const ch of str) {
    result += ALPHANUM_TO_KANA[ch] || ch;
  }
  return result;
}

/* ============================================
 * トークンベースのフリガナ生成
 * ============================================ */

/**
 * kuromoji トークン配列からフリガナを生成
 * - 英数字トークン → 独自マッピング（ALPHANUM_TO_KANA）
 * - それ以外 → kuromoji の reading を使用
 * - 記号トークン → スキップ
 * @param {Array<Object>} tokens - kuromoji トークン配列
 * @returns {string} 半角カタカナのフリガナ
 */
function tokensToFurigana(tokens) {
  let katakana = '';

  for (const token of tokens) {
    const surface = token.surface_form;

    // 記号はスキップ
    if (/^[\s()（）\[\]【】「」『』、。,.・\-#＃]+$/.test(surface)) {
      continue;
    }

    // 英数字トークン → 独自マッピング
    if (isAllAlphaNum(surface)) {
      katakana += alphaNumToKana(surface);
      continue;
    }

    // それ以外 → kuromoji の reading を使用（全角カタカナ）
    if (token.reading) {
      katakana += token.reading;
    } else if (token.pronunciation) {
      katakana += token.pronunciation;
    }
    // reading も pronunciation もない場合（未知語等）はスキップ
  }

  return toHalfWidthKana(katakana).substring(0, 24);
}

/* ============================================
 * 一括処理（非同期・kuromoji使用）
 * ============================================ */

/**
 * 全データのフリガナを一括生成
 * @param {Array<Object>} data - 全行データ
 * @param {Object} spec - 機種仕様
 * @returns {Promise<Array<Object>>} 比較用データの配列
 */
export async function processAllFurigana(data, spec) {
  const result = [];
  const nameKey = spec.columns.find(col => col.key.includes('name'))?.key || 'name';
  const kanaKey = spec.columns.find(col => col.key.includes('furigana') || col.key.includes('kana'))?.key || 'furigana';

  log.info('フリガナ一括生成を開始', { rows: data.length, nameKey, kanaKey });

  for (let i = 0; i < data.length; i++) {
    const name = data[i][nameKey] || '';
    if (!name) continue;

    try {
      // kuromoji で形態素解析
      const tokens = await tokenize(name);
      log.debug(`トークン化 [${i}]`, { 
        name, 
        tokens: tokens.map(t => `${t.surface_form}→${t.reading || '?'}`)
      });

      const generated = tokensToFurigana(tokens);
      const current = data[i][kanaKey] || '';

      if (generated && generated !== current) {
        result.push({
          index: i,
          fieldKey: kanaKey,
          current,
          generated,
          name,
        });
      }
    } catch (err) {
      log.warn(`フリガナ生成失敗 [${i}]`, { name, error: err.message });
    }
  }

  log.info('フリガナ一括生成を完了', { 
    totalRows: data.length, 
    changedRows: result.length,
  });

  return result;
}
