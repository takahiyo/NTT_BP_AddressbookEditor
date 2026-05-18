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
/**
 * 機種仕様に適合した空の行オブジェクトを生成する
 * @param {string} memoryNoStr - メモリ番号文字列
 * @param {Object} spec - 機種仕様
 * @returns {Object} 空の行オブジェクト
 */
export function createEmptyRow(memoryNoStr, spec) {
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
      /* アイコン番号のデフォルト */
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

  return newRow;
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

    const newRow = createEmptyRow(memoryNoStr, spec);
    newData.push(newRow);
  }

  return newData;
}

/**
 * メモリ番号の欠番部分に空行を挿入してデータを再構成する
 * @param {Array<Object>} data - 元データ
 * @param {Object} spec - 機種仕様
 * @param {string} digitMode - 桁数モード
 * @returns {Array<Object>} 欠番が埋められたデータ
 */
export function fillMemoryGaps(data, spec, digitMode) {
  /* メモリ番号カラムがない機種、またはデータが空の場合は何もしない */
  const hasMemoryNo = spec.columns.some(col => col.key === 'memoryNo');
  if (!hasMemoryNo || !data || data.length === 0) {
    return data;
  }

  /* 1. 各行をメモリ番号（数値）でグループ化し、数値でない行やメモリ番号がない行を退避 */
  const memoryMap = new Map(); // Map<number, Array<Object>> (重複も考慮)
  const nonNumericRows = [];

  data.forEach(row => {
    if (!row.memoryNo || row.memoryNo.trim() === '') {
      nonNumericRows.push(row);
      return;
    }

    const num = parseInt(row.memoryNo, 10);
    if (isNaN(num)) {
      nonNumericRows.push(row);
      return;
    }

    if (!memoryMap.has(num)) {
      memoryMap.set(num, []);
    }
    memoryMap.get(num).push(row);
  });

  /* メモリ番号を持つ行が全くない場合はそのまま返す */
  if (memoryMap.size === 0) {
    return data;
  }

  /* 2. 最小値と最大値を決定 */
  let minNum = 0;
  if (spec.digitModes && spec.digitModes[digitMode]) {
    minNum = spec.digitModes[digitMode].shared.min;
  } else {
    minNum = Math.min(...memoryMap.keys());
  }

  const maxNum = Math.max(...memoryMap.keys());

  /* 桁数モードの設定からパディング桁数を決定 */
  let padLen = 0;
  if (spec.digitModes && spec.digitModes[digitMode]) {
    const sharedRange = spec.digitModes[digitMode].shared;
    const personalRange = spec.digitModes[digitMode].personal;
    const maxLimit = personalRange ? Math.max(sharedRange.max, personalRange.max) : sharedRange.max;
    padLen = String(maxLimit).length;
  } else {
    padLen = Math.max(3, String(maxNum).length);
  }

  /* 3. 最小値から最大値までループして配列を再構築 */
  const newData = [];
  for (let num = minNum; num <= maxNum; num++) {
    if (memoryMap.has(num)) {
      /* 既存のデータを配置 */
      const rows = memoryMap.get(num);
      rows.forEach(row => {
        newData.push(row);
      });
    } else {
      /* 欠番なので空行を挿入 */
      const memoryNoStr = String(num).padStart(padLen, '0');
      newData.push(createEmptyRow(memoryNoStr, spec));
    }
  }

  /* 4. 退避していた数値でない行や、最大値を超えるような特殊な行があれば末尾に追加 */
  nonNumericRows.forEach(row => {
    newData.push(row);
  });

  return newData;
}

