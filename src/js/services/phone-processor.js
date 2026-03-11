/**
 * 電話番号加工サービス
 * AB-J方式（市外局番付与、末尾 #）等への変換
 */

/**
 * 電話番号をAB-J/K方式（実機投入用）に加工
 * @param {string} number - 元の電話番号
 * @param {string} cityCode - 市外局番（052など）
 * @returns {{ processed: string, isValid: boolean, originalDigits: number }}
 */
export function processPhoneNumber(number, cityCode) {
  if (!number) return { processed: '', isValid: true, originalDigits: 0 };

  /* 1. 記号を削除して数字のみ抽出 */
  const digits = number.replace(/[^0-9]/g, '');
  
  /* 2. 先頭が0の番号は0を削除 */
  const withoutLeadingZero = digits.replace(/^0+/, '');
  const len = withoutLeadingZero.length;
  
  let processed = '';
  let isValid = true;

  /* 3. 残った桁数で判定 */
  if (len === 7) {
    /* 市内局番から → 市外局番と # を追加 */
    const prefix = cityCode.startsWith('0') ? cityCode : '0' + cityCode;
    processed = prefix + withoutLeadingZero + '#';
  } else if (len === 9 || len === 10) {
    /* 市外局番(9) または IP/モバイル(10) → 先頭に 0、末尾に # を追加 */
    processed = '0' + withoutLeadingZero + '#';
  } else {
    /* それ以外は元の数字に # を付与（要確認） */
    processed = (digits.startsWith('0') ? digits : '0' + digits) + '#';
    isValid = false;
  }

  return { processed, isValid, originalDigits: digits.length };
}

/**
 * 全データの電話番号列を一括加工
 * @param {Array<Object>} data - 全行データ
 * @param {number} slots - 電話番号スロット数
 * @param {string} cityCode - 市外局番
 * @returns {{ data: Array<Object>, processedCount: number, errorCount: number }}
 */
export function processAllPhoneNumbers(data, slots, cityCode) {
  let processedCount = 0;
  let errorCount = 0;

  const newData = data.map(row => {
    const newRow = { ...row };
    for (let i = 1; i <= slots; i++) {
      const phoneKey = `phone${i}`;
      const iconKey = `icon${i}`;

      /* 1. 電話番号加工 */
      if (row[phoneKey]) {
        const result = processPhoneNumber(row[phoneKey], cityCode);
        newRow[phoneKey] = result.processed;
        if (!result.isValid) {
          errorCount++;
        }
        processedCount++;
      }

      /* 2. アイコン番号が 0 の場合は 1 に修正 */
      if (!newRow[iconKey] || newRow[iconKey] === '0') {
        newRow[iconKey] = '1';
      }
    }
    return newRow;
  });

  return { data: newData, processedCount, errorCount };
}
