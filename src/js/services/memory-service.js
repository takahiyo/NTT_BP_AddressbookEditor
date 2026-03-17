/**
 * メモリ番号管理サービス
 * 未使用番号の割り当て、範囲チェック等
 */

/**
 * 未使用のメモリ番号（若番）を自動割り当て
 * @param {Array<Object>} data - 全行データ
 * @param {Object} spec - 機種仕様
 * @param {string} digitMode - 桁数モード
 * @returns {{ data: Array<Object>, assignedCount: number }}
 */
export function autoAssignMemoryNos(data, spec, digitMode) {
  if (!spec.digitModes || !spec.digitModes[digitMode]) {
    return { data, assignedCount: 0 };
  }

  const sharedRange = spec.digitModes[digitMode].shared;
  const personalRange = spec.digitModes[digitMode].personal;
  const min = sharedRange.min;
  const max = personalRange ? Math.max(sharedRange.max, personalRange.max) : sharedRange.max;

  /* 現在使用中の番号をセットに */
  const usedNos = new Set();
  data.forEach(row => {
    if (row.memoryNo) {
      const num = parseInt(row.memoryNo, 10);
      if (!isNaN(num)) usedNos.add(num);
    }
  });

  let assignedCount = 0;
  let currentSearch = min;

  const newData = data.map(row => {
    /* 有効な行（電話番号が1つでもある）か判定 */
    const hasPhone = Array.from({ length: spec.phoneNumberSlots }, (_, i) => row[`phone${i + 1}`])
      .some(val => val && val.trim().length > 0);

    if (!hasPhone) return row;

    /* パディング桁数を決定（最大値の桁数に合わせる） */
    const padLen = String(max).length;

    /* メモリ番号が空の場合、新規採番 */
    if (!row.memoryNo || row.memoryNo.trim() === '') {
      /* 未使用の番号を探す */
      while (usedNos.has(currentSearch) && currentSearch <= max) {
        currentSearch++;
      }

      if (currentSearch <= max) {
        row.memoryNo = String(currentSearch).padStart(padLen, '0');
        usedNos.add(currentSearch);
        assignedCount++;
        return { ...row };
      }
    } else {
      /* すでに入力されている場合、桁数が不足していればパディング */
      const currentVal = row.memoryNo.trim();
      const num = parseInt(currentVal, 10);
      if (!isNaN(num)) {
        const paddedVal = String(num).padStart(padLen, '0');
        if (currentVal !== paddedVal) {
          row.memoryNo = paddedVal;
          assignedCount++; // 修正としてカウントに含める
          return { ...row };
        }
      }
    }
    return row;
  });

  return { data: newData, assignedCount };
}

/**
 * データを指定行数までパディング（初期値と未使用メモリ番号で埋める）
 * @param {Array<Object>} data - 元データ
 * @param {number} targetCount - 目標行数
 * @param {Object} spec - 基準とする機種仕様
 * @param {string} digitMode - 桁数モード
 * @returns {Array<Object>} パディング後のデータ
 */
export function padDataToCapacity(data, targetCount, spec, digitMode) {
  if (data.length >= targetCount) return data;
  if (!spec.digitModes || !spec.digitModes[digitMode]) return data;

  const sharedRange = spec.digitModes[digitMode].shared;
  const personalRange = spec.digitModes[digitMode].personal;
  const min = sharedRange.min;
  const max = personalRange ? Math.max(sharedRange.max, personalRange.max) : sharedRange.max;
  const padLen = String(max).length;

  const usedNos = new Set();
  data.forEach(row => {
    if (row.memoryNo) {
      const num = parseInt(row.memoryNo, 10);
      if (!isNaN(num)) usedNos.add(num);
    }
  });

  const newData = [...data];
  let currentSearch = min;

  for (let i = data.length; i < targetCount; i++) {
    while (usedNos.has(currentSearch) && currentSearch <= max) {
      currentSearch++;
    }

    /* メモリ番号文字列生成 */
    let memoryNoStr = '';
    if (currentSearch <= max) {
      memoryNoStr = String(currentSearch).padStart(padLen, '0');
      usedNos.add(currentSearch);
    }

    const newRow = { memoryNo: memoryNoStr };
    
    /* 仕様に合わせて初期値を設定 */
    spec.columns.forEach(col => {
      /* すでに設定済みの memoryNo はスキップ */
      if (col.key === 'memoryNo') return;
      if (col.key.startsWith('_')) return;

      /* UI定義 (fields) からデフォルト値を探す */
      const fieldDef = spec.fields?.find(f => f.key === col.key);
      const defVal = fieldDef?.defaultValue;

      if (defVal !== undefined && defVal !== '') {
        newRow[col.key] = defVal;
      } else if (col.key.startsWith('icon')) {
        /* アイコン番号のデフォルト (zxl等) */
        newRow[col.key] = spec.iconRange?.default || '1';
      } else if (col.key.startsWith('dialAttr')) {
        /* 発信属性のデフォルト */
        newRow[col.key] = spec.dialAttrRange?.default || '0';
      } else if (col.type === 'number') {
        newRow[col.key] = '0';
      } else {
        newRow[col.key] = '';
      }
    });
    
    newData.push(newRow);
  }

  return newData;
}
