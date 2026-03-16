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

  /* 変換元にあって変換先に無いフィールドの警告（ラベル基準でも見つからないもの） */
  sourceSpec.columns.forEach(sourceCol => {
    if (!sourceCol.key.startsWith('_')) {
      const targetColByKey = targetSpec.columns.find(c => c.key === sourceCol.key);
      const targetColByLabel = targetSpec.columns.find(c => c.label === sourceCol.label);
      if (!targetColByKey && !targetColByLabel) {
        warnings.push(`フィールド「${sourceCol.label || sourceCol.key}」は変換先に存在しないため除外されます`);
      }
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
      /* マッピング元のキーを探す（まずkey完全一致、次にlabel一致） */
      const sourceColByKey = sourceSpec.columns.find(c => c.key === col.key);
      let sourceColByLabel = null;
      /* labelが同一であれば引き継ぎ対象とする（例: ZX2SMの「グループ」 -> A1の「グループ」） */
      if (!sourceColByKey) {
         sourceColByLabel = sourceSpec.columns.find(c => c.label === col.label);
      }
      
      const sourceKey = sourceColByKey ? sourceColByKey.key : (sourceColByLabel ? sourceColByLabel.key : null);
      const sourceVal = sourceKey ? row[sourceKey] : undefined;
      const fieldInfo = targetSpec.fields?.find(f => f.key === col.key) || {};
      const defaultValue = fieldInfo.defaultValue;

      if (sourceVal !== undefined && sourceVal !== '') {
        /* マッピング元に値があればそれを採用 */
        newRow[col.key] = sourceVal;
      } else if (defaultValue !== undefined && defaultValue !== '') {
        /* マッピング元が空（または存在しない）かつ、変換先にデフォルト値があれば採用 */
        newRow[col.key] = defaultValue;
      } else if (sourceVal !== undefined) {
        /* マッピング元は存在するが空値で、デフォルト値も無い場合は空値を維持 */
        newRow[col.key] = sourceVal;
      } else {
        /* 変換先にのみ存在するフィールドでデフォルト値も無い場合 */
        if (col.key.startsWith('icon') || col.key.startsWith('dialAttr')) {
          newRow[col.key] = '1';
        } else if (fieldInfo.type === 'number') {
          newRow[col.key] = '0';
        } else {
          newRow[col.key] = '';
        }
      }
    });
    return newRow;
  });

  return { data: convertedData, warnings };
}
