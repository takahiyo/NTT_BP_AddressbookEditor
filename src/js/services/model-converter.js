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

    /* --- [SPECIAL] Google連絡先からの入力時の事前処理 --- */
    if (sourceSpec.id === 'google') {
      // 姓名結合 (インポート直後の表示用)
      const lastName = (row.lastName || '').trim();
      const firstName = (row.firstName || '').trim();
      row.name = [lastName, firstName].filter(n => n).join(' ');

      // フリガナ結合
      const pLastName = (row.phoneticLastName || '').trim();
      const pFirstName = (row.phoneticFirstName || '').trim();
      if (pLastName || pFirstName) {
        row.furigana = [pLastName, pFirstName].filter(n => n).join(' ');
      }

      // --- 電話番号の分割展開ロジック ---
      // まず全スロットのValueを集めて一つのリストにする（:::や改行で区切られているものを全て抽出）
      let allFoundNumbers = [];
      const getIconCodeForGoogle = (t) => {
        const lowerT = (t || '').toLowerCase();
        if (lowerT.includes('mobile') || lowerT.includes('携帯') || lowerT.includes('cell') || lowerT.includes('iphone')) return '2';
        if (lowerT.includes('home') || lowerT.includes('自宅')) return '4';
        if (lowerT.includes('work') || lowerT.includes('勤務先') || lowerT.includes('office')) return '3';
        if (lowerT.includes('fax') || lowerT.includes('ファクス')) return '7';
        if (lowerT.includes('main') || lowerT.includes('代表')) return '5';
        return '1';
      };

      for (let i = 1; i <= 4; i++) {
        const val = row[`phone${i}Value`];
        const type = row[`phone${i}Type`];
        if (val) {
          // Google特有の区切り文字（::: , ; 改行）で分割
          const parts = val.split(/[;:\n\r]+/).map(s => s.trim()).filter(s => s);
          parts.forEach(num => {
            allFoundNumbers.push({
              value: num.replace(/[^\d+*#]/g, ''),
              type: type || ''
            });
          });
        }
      }

      // 抽出した番号をスロット1〜4に順番に割り当てる
      // 内部モデル(phoneX)とGoogle固有(phoneXValue)の両方を更新
      for (let i = 1; i <= 4; i++) {
        const pKey = `phone${i}`;
        const vKey = `phone${i}Value`;
        const iKey = `icon${i}`;
        const tKey = `phone${i}Type`;
        const dKey = `dialAttr${i}`;

        if (allFoundNumbers[i - 1]) {
          const numInfo = allFoundNumbers[i - 1];
          const iconCode = getIconCodeForGoogle(numInfo.type);
          
          row[pKey] = numInfo.value;
          row[vKey] = numInfo.value;
          row[iKey] = iconCode;
          row[tKey] = numInfo.type; // 元のタイプ文字列を維持（表示用）
          row[dKey] = '1';
        } else {
          // 番号がないスロットはクリア
          row[pKey] = '';
          row[vKey] = '';
          row[iKey] = '1';
          row[tKey] = '';
          row[dKey] = '1';
        }
      }
    }

    /* --- [SPECIAL] Google連絡先への出力時の後処理（マッピング補完） --- */
    if (targetSpec.id === 'google') {
      // name -> firstName
      if (row.name && !row.firstName) {
        newRow.firstName = row.name;
      }
      // furigana -> phoneticFirstName
      if (row.furigana && !row.phoneticFirstName) {
        newRow.phoneticFirstName = row.furigana;
      }
      
      const getGoogleTypeFromIconCode = (code) => {
        const c = code?.toString();
        if (c === '2' || c === '17') return 'Mobile';
        if (c === '4' || c === '21') return 'Home';
        if (c === '3' || c === '20') return 'Work';
        if (c === '7' || c === '28') return 'Fax';
        return 'Other';
      };

      // phoneX -> phoneXValue, iconX -> phoneXType
      for (let i = 1; i <= 4; i++) {
        const pKey = `phone${i}`;
        const iKey = `icon${i}`;
        const vKey = `phone${i}Value`;
        const tKey = `phone${i}Type`;

        if (row[pKey] && !newRow[vKey]) {
          newRow[vKey] = row[pKey];
          if (!newRow[tKey]) {
            newRow[tKey] = getGoogleTypeFromIconCode(row[iKey]);
          }
        }
      }
    }
  
    targetSpec.columns.forEach(col => {
      /* マッピング元のキーを探す（まずkey完全一致、次にlabel一致） */
      const sourceColByKey = sourceSpec.columns.find(c => c.key === col.key);
      let sourceColByLabel = null;
      /* labelが同一であれば引き継ぎ対象とする（例: ZX2SMの「グループ」 -> A1の「グループ」） */
      if (!sourceColByKey) {
          /* ヘッダーの別名対応も含めて検索 */
          sourceColByLabel = sourceSpec.columns.find(c => c.label === col.label);
          if (!sourceColByLabel && sourceSpec.headerAliases) {
              const aliasKey = Object.keys(sourceSpec.headerAliases).find(k => k === col.label);
              if (aliasKey) {
                  const targetKey = sourceSpec.headerAliases[aliasKey];
                  sourceColByLabel = sourceSpec.columns.find(c => c.key === targetKey);
              }
          }
      }
      
      const sourceKey = sourceColByKey ? sourceColByKey.key : (sourceColByLabel ? sourceColByLabel.key : (row[col.key] !== undefined ? col.key : null));
      const sourceVal = sourceKey ? row[sourceKey] : undefined;
      const fieldInfo = targetSpec.fields?.find(f => f.key === col.key) || {};
      const defaultValue = fieldInfo.defaultValue;

      if (sourceVal !== undefined && sourceVal !== '') {
        /* マッピング元の値がある場合 */
        let finalVal = sourceVal;

        /* アイコン番号の変換ロジック（双方向マッピング） */
        if (col.key.startsWith('icon')) {
          if (targetSpec.iconRange?.allowed) {
            /* 正変換: 1-N -> 固有リストの数値（例: 他機種 -> ZX2L） */
            const sourceIconNum = parseInt(sourceVal, 10);
            if (!isNaN(sourceIconNum) && sourceIconNum >= 1 && sourceIconNum <= 9) {
              /* A1/ZX基準(1-9)をターゲットの固有リストに変換 */
              const allowedIcons = targetSpec.iconRange.allowed;
              if (sourceIconNum <= allowedIcons.length) {
                finalVal = allowedIcons[sourceIconNum - 1].toString();
              }
            }
          } else if (sourceSpec.iconRange?.allowed) {
            /* 逆変換: 固有リストの数値 -> 1-N（例: ZX2L -> 他機種） */
            const sourceIconVal = parseInt(sourceVal, 10);
            const index = sourceSpec.iconRange.allowed.indexOf(sourceIconVal);
            if (index !== -1) {
              finalVal = (index + 1).toString();
            }
          }
        }
        
        newRow[col.key] = finalVal;
      } else if (defaultValue !== undefined && defaultValue !== '') {
        /* マッピング元が空（または存在しない）かつ、変換先にデフォルト値があれば採用 */
        newRow[col.key] = defaultValue;
      } else if (sourceVal !== undefined) {
        /* マッピング元は存在するが空値で、デフォルト値も無い場合は空値を維持 */
        newRow[col.key] = sourceVal;
      } else {
        /* 変換先にのみ存在するフィールドでデフォルト値も無い場合 */
        if (newRow[col.key] !== undefined) {
          /* 既に個別マッピング（Google等）で値が入っている場合は維持 */
          return;
        }
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
