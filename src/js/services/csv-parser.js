/**
 * CSVパーサー
 * ファイル読み込み → エンコーディング判定 → CSVパース → データ配列化
 * 機種自動判別機能を含む
 */

import { detectEncoding, detectBOM, decodeBytes } from '../utils/encoding.js';
import { getAllSpecs } from '../models/spec-registry.js';

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
 * CSVのバイト列から機種を自動判別する
 * エンコーディング・ヘッダー有無・列数などの特徴を照合
 * @param {Uint8Array} bytes - ファイルのバイト列
 * @returns {string|null} 一致した機種のID、判別不能ならnull
 */
export function detectSpecFromCSV(bytes) {
  const allSpecs = getAllSpecs();
  const encoding = detectEncoding(bytes);
  const hasBOM = detectBOM(bytes) === 'UTF-8';
  const text = decodeBytes(bytes, encoding);

  /* 最初の1行だけパースして特徴を調べる */
  const firstLineEnd = text.indexOf('\n');
  const firstLine = firstLineEnd >= 0 ? text.substring(0, firstLineEnd) : text;
  const firstFields = parseCSVText(firstLine + '\n')[0] || [];
  const columnCount = firstFields.length;

  /* 1行目がヘッダー行か判定（数値/空文字のみなら非ヘッダー） */
  const isFirstRowAllNumericOrEmpty = firstFields.every(
    f => f === '' || /^\d+$/.test(f.trim())
  );

  for (const spec of allSpecs) {
    const expectedCols = spec.expectedColumns || spec.headerColumns;

    /* 列数チェック（定義されている場合） */
    if (expectedCols && columnCount !== expectedCols) continue;

    /* ヘッダー有無チェック */
    if (spec.hasHeader === false) {
      /* ヘッダーなし機種: 1行目が全て数値/空文字であること */
      if (!isFirstRowAllNumericOrEmpty) continue;
      /* BOM付きUTF-8であること (A1の特徴) */
      if (hasBOM) return spec.id;
    } else {
      /* ヘッダーあり機種: 1行目に「TEN」が含まれること */
      if (isFirstRowAllNumericOrEmpty) continue;
      if (firstFields[0]?.trim() === 'TEN') return spec.id;
    }
  }

  return null;
}

/**
 * ファイルからCSVデータを読み込む
 * エンコーディング自動判定 → 機種自動判別 → パース → ヘッダー行分離/生成
 * @param {File} file - 読み込むファイルオブジェクト
 * @param {Object} spec - 現在の機種仕様
 * @param {string} delimiter - 区切り文字（デフォルト: ','）
 * @returns {Promise<{header: Array<string>, rows: Array<Array<string>>, encoding: string, detectedSpecId: string|null}>}
 */
export async function parseCSVFile(file, spec, delimiter = ',') {
  /* ファイルをArrayBufferとして読み込み */
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  /* 機種自動判別 */
  const detectedSpecId = detectSpecFromCSV(bytes);

  /* エンコーディング判定 */
  const encoding = detectEncoding(bytes);

  /* デコード */
  const text = decodeBytes(bytes, encoding);

  /* パース */
  const allRows = parseCSVText(text, delimiter);

  if (allRows.length === 0) {
    return { header: [], rows: [], encoding, detectedSpecId };
  }

  /* 列数の簡易チェック (データ行の先頭最大3行) */
  if (spec.expectedColumns) {
    const rowsToCheck = Math.min(3, allRows.length);
    for (let i = 0; i < rowsToCheck; i++) {
        if (allRows[i].length !== spec.expectedColumns) {
            throw new Error(`CSVの列数が不正です。選択された機種（${spec.name}）は ${spec.expectedColumns} 列を想定していますが、ファイルには ${allRows[i].length} 列が含まれています。`);
        }
    }
  }

  if (spec.hasHeader === false) {
    /* ヘッダー行がない場合、機種仕様から仮想ヘッダーを生成し、全行をデータとして扱う */
    const header = spec.columns.map(col => col.label);
    const rows = allRows;
    return { header, rows, encoding, detectedSpecId };
  } else {
    /* 1行目をヘッダーとして分離（デフォルト） */
    const header = allRows[0];
    const rows = allRows.slice(1);
    return { header, rows, encoding, detectedSpecId };
  }
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
