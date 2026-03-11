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
  const hasLeadingZero = digits.startsWith('0');
  
  /* 2. 市外局番の正規化と桁数取得 */
  const normalizedCityCode = cityCode.startsWith('0') ? cityCode : '0' + cityCode;
  const cityCodeLen = normalizedCityCode.length;
  
  /* 標準的なターゲット桁数 */
  const TARGET_FIXED_LEN = 10; // 固定電話 (03-XXXX-XXXX 等)
  const TARGET_MOBILE_LEN = 11; // 携帯・IP電話 (090-XXXX-XXXX 等)
  
  let processed = '';
  let isValid = true;

  /* 3. 加工ロジック */
  if (hasLeadingZero) {
    /* すでに 0 から始まる場合：そのまま末尾に # を付与 */
    processed = digits + '#';
    // 桁数チェック（10桁または11桁なら妥当）
    if (digits.length !== TARGET_FIXED_LEN && digits.length !== TARGET_MOBILE_LEN) {
      isValid = false; 
    }
  } else {
    /* 0 から始まらない場合 */
    if (digits.length === (TARGET_FIXED_LEN - cityCodeLen)) {
      /* 市内局番のみと判断：市外局番を補完して末尾に # */
      processed = normalizedCityCode + digits + '#';
    } else if (digits.length === 9 || digits.length === 10) {
      /* 先頭の 0 が抜けているだけと判断：0 を補完して末尾に # */
      processed = '0' + digits + '#';
    } else {
      /* それ以外：先頭に 0 を付けて末尾に #（未完成の番号として扱う） */
      processed = '0' + digits + '#';
      isValid = false;
    }
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
