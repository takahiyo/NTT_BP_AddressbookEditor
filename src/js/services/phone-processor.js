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

  /* 記号を削除して数字のみ抽出 */
  const digits = number.replace(/[^0-9]/g, '');
  const len = digits.length;
  let processed = '';
  let isValid = true;

  /* 桁数チェック (6桁、7桁が正常) */
  if (len !== 6 && len !== 7 && !digits.startsWith('0')) {
    isValid = false;
  }

  if (digits.startsWith('0')) {
    /* すでに市外局番やモバイル番号が始まっている場合 (050, 070, 080, 090 等) */
    processed = digits + '#';
    /* 10桁 or 11桁を正常とする（簡易） */
    if (len !== 10 && len !== 11) isValid = false;
  } else {
    /* 市外局番を付与 */
    const prefix = cityCode.startsWith('0') ? cityCode : '0' + cityCode;
    processed = prefix + digits + '#';
  }

  return { processed, isValid, originalDigits: len };
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
      const key = `phone${i}`;
      if (row[key]) {
        const result = processPhoneNumber(row[key], cityCode);
        newRow[key] = result.processed;
        if (!result.isValid) {
          errorCount++;
          /* 実装上の注意：
             ここで個別にハイライトを指定するのではなく、
             後のバリデーションで「桁数がおかしい」と出せるとSSOT的に良い。
             今回は指示通り「ハイライトさせる」ため、
             バリデーションエンジン側に桁数チェックを組み込む方針にする。
          */
        }
        processedCount++;
      }
    }
    return newRow;
  });

  return { data: newData, processedCount, errorCount };
}
