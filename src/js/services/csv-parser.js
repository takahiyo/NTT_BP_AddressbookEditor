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

  /* 1行目がヘッダー（"TEN"で始まるか、Google形式のシグネチャを含む）かどうか */
  const isHeaderRow = firstFields[0]?.trim().toUpperCase() === 'TEN' || 
                      firstFields.some(f => f.includes('First Name') || f === '名');

  /* 1. まず列数とヘッダー有無の両方が一致する機種を探す */
  for (const spec of allSpecs) {
    const expectedCols = spec.hasHeader === false ? spec.expectedColumns : spec.headerColumns;

    if (expectedCols && columnCount === expectedCols) {
        if (spec.hasHeader === false && !isHeaderRow) {
            /* ヘッダーなし機種の条件に一致 */
            return spec.id;
        }
        if (spec.hasHeader !== false && isHeaderRow) {
            /* ヘッダーあり機種: シグネチャがあればそれもチェック（ZXH vs ZX2SM） */
            if (spec.headerSignature) {
                if (firstLine.includes(spec.headerSignature)) {
                    return spec.id;
                }
                /* シグネチャが合わない場合は次へ */
                continue;
            }
            /* シグネチャ指定がない機種、またはシグネチャが特に必要ない場合は一致とみなす */
            return spec.id;
        }
    }
  }

  /* 2. フォールバック（BOMがある場合や、以前の簡易的な数値チェックが必要な場合） */
  if (columnCount === 17 && hasBOM) return 'a1';

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
    /* 1行目をヘッダーとして分離 */
    const rawHeader = allRows[0];
    const rows = allRows.slice(1);
    
    /* [SPECIAL] Google連絡先などのエイリアス対応 */
    let finalColumns = spec.columns;
    if (spec.headerAliases) {
        finalColumns = rawHeader.map((label, index) => {
            const trimmedLabel = label.trim();
            const aliasKey = spec.headerAliases[trimmedLabel];
            if (aliasKey) {
                return { key: aliasKey, label: trimmedLabel };
            }
            // 既存の定義からlabelが一致するものを探す
            const found = spec.columns.find(c => c.label === trimmedLabel);
            if (found) return found;
            
            // どれにも当てはまらない場合は一時的なキーを割り当てる
            return { key: `_unknown_${index}`, label: trimmedLabel };
        });
    }

    return { header: rawHeader, rows, encoding, detectedSpecId, dynamicColumns: finalColumns };
  }
}

/**
 * CSVの行データを機種仕様のカラム定義に基づいてオブジェクト配列に変換
 * @param {Array<Array<string>>} rows - CSVデータ行（2次元配列）
 * @param {Array<Object>} columns - 機種仕様のカラム定義
 * @returns {Array<Object>} キー付きオブジェクトの配列
 */
export function mapRowsToObjects(rows, columns, spec = null) {
  return rows.map((row, rowIndex) => {
    const obj = { _rowIndex: rowIndex };
    
    /* Google形式などの場合、ヘッダー名からのエイリアスマッピングを優先する場合があるが、
       ここでは汎用的にcolumns定義に従う。
       もしspecにheaderAliasesがある場合、読み込み時にヘッダー行からkeyを特定する処理をparseCSVFile側で行うのが理想。
    */
    columns.forEach((col, colIndex) => {
      obj[col.key] = colIndex < row.length ? row[colIndex] : '';
    });
    return obj;
  });
}
