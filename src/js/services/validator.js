/**
 * バリデーションエンジン
 * 機種仕様に基づくフィールドごとの検証を実行
 *
 * 検証項目:
 * - バイト数超過チェック
 * - 文字種チェック（フリガナの半角制約、電話番号の有効文字）
 * - メモリ番号範囲チェック
 * - 空行チェック（電話番号が全スロット空）
 * - 外字チェック（機種別使用不可文字）
 */

import {
  getByteLength,
  isAllHalfWidth,
  isValidPhoneChar,
  findInvalidChars,
  findCommonMistakes,
} from '../utils/char-utils.js';

/** バリデーション結果の重大度 */
export const SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

/**
 * 単一セルのバリデーション結果を生成
 * @param {string} severity - 重大度 (SEVERITY定数)
 * @param {string} message - メッセージ
 * @param {Object} details - 追加詳細情報
 * @returns {Object} バリデーション結果
 */
function createResult(severity, message, details = {}) {
  return { severity, message, ...details };
}

/**
 * フィールドのバイト数超過をチェック
 * @param {string} value - セル値
 * @param {Object} constraint - フィールド制約 { maxBytes, onOverflow }
 * @returns {Object|null} エラー/警告、問題なしならnull
 */
export function validateByteLength(value, constraint) {
  if (!constraint || !constraint.maxBytes || !value) return null;

  const byteLen = getByteLength(value);
  if (byteLen > constraint.maxBytes) {
    const severity = constraint.onOverflow === 'error' ? SEVERITY.ERROR : SEVERITY.WARNING;
    return createResult(severity,
      `${byteLen}/${constraint.maxBytes}バイト超過`,
      { currentBytes: byteLen, maxBytes: constraint.maxBytes }
    );
  }
  return null;
}

/**
 * フリガナの文字種をチェック（半角のみ許可）
 * @param {string} value - セル値
 * @param {Object} constraint - フィールド制約
 * @returns {Object|null} エラー、問題なしならnull
 */
export function validateFuriganaChars(value, constraint) {
  if (!value || !constraint || constraint.charType !== 'halfKana') return null;

  if (!isAllHalfWidth(value)) {
    const invalidChars = findInvalidChars(value, char => {
      const code = char.charCodeAt(0);
      /* 半角英数記号 or 半角カナ */
      return (code >= 0x0020 && code <= 0x007E) || (code >= 0xFF61 && code <= 0xFF9F);
    });
    return createResult(SEVERITY.ERROR,
      `非対応文字を含んでいます: ${invalidChars.map(c => c.char).join(', ')}`,
      { invalidChars }
    );
  }
  return null;
}

/**
 * 電話番号の文字種をチェック
 * @param {string} value - セル値
 * @returns {Object|null} エラー/警告
 */
export function validatePhoneChars(value) {
  if (!value) return null;

  /* よくある誤入力パターンのチェック */
  const mistakes = findCommonMistakes(value);
  if (mistakes.length > 0) {
    return createResult(SEVERITY.WARNING,
      `誤入力の可能性: ${mistakes.map(m => `"${m.char}"→"${m.suggestion}"`).join(', ')}`,
      { mistakes }
    );
  }

  /* 無効文字のチェック */
  const invalidChars = findInvalidChars(value, isValidPhoneChar);
  if (invalidChars.length > 0) {
    return createResult(SEVERITY.ERROR,
      `非対応文字を含んでいます: ${invalidChars.map(c => c.char).join(', ')}`,
      { invalidChars }
    );
  }

  /* 桁数チェック（AB-J変換済み等の想定） */
  if (value.endsWith('#')) {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length < 10 || digits.length > 11) {
      return createResult(SEVERITY.WARNING, `桁数が異常です (${digits.length}桁)`);
    }
  }

  return null;
}

/**
 * 行全体のバリデーション（電話番号空チェック含む）
 * @param {Object} rowData - 行データ（キー付きオブジェクト）
 * @param {Object} spec - 機種仕様
 * @param {Set} gaijiChars - 外字（使用不可文字）のセット
 * @returns {Object} { fieldKey: [ValidationResult, ...], _rowErrors: [...] }
 */
