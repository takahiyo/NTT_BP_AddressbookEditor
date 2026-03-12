/**
 * フリガナ生成サービス
 * Cloudflare Worker API 連携版
 */

import { toHalfWidthKana, removeSymbols } from './converter.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('furigana');

// --- Worker API設定（デプロイ後にURLを書き換えてください） ---
const WORKER_API_URL = "https://furigana-api.ユーザー名.workers.dev/api/furigana";

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

/**
 * 外部 Worker API を呼び出してフリガナを一括取得
 * @param {Array<string>} names - 漢字名称の配列
 * @returns {Promise<Object>} { 漢字: 読み } のオブジェクト
 */
async function fetchFuriganaFromAPI(names) {
  try {
    const response = await fetch(WORKER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names })
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    return data.readings || {};
  } catch (err) {
    log.error('Worker API との通信に失敗', { error: err.message });
    return {};
  }
}

/**
 * ローカルで解決可能なフリガナ（英数字・かな）を生成
 */
function generateLocalFurigana(name) {
  const cleaned = removeSymbols(name);
  let katakana = '';
  for (const char of cleaned) {
    if (ALPHANUM_TO_KANA[char]) {
      katakana += ALPHANUM_TO_KANA[char];
    } else if (/[\u3041-\u3096]/.test(char)) { // ひらがな
      katakana += String.fromCharCode(char.charCodeAt(0) + 0x60);
    } else if (/[\u30A1-\u30FAー・]/.test(char)) { // カタカナ
      katakana += char;
    } else {
      katakana += char; // 漢字等はそのまま残して API に投げる
    }
  }
  return katakana;
}

/**
 * 全データのフリガナを一括生成
 */
export async function processAllFurigana(data, spec) {
  const result = [];
  const nameKey = spec.columns.find(col => col.key.includes('name'))?.key || 'name';
  const kanaKey = spec.columns.find(col => col.key.includes('furigana') || col.key.includes('kana'))?.key || 'furigana';

  log.info('フリガナ一括生成を開始 (API連携モード)', { rows: data.length });

  // 1. 重複を除いた漢字名称リストを作成（API節約と効率化のため）
  const uniqueNames = [...new Set(data.map(row => row[nameKey]).filter(n => n && /[\u4E00-\u9FFF]/.test(n)))];
  
  // 2. API を叩いて一括取得
  const apiReadings = uniqueNames.length > 0 ? await fetchFuriganaFromAPI(uniqueNames) : {};

  // 3. 各行に適用
  data.forEach((row, index) => {
    const name = row[nameKey] || '';
    if (!name) return;

    let processed = name;
    // API の結果があれば置換
    if (apiReadings[name]) {
      processed = apiReadings[name];
    } else {
      // 登録がない場合はローカル変換を試みる
      processed = generateLocalFurigana(name);
    }

    // 最終的に半角カナ変換 + 余計な漢字の除去
    const generated = toHalfWidthKana(processed).replace(/[^\uFF65-\uFF9F0-9A-Z]/gi, '').substring(0, 24);
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
  });

  log.info('フリガナ一括生成を完了', { totalRows: data.length, changedRows: result.length });
  return result;
}
