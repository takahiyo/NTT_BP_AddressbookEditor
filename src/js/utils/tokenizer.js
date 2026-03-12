/**
 * 形態素解析ラッパー（kuromoji.js）
 * 漢字→読み変換のためのトークナイザを提供
 *
 * kuromoji.jsはindex.htmlでCDN経由でグローバルに読み込み済み
 * 辞書はCDN上から初回のみダウンロードされ、以降はブラウザキャッシュを利用
 */

import { createLogger } from './logger.js';

const log = createLogger('tokenizer');

/** 辞書データのCDNパス */
const DICT_PATH = 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/';

/** トークナイザのシングルトンインスタンス */
let tokenizerInstance = null;

/** 初期化中のPromise（重複初期化防止） */
let initPromise = null;

/**
 * トークナイザを初期化（遅延ロード）
 * 初回呼び出し時のみ辞書をダウンロードし、以降はキャッシュを使用
 * @returns {Promise<Object>} kuromoji トークナイザ
 */
export function getTokenizer() {
  if (tokenizerInstance) {
    return Promise.resolve(tokenizerInstance);
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise((resolve, reject) => {
    if (typeof kuromoji === 'undefined') {
      log.error('kuromoji.js が読み込まれていません（CDNスクリプトの確認が必要）');
      reject(new Error('kuromoji.js is not loaded'));
      return;
    }

    log.info('トークナイザ初期化を開始（辞書ダウンロード中...）');
    const startTime = performance.now();

    kuromoji.builder({ dicPath: DICT_PATH }).build((err, tokenizer) => {
      if (err) {
        log.error('トークナイザ初期化に失敗', { error: err.message });
        initPromise = null;
        reject(err);
        return;
      }

      tokenizerInstance = tokenizer;
      const elapsed = Math.round(performance.now() - startTime);
      log.info(`トークナイザ初期化完了（${elapsed}ms）`);
      resolve(tokenizer);
    });
  });

  return initPromise;
}

/**
 * テキストを形態素解析してトークン配列を返す
 * @param {string} text - 解析対象テキスト
 * @returns {Promise<Array<Object>>} トークン配列（各トークンに reading プロパティあり）
 */
export async function tokenize(text) {
  const tokenizer = await getTokenizer();
  return tokenizer.tokenize(text);
}

/**
 * テキストの読み（カタカナ）を取得
 * 各形態素の reading を結合して返す
 * @param {string} text - 対象テキスト
 * @returns {Promise<string>} カタカナの読み
 */
export async function getReading(text) {
  if (!text) return '';

  try {
    const tokens = await tokenize(text);
    const reading = tokens.map(token => {
      // reading が存在する場合はそれを使用（カタカナ）
      if (token.reading) {
        return token.reading;
      }
      // reading がない場合（記号等）は surface_form をそのまま使用
      return token.surface_form;
    }).join('');

    log.debug('読み取得', { input: text, reading });
    return reading;
  } catch (err) {
    log.error('読み取得に失敗', { text, error: err.message });
    return '';
  }
}
