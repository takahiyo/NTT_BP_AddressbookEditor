/**
 * 機種間変換ロジック
 * 機種Aのデータを機種Bのカラム構成にマッピング変換
 *
 * 変換ルール:
 * - 共通フィールド（base-fieldsのkey）は自動マッピング
 * - 変換先に存在しないフィールドは切り捨て
 * - 変換先にのみ存在するフィールドはデフォルト値で補填
 * - 電話番号スロット数の差異に対応（多い→少ないは切り捨て）
 */

/**
 * 機種Aのデータを機種Bの形式に変換
 * @param {Array<Object>} data - 変換元データ（キー付きオブジェクト配列）
 * @param {Object} sourceSpec - 変換元の機種仕様
 * @param {Object} targetSpec - 変換先の機種仕様
 * @returns {{ data: Array<Object>, warnings: Array<string> }}
 */
export function convertBetweenModels(data, sourceSpec, targetSpec) {
  const warnings = [];
  const targetKeys = new Set(targetSpec.columns.map(c => c.key));
  const sourceKeys = new Set(sourceSpec.columns.map(c => c.key));

  /* 変換元にあって変換先に無いフィールドの警告 */
  sourceKeys.forEach(key => {
    if (!targetKeys.has(key) && !key.startsWith('_')) {
      const col = sourceSpec.columns.find(c => c.key === key);
      warnings.push(`フィールド「${col?.label || key}」は変換先に存在しないため除外されます`);
    }
  });

  /* 電話番号スロット数の差異警告 */
  if (sourceSpec.phoneNumberSlots > targetSpec.phoneNumberSlots) {
    warnings.push(
      `電話番号スロット数が異なります（${sourceSpec.phoneNumberSlots}→${targetSpec.phoneNumberSlots}）。超過分は切り捨てられます`
    );
  }

  /* 変換処理 */
  const convertedData = data.map(row => {
    const newRow = { _rowIndex: row._rowIndex };
    targetSpec.columns.forEach(col => {
      if (row[col.key] !== undefined) {
        /* 共通キーがあればそのまま移行 */
        newRow[col.key] = row[col.key];
      } else {
        /* 変換先にのみ存在するフィールドはデフォルト値 */
        newRow[col.key] = col.type === 'number' ? '0' : '';
      }
    });
    return newRow;
  });

  return { data: convertedData, warnings };
}
