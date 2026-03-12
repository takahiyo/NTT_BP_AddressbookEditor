/**
 * フリガナ生成サービス
 * 名称からフリガナ（半角カタカナ）を推測・生成する
 *
 * 処理フロー:
 * 1. 名称から記号を除去
 * 2. 英数字をカタカナ読みに変換（ALPHANUM_TO_KANA）
 * 3. 漢字が含まれる場合、外部API（Google Transliterate）で読みを取得
 * 4. ひらがな→カタカナ変換
 * 5. 半角カタカナに変換して出力
 */

import { toHalfWidthKana, removeSymbols } from './converter.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('furigana');

/* ============================================
 * 英数字→カタカナ読み マッピング
 * ============================================ */

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
  
  // 全角英数字
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

/** 漢字判定 */
function isKanji(char) {
  const code = char.codePointAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF)   // CJK統合漢字
      || (code >= 0x3400 && code <= 0x4DBF)   // CJK統合漢字拡張A
      || (code >= 0x20000 && code <= 0x2A6DF) // CJK統合漢字拡張B
      || (code >= 0xF900 && code <= 0xFAFF);  // CJK互換漢字
}

/** ひらがな判定 */
function isHiragana(char) {
  const code = char.charCodeAt(0);
  return code >= 0x3041 && code <= 0x3096;
}

/** 全角カタカナ判定 */
function isKatakana(char) {
  const code = char.charCodeAt(0);
  return code >= 0x30A1 && code <= 0x30F6;
}

/* ============================================
 * 漢字→読み変換（外部API）
 * ============================================ */

/**
 * 漢字文字列の読み（ひらがな）を外部APIで取得
 * Google Transliterate CGI をフォールバックとして使用
 * @param {string} text - 漢字を含む文字列
 * @returns {Promise<string|null>} ひらがな読み、失敗時はnull
 */
async function fetchKanjiReading(text) {
  if (!text) return null;

  try {
    // Google Transliterate CGI（非公式だがCORS対応）
    const url = `https://www.google.com/transliterate?langpair=ja-Hira|ja&text=${encodeURIComponent(text)},`;
    log.debug('漢字読み取得リクエスト', { text, url });

    const response = await fetch(url);
    if (!response.ok) {
      log.warn('漢字読み取得失敗（HTTP）', { status: response.status });
      return null;
    }

    const data = await response.json();
    // レスポンス形式: [["漢字", ["候補1", "候補2", ...]], ...]
    // 入力テキストがそのまま返ってきた場合は変換失敗
    if (Array.isArray(data) && data.length > 0) {
      const reading = data.map(entry => {
        if (Array.isArray(entry) && entry.length >= 2 && Array.isArray(entry[1])) {
          return entry[1][0]; // 第1候補を使用
        }
        return entry[0] || '';
      }).join('');

      log.debug('漢字読み取得成功', { text, reading });
      return reading;
    }

    log.warn('漢字読み取得レスポンス形式不正', { data });
    return null;
  } catch (err) {
    log.warn('漢字読み取得エラー（おそらくCORSまたはネットワーク）', { error: err.message });
    return null;
  }
}

/* ============================================
 * フリガナ生成（同期版 + 漢字なし）
 * ============================================ */

/**
 * ひらがなをカタカナに変換
 * @param {string} str 
 * @returns {string}
 */
function hiraganaToKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, match =>
    String.fromCharCode(match.charCodeAt(0) + 0x60)
  );
}

/**
 * 名称からフリガナ（半角カタカナ）を生成
 * 英数字 → カタカナ読み、ひらがな → カタカナ化、カタカナはそのまま
 * 漢字が含まれる場合は kanjiReading があれば使用、なければ漢字を除去
 * @param {string} name - 名称
 * @param {string} [kanjiReading] - 外部APIで取得した漢字の読み（全体）
 * @returns {string} 半角カタカナのフリガナ
 */