export function validateRow(rowData, spec, gaijiChars = new Set()) {
  const results = {};

  /* === フィールドごとの検証 === */
  spec.columns.forEach(col => {
    const value = rowData[col.key] || '';
    const constraint = spec.fieldConstraints?.[col.key];
    const fieldResults = [];

    /* バイト数チェック */
    const byteResult = validateByteLength(value, constraint);
    if (byteResult) fieldResults.push(byteResult);

    /* フリガナ文字種チェック */
    if (col.key === 'furigana') {
      const furiganaResult = validateFuriganaChars(value, constraint);
      if (furiganaResult) fieldResults.push(furiganaResult);
    }

    /* 電話番号文字種チェック */
    if (col.type === 'phone' && value) {
      const phoneResult = validatePhoneChars(value);
      if (phoneResult) fieldResults.push(phoneResult);
    }

    /* 外字チェック */
    if (value && gaijiChars.size > 0) {
      const gaijiFound = [];
      for (const char of value) {
        if (gaijiChars.has(char)) {
          gaijiFound.push(char);
        }
      }
      if (gaijiFound.length > 0) {
        fieldResults.push(createResult(SEVERITY.ERROR,
          `使用不可文字: ${[...new Set(gaijiFound)].join(', ')}`,
          { gaijiChars: gaijiFound }
        ));
      }
    }

    if (fieldResults.length > 0) {
      results[col.key] = fieldResults;
    }
  });

  /* === 行レベルの検証 === */
  const rowErrors = [];

  /* 電話番号空チェック */
  if (spec.requirePhoneNumber) {
    const hasAnyPhone = Array.from(
      { length: spec.phoneNumberSlots },
      (_, i) => rowData[`phone${i + 1}`]
    ).some(val => val && val.trim().length > 0);

    if (!hasAnyPhone) {
      rowErrors.push(createResult(SEVERITY.WARNING,
        '電話番号が未入力です（投入時にエラーになります）'
      ));
    }
  }

  if (rowErrors.length > 0) {
    results._rowErrors = rowErrors;
  }

  /* === 電話番号と連動するフィールドの検証 === */
  for (let i = 1; i <= spec.phoneNumberSlots; i++) {
    const phoneVal = rowData[`phone${i}`];
    if (phoneVal && phoneVal.trim().length > 0) {
      /* アイコン番号のチェック (1-8) */
      const iconKey = `icon${i}`;
      const iconVal = rowData[iconKey];
      const iconNum = parseInt(iconVal, 10);
      if (isNaN(iconNum) || iconNum < 1 || iconNum > 8) {
        if (!results[iconKey]) results[iconKey] = [];
        results[iconKey].push(createResult(SEVERITY.ERROR, 'アイコン番号は1-8の範囲で指定してください'));
      }

      /* 発信番号属性のチェック (1,2) */
      const dialAttrKey = `dialAttr${i}`;
      const dialAttrVal = rowData[dialAttrKey];
      const dialAttrNum = parseInt(dialAttrVal, 10);
      if (dialAttrNum !== 1 && dialAttrNum !== 2) {
        if (!results[dialAttrKey]) results[dialAttrKey] = [];
        results[dialAttrKey].push(createResult(SEVERITY.ERROR, '発信番号属性は1または2を指定してください'));
      }
    }
  }

  return results;
}

/**
 * 全データの一括バリデーション
 * @param {Array<Object>} data - 全行データ
 * @param {Object} spec - 機種仕様
 * @param {Set} gaijiChars - 外字セット
 * @returns {{ results: Array<Object>, errorCount: number, warningCount: number }}
 */
export function validateAll(data, spec, gaijiChars = new Set()) {
  let errorCount = 0;
  let warningCount = 0;

  const memoryNos = new Map(); // value -> Array of indices

  const results = data.map((row, index) => {
    const rowResult = validateRow(row, spec, gaijiChars);

    /* メモリ番号の収集 */
    const memNo = row.memoryNo;
    if (memNo !== undefined) {
      if (!memNo || memNo.trim() === '') {
        if (!rowResult.memoryNo) rowResult.memoryNo = [];
        rowResult.memoryNo.push(createResult(SEVERITY.ERROR, 'メモリ番号を入力してください'));
      } else {
        if (!memoryNos.has(memNo)) memoryNos.set(memNo, []);
        memoryNos.get(memNo).push(index);
      }
    }

    return rowResult;
  });

  /* メモリ番号の重複チェックを反映 */
  memoryNos.forEach((indices, val) => {
    if (indices.length > 1) {
      indices.forEach(idx => {
        if (!results[idx].memoryNo) results[idx].memoryNo = [];
        results[idx].memoryNo.push(createResult(SEVERITY.ERROR, `メモリ番号が重複しています: ${val}`));
      });
    }
  });

  /* カウント集計 */
  results.forEach(rowResult => {
    Object.values(rowResult).forEach(fieldResults => {
      if (Array.isArray(fieldResults)) {
        fieldResults.forEach(r => {
          if (r.severity === SEVERITY.ERROR) errorCount++;
          if (r.severity === SEVERITY.WARNING) warningCount++;
        });
      }
    });
  });

  return { results, errorCount, warningCount };
}
