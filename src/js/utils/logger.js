/**
 * ロガーユーティリティ
 * アプリ全体で統一されたログ出力を提供
 *
 * ログレベル: DEBUG < INFO < WARN < ERROR
 * コンソール出力に加え、ログ履歴をメモリ上にバッファリングし、
 * ユーザーがコピー＆ペーストで共有できるようにする
 */

/** ログレベル定数 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/** 現在のログレベル閾値（これ以上のレベルのみ出力） */
let currentLevel = LOG_LEVELS.DEBUG;

/** ログバッファ（最大件数を超えたら古いものから削除） */
const LOG_BUFFER_MAX = 500;
const logBuffer = [];

/**
 * タイムスタンプ文字列を生成
 * @returns {string} HH:mm:ss.SSS 形式
 */
function timestamp() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

/**
 * ログエントリを追加
 * @param {string} level - ログレベル名
 * @param {string} module - モジュール名
 * @param {string} message - メッセージ
 * @param {*} [data] - 付帯データ
 */
function addLog(level, module, message, data) {
  const numLevel = LOG_LEVELS[level] ?? LOG_LEVELS.DEBUG;
  if (numLevel < currentLevel) return;

  const ts = timestamp();
  const entry = { ts, level, module, message, data };

  // バッファに追加（上限超過時は先頭を削除）
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_MAX) {
    logBuffer.shift();
  }

  // コンソール出力
  const prefix = `[${ts}][${level}][${module}]`;
  const consoleFn = level === 'ERROR' ? console.error
    : level === 'WARN' ? console.warn
    : level === 'DEBUG' ? console.debug
    : console.log;

  if (data !== undefined) {
    consoleFn(`${prefix} ${message}`, data);
  } else {
    consoleFn(`${prefix} ${message}`);
  }
}

/**
 * モジュール専用ロガーを生成
 * @param {string} moduleName - モジュール名（例: 'app', 'furigana', 'csv-parser'）
 * @returns {Object} debug/info/warn/error メソッドを持つロガーオブジェクト
 */
export function createLogger(moduleName) {
  return {
    debug: (msg, data) => addLog('DEBUG', moduleName, msg, data),
    info:  (msg, data) => addLog('INFO',  moduleName, msg, data),
    warn:  (msg, data) => addLog('WARN',  moduleName, msg, data),
    error: (msg, data) => addLog('ERROR', moduleName, msg, data),
  };
}

/**
 * ログレベルを設定
 * @param {'DEBUG'|'INFO'|'WARN'|'ERROR'} level
 */
export function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLevel = LOG_LEVELS[level];
  }
}

/**
 * ログバッファの全内容をテキストとして取得
 * @returns {string} タブ区切りのログテキスト
 */
export function getLogText() {
  return logBuffer.map(e => {
    const dataStr = e.data !== undefined ? `\t${JSON.stringify(e.data)}` : '';
    return `${e.ts}\t${e.level}\t${e.module}\t${e.message}${dataStr}`;
  }).join('\n');
}

/**
 * ログバッファをクリア
 */
export function clearLogBuffer() {
  logBuffer.length = 0;
}

/**
 * ログバッファの全内容を配列として取得
 * @returns {Array<Object>}
 */
export function getLogEntries() {
  return [...logBuffer];
}
