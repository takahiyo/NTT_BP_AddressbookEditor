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

  const range = spec.digitModes[digitMode].shared; // 共通電話帳として割り当て
  const min = range.min;
  const max = range.max;

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
    /* 有効な行（電話番号が1つでもある）かつメモリ番号が空の場合のみ割り当て */
    const hasPhone = Array.from({ length: spec.phoneNumberSlots }, (_, i) => row[`phone${i + 1}`])
      .some(val => val && val.trim().length > 0);

    if (hasPhone && (!row.memoryNo || row.memoryNo.trim() === '')) {
      /* 未使用の番号を探す */
      while (usedNos.has(currentSearch) && currentSearch <= max) {
        currentSearch++;
      }

      if (currentSearch <= max) {
        row.memoryNo = String(currentSearch).padStart(digitMode.charAt(0) === 'd' ? 0 : parseInt(digitMode, 10), '0');
        /* 実際には ZXS/M は 2digit/3digit/4digit でパディングが異なる可能性があるが、
           一旦桁数に合わせてパディングする */
        const padLen = parseInt(digitMode, 10) || 0;
        row.memoryNo = String(currentSearch).padStart(padLen, '0');
        
        usedNos.add(currentSearch);
        assignedCount++;
        return { ...row };
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

  const padLen = parseInt(digitMode, 10) || 0;
  const range = spec.digitModes[digitMode].shared;
  const min = range.min;
  const max = range.max;

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
      if (col.key !== 'memoryNo' && !col.key.startsWith('_')) {
        if (col.key.startsWith('icon') || col.key.startsWith('dialAttr')) {
          newRow[col.key] = '1'; /* アイコン・属性の初期値 */
        } else if (col.type === 'number') {
          newRow[col.key] = '0';
        } else {
          newRow[col.key] = '';
        }
      }
    });
    
    newData.push(newRow);
  }

  return newData;
}