export function generateFurigana(name, kanjiReading) {
  if (!name) return '';

  // 漢字の読みが外部APIから得られている場合はそれを優先利用
  if (kanjiReading) {
    log.debug('外部API読みを使用', { name, kanjiReading });
    const cleaned = removeSymbols(kanjiReading);
    let result = '';
    for (const char of cleaned) {
      if (ALPHANUM_TO_KANA[char]) {
        result += ALPHANUM_TO_KANA[char];
      } else {
        result += char;
      }
    }
    return toHalfWidthKana(hiraganaToKatakana(result)).substring(0, 24);
  }

  // ローカル処理: 英数字変換 + ひらがな→カタカナ + 漢字除去
  const trimmed = removeSymbols(name);
  let furigana = '';
  for (const char of trimmed) {
    if (ALPHANUM_TO_KANA[char]) {
      furigana += ALPHANUM_TO_KANA[char];
    } else if (isHiragana(char) || isKatakana(char)) {
      furigana += char;
    } else if (isKanji(char)) {
      // 漢字はスキップ（外部API読みがなかった場合）
      // ここには来ないはず（外部APIが成功していれば kanjiReading を使用するため）
    } else {
      // 長音記号などはそのまま
      if (char === 'ー' || char === '・') {
        furigana += char;
      }
    }
  }

  return toHalfWidthKana(hiraganaToKatakana(furigana)).substring(0, 24);
}

/**
 * 文字列に漢字が含まれるか判定
 * @param {string} str
 * @returns {boolean}
 */
function containsKanji(str) {
  for (const char of str) {
    if (isKanji(char)) return true;
  }
  return false;
}

/* ============================================
 * 一括処理（非同期）
 * ============================================ */

/**
 * 全データのフリガナを一括生成（非同期・漢字API対応）
 * @param {Array<Object>} data - 全行データ
 * @param {Object} spec - 機種仕様
 * @returns {Promise<Array<Object>>} 比較用データの配列
 */
export async function processAllFurigana(data, spec) {
  const result = [];
  const nameKey = spec.columns.find(col => col.key.includes('name'))?.key || 'name';
  const kanaKey = spec.columns.find(col => col.key.includes('furigana') || col.key.includes('kana'))?.key || 'furigana';

  log.info('フリガナ一括生成を開始', { rows: data.length, nameKey, kanaKey });

  // 漢字を含む名称を収集し、外部APIで一括取得を試みる
  const kanjiReadings = new Map(); // index -> reading

  // 漢字を含む名称を収集
  const kanjiNames = [];
  data.forEach((row, index) => {
    const name = row[nameKey] || '';
    if (name && containsKanji(removeSymbols(name))) {
      kanjiNames.push({ index, name: removeSymbols(name) });
    }
  });

  // 外部APIで漢字の読みを一括取得（1件ずつAPI呼び出し、レート制限を考慮）
  if (kanjiNames.length > 0) {
    log.info(`漢字を含む名称: ${kanjiNames.length}件、外部API読み取得を試行`);

    for (const { index, name } of kanjiNames) {
      const reading = await fetchKanjiReading(name);
      if (reading) {
        kanjiReadings.set(index, reading);
      }
      // レート制限を考慮して少し待機（50ms）
      await new Promise(r => setTimeout(r, 50));
    }

    log.info(`外部API読み取得完了: ${kanjiReadings.size}/${kanjiNames.length}件成功`);
  }

  // 全行のフリガナを生成
  data.forEach((row, index) => {
    const name = row[nameKey] || '';
    if (!name) return;

    const kanjiReading = kanjiReadings.get(index) || null;
    const generated = generateFurigana(name, kanjiReading);
    const current = row[kanaKey] || '';

    if (generated && generated !== current) {
      result.push({
        index,
        fieldKey: kanaKey,
        current,
        generated,
        name,
        usedApi: kanjiReading !== null,
      });
    }
  });

  log.info('フリガナ一括生成を完了', { 
    totalRows: data.length, 
    changedRows: result.length,
    apiUsed: kanjiReadings.size
  });

  return result;
}
