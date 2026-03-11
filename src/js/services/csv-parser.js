/**
 * CSVパーサー
 * ファイル読み込み → エンコーディング判定 → CSVパース → データ配列化
 */

import { detectEncoding, decodeBytes } from '../utils/encoding.js';

/**
 * CSVテキストをパースして2次元配列に変換
 * RFC 4180準拠（引用符内のカンマ・改行に対応）
 * @param {string} text - CSVテキスト
 * @param {string} delimiter - 区切り文字（デフォルト: ','）
 * @returns {Array<Array<string>>} 2次元配列（行×列）
 */
export function parseCSVText(text, delimiter = ',') {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          /* エスケープされた引用符 ("") */
          currentField += '"';
          i += 2;
        } else {
          /* 引用符の終了 */
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        /* 引用符の開始 */
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        /* フィールド区切り */
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (char === '\r' && nextChar === '\n') {
        /* CRLF改行 */
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i += 2;
      } else if (char === '\n' || char === '\r') {
        /* LFまたはCR単体 */
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  /* 最後のフィールドと行を追加 */
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  /* 末尾の空行を除去 */
  while (rows.length > 0) {
    const lastRow = rows[rows.length - 1];
    if (lastRow.length === 1 && lastRow[0] === '') {
      rows.pop();
    } else {
      break;
    }
  }

  return rows;
}

/**
 * ファイルからCSVデータを読み込む
 * エンコーディング自動判定 → パース → ヘッダー行分離
 * @param {File} file - 読み込むファイルオブジェクト
 * @param {string} delimiter - 区切り文字（デフォルト: ','）
 * @returns {Promise<{header: Array<string>, rows: Array<Array<string>>, encoding: string}>}
 */
export async function parseCSVFile(file, delimiter = ',') {
  /* ファイルをArrayBufferとして読み込み */
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  /* エンコーディング判定 */
  const encoding = detectEncoding(bytes);

  /* デコード */
  const text = decodeBytes(bytes, encoding);

  /* パース */
  const allRows = parseCSVText(text, delimiter);

  if (allRows.length === 0) {
    return { header: [], rows: [], encoding };
  }

  /* 1行目をヘッダーとして分離 */
  const header = allRows[0];
  const rows = allRows.slice(1);

  return { header, rows, encoding };
}

/**
 * CSVの行データを機種仕様のカラム定義に基づいてオブジェクト配列に変換
 * @param {Array<Array<string>>} rows - CSVデータ行（2次元配列）
 * @param {Array<Object>} columns - 機種仕様のカラム定義
 * @returns {Array<Object>} キー付きオブジェクトの配列
 */
export function mapRowsToObjects(rows, columns) {
  return rows.map((row, rowIndex) => {
    const obj = { _rowIndex: rowIndex };
    columns.forEach((col, colIndex) => {
      obj[col.key] = colIndex < row.length ? row[colIndex] : '';
    });
    return obj;
  });
}
