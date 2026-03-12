/**
 * 形態素解析ラッパー（kuromoji.js）
 * 漢字→読み変換のためのトークナイザを提供
 */

import { createLogger } from './logger.js';

const log = createLogger('tokenizer');

/** 辞書データのCDNパス候補（1つ目が失敗したら次を試す） */
const DICT_PATH_CANDIDATES = [
  'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/',
  'https://unpkg.com/kuromoji@0.1.2/dict/',
  'https://takuyaa.github.io/kuromoji.js/demo/kuromoji/dict/'
];

/** トークナイザのシングルトンインスタンス */
let tokenizerInstance = null;

/** 初期化中のPromise */
let initPromise = null;

/**
 * トークナイザを初期化
 * @param {number} candidateIdx - 試行する候補のインデックス
 * @returns {Promise<Object>} kuromoji トークナイザ
 */
export async function getTokenizer(candidateIdx = 0) {
  if (tokenizerInstance) return tokenizerInstance;
  if (initPromise && candidateIdx === 0) return initPromise;

  const dictPath = DICT_PATH_CANDIDATES[candidateIdx];
  if (!dictPath) {
    const err = new Error('全ての辞書パスの試行に失敗しました。');
    log.error(err.message);
    throw err;
  }

  initPromise = new Promise((resolve, reject) => {
    if (typeof kuromoji === 'undefined') {
      reject(new Error('kuromoji.js が読み込まれていません。'));
      return;
    }

    log.info(`トークナイザ初期化を試行中... (${candidateIdx + 1}/${DICT_PATH_CANDIDATES.length})`, { path: dictPath });
    
    kuromoji.builder({ dicPath: dictPath }).build((err, tokenizer) => {
      if (err) {
        log.warn(`辞書ロード失敗 (${dictPath}): ${err.message}`);
        // 次の候補を試す
        getTokenizer(candidateIdx + 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      tokenizerInstance = tokenizer;
      log.info('トークナイザ初期化成功', { path: dictPath });
      resolve(tokenizer);
    });
  });

  return initPromise;
}

/**
 * テキストを形態素解析
 */
export async function tokenize(text) {
  try {
    const tokenizer = await getTokenizer();
    return tokenizer.tokenize(text);
  } catch (err) {
    log.error('トークン化プロセス全体に失敗', { error: err.message });
    throw err;
  }
}

/**
 * テキストの読み（カタカナ）を取得
 */
export async function getReading(text) {
  if (!text) return '';

  try {
    const tokens = await tokenize(text);
    const reading = tokens.map(token => {
      if (token.reading) return token.reading;
      return token.surface_form;
    }).join('');

    log.debug('読み取得', { input: text, reading });
    return reading;
  } catch (err) {
    log.warn('読み取得に失敗（フォールバック用空文字を返します）', { text, error: err.message });
    return ''; // フリガナ生成側で漢字除去される
  }
}
