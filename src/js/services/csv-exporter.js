/**
 * CSVエクスポーター
 * データ → CSV文字列生成 → 指定エンコーディングでBlobダウンロード
 */

import { encodeToShiftJIS, encodeToUTF8BOM } from '../utils/encoding.js';
import { APP_CONFIG } from '../constants/app-config.js';

/**
 * データ配列をCSV文字列に変換
 * @param {Array<string>} header - ヘッダー行
 * @param {Array<Array<string>>} rows - データ行の2次元配列
 * @param {string} delimiter - 区切り文字
 * @param {Object} spec - 出力機種仕様
 * @returns {string} CSV文字列
 */
export function buildCSVText(header, rows, delimiter = ',', spec = {}) {
  const forceQuoteCols = spec.forceQuoteColumns || [];
  
  /**
   * フィールドをCSV安全にエスケープ
   * カンマ、引用符、改行を含む場合、あるいは仕様で強制的に引用符で囲む列の場合は引用符で囲む
   */
  const escapeField = (field, colIndex) => {
    const str = field == null ? '' : String(field);
    const colKey = spec.columns ? spec.columns[colIndex]?.key : null;
    const forceQuote = colKey && forceQuoteCols.includes(colKey);

    if (forceQuote || str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const lines = [];
  /* ヘッダー行 (機種仕様でhasHeader: falseでない場合のみ) */
  if (spec.hasHeader !== false) {
    lines.push(header.map((field, idx) => escapeField(field, idx)).join(delimiter));
  }
  
  /* データ行 */
  rows.forEach(row => {
    let outputRow = row;
    /* ZX-L 等、メモリ番号をCSVに含めない機種の対応 */
    if (spec.skipMemoryNoInCSV) {
      const memoryNoIdx = spec.columns.findIndex(col => col.key === 'memoryNo');
      if (memoryNoIdx === -1) {
          /* モデル定義自体に memoryNo がない場合は、全カラム出力 */
          lines.push(row.map((field, idx) => escapeField(field, idx)).join(delimiter));
      } else {
          /* memoryNo 以外のカラムを抽出して出力 (ZX-L は memoryNo を UI 管理用に保持するが CSV にはない) */
          const filteredRow = row.filter((_, idx) => idx !== memoryNoIdx);
          lines.push(filteredRow.map((field, idx) => escapeField(field, idx)).join(delimiter));
      }
    } else {
      lines.push(row.map((field, idx) => escapeField(field, idx)).join(delimiter));
    }
  });

  return lines.join('\r\n') + '\r\n';
}

/**
 * オブジェクト配列をカラム定義順の2次元配列に変換
 * @param {Array<Object>} dataObjects - キー付きデータオブジェクト配列
 * @param {Array<Object>} columns - カラム定義（keyを参照）
 * @param {Object} spec - 機種仕様
 * @returns {Array<Array<string>>} 2次元配列
 */
export function objectsToRows(dataObjects, columns, spec = {}) {
  return dataObjects.map((obj, rowIndex) => {
    /* メモリ番号の自動付与 (ZX-L 等、行番号ベースの場合) */
    if (spec.skipMemoryNoInCSV && (obj.memoryNo === undefined || obj.memoryNo === '')) {
        obj.memoryNo = String(rowIndex);
    }
    
    return columns.map(col => {
      const val = obj[col.key];
      return val == null ? '' : String(val);
    });
  });
}

/**
 * CSVファイルとしてダウンロード
 * @param {string} csvText - CSV文字列
 * @param {string} encoding - 出力エンコーディング ('Shift_JIS' | 'UTF-8' | 'UTF-8BOM')
 * @param {string} filename - ダウンロードファイル名
 */
export function downloadCSV(csvText, encoding, filename) {
  let blob;

  if (encoding === 'Shift_JIS') {
    const bytes = encodeToShiftJIS(csvText);
    blob = new Blob([bytes], { type: 'text/csv;charset=shift_jis' });
  } else if (encoding === 'UTF-8BOM') {
    const bytes = encodeToUTF8BOM(csvText);
    blob = new Blob([bytes], { type: 'text/csv;charset=utf-8' });
  } else {
    /* UTF-8（BOMなし） */
    blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
  }

  /* ダウンロードリンクを生成して自動クリック */
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  /* クリーンアップ */
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * 出力ファイル名を生成
 * @param {string} modelName - 機種名
 * @returns {string} ファイル名
 */
export function generateFilename(modelName) {
  const date = new Date();
  const dateStr = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');

  return APP_CONFIG.CSV.OUTPUT_FILENAME_TEMPLATE
    .replace('{model}', modelName)
    .replace('{date}', dateStr);
}
