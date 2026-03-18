/**
 * エンコーディングユーティリティ
 * CSV入出力時のエンコーディング判定・変換
 *
 * Shift_JIS対応にはブラウザ標準のTextDecoder('shift_jis')を使用
 * （Chrome/Edge/Firefox等の主要ブラウザで対応済み）
 */

/**
 * BOMからエンコーディングを判定
 * @param {Uint8Array} bytes - ファイルの先頭バイト列
 * @returns {string|null} 判定されたエンコーディング名、BOMなしならnull
 */
export function detectBOM(bytes) {
  if (!bytes || bytes.length < 2) return null;

  /* UTF-8 BOM: EF BB BF */
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'UTF-8';
  }
  /* UTF-16 LE BOM: FF FE */
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return 'UTF-16LE';
  }
  /* UTF-16 BE BOM: FE FF */
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return 'UTF-16BE';
  }
  return null;
}

/**
 * バイト列からShift_JISの可能性を推定
 * ※UTF-8との誤判定を避けるため、より厳格に判定
 * @param {Uint8Array} bytes - ファイルのバイト列
 * @returns {boolean} Shift_JISの可能性が高い場合true
 */
function looksLikeShiftJIS(bytes) {
  let sjisChars = 0;
  let invalidSjis = 0;
  let i = 0;
  const len = Math.min(bytes.length, 8192);

  while (i < len) {
    const b = bytes[i];
    
    // 1バイト文字 (半角英数等)
    if (b <= 0x7F) {
      i++;
      continue;
    }
    
    // 半角カナ (0xA1-0xDF)
    if (b >= 0xA1 && b <= 0xDF) {
      sjisChars++;
      i++;
      continue;
    }

    // 2バイト文字の1バイト目
    if ((b >= 0x81 && b <= 0x9F) || (b >= 0xE0 && b <= 0xFC)) {
      if (i + 1 < len) {
        const b2 = bytes[i + 1];
        if ((b2 >= 0x40 && b2 <= 0x7E) || (b2 >= 0x80 && b2 <= 0xFC)) {
          sjisChars++;
          i += 2;
          continue;
        }
      }
    }

    // いずれにも当てはまらない上位ビットが立っているバイト
    invalidSjis++;
    i++;
  }
  
  // 有効なSJIS文字があり、かつ不正なバイトが少なければSJISと判定
  return sjisChars > 0 && invalidSjis < sjisChars * 0.1;
}

/**
 * Valid UTF-8 かチェック
 */
function isUtf8(bytes) {
    let i = 0;
    const len = Math.min(bytes.length, 8192);
    while (i < len) {
        const b1 = bytes[i++];
        if (b1 <= 0x7F) continue;
        if (b1 >= 0xC2 && b1 <= 0xDF) {
            if (i >= len) break;
            if ((bytes[i++] & 0xC0) !== 0x80) return false;
            continue;
        }
        if (b1 >= 0xE0 && b1 <= 0xEF) {
            if (i + 1 >= len) break;
            if ((bytes[i++] & 0xC0) !== 0x80) return false;
            if ((bytes[i++] & 0xC0) !== 0x80) return false;
            continue;
        }
        if (b1 >= 0xF0 && b1 <= 0xF4) {
            if (i + 2 >= len) break;
            if ((bytes[i++] & 0xC0) !== 0x80) return false;
            if ((bytes[i++] & 0xC0) !== 0x80) return false;
            if ((bytes[i++] & 0xC0) !== 0x80) return false;
            continue;
        }
        return false;
    }
    return true;
}

/**
 * バイト列のエンコーディングを自動判定
 * BOM → Shift_JIS推定 → UTF-8フォールバック の優先順
 * @param {Uint8Array} bytes - ファイルのバイト列
 * @returns {string} エンコーディング名
 */
export function detectEncoding(bytes) {
  /* BOMチェック */
  const bomEncoding = detectBOM(bytes);
  if (bomEncoding) return bomEncoding;

  /* UTF-8判定（BOMなしでもValid UTF-8なら優先） */
  if (isUtf8(bytes)) return 'UTF-8';

  /* Shift_JIS推定 */
  if (looksLikeShiftJIS(bytes)) return 'Shift_JIS';

  /* デフォルトはUTF-8 */
  return 'UTF-8';
}

/**
 * バイト列を指定エンコーディングで文字列にデコード
 * @param {Uint8Array} bytes - バイト列
 * @param {string} encoding - エンコーディング名
 * @returns {string} デコード後の文字列
 */
export function decodeBytes(bytes, encoding) {
  /** TextDecoderが受け付けるエンコーディング名にマッピング */
  const encodingMap = {
    'Shift_JIS': 'shift_jis',
    'UTF-8': 'utf-8',
    'UTF-16LE': 'utf-16le',
    'UTF-16BE': 'utf-16be',
  };
  const decoderName = encodingMap[encoding] || encoding.toLowerCase();
  const decoder = new TextDecoder(decoderName);
  return decoder.decode(bytes);
}

/**
 * 文字列をShift_JISのバイト列にエンコード
 * TextEncoderはUTF-8のみ対応のため、手動変換テーブルを使用
 * @param {string} str - エンコード対象の文字列
 * @returns {Uint8Array} Shift_JISバイト列
 */
export function encodeToShiftJIS(str) {
  /**
   * ブラウザ標準ではShift_JISエンコードは未サポート
   * TextEncoder('shift_jis')は使えないため、
   * encoding.js ライブラリを利用するか、自前テーブルが必要
   *
   * ここではグローバルに読み込まれたEncoding.jsを利用する想定
   * CDN: https://cdnjs.cloudflare.com/ajax/libs/encoding-japanese/2.2.0/encoding.min.js
   */
  if (typeof Encoding !== 'undefined') {
    /* encoding-japanese ライブラリを使用 */
    const unicodeArray = Encoding.stringToCode(str);
    const sjisArray = Encoding.convert(unicodeArray, {
      to: 'SJIS',
      from: 'UNICODE',
    });
    return new Uint8Array(sjisArray);
  }

  /* フォールバック: UTF-8で出力（警告付き） */
  console.warn('[encoding] Shift_JISエンコードライブラリが未読込。UTF-8にフォールバックします。');
  return new TextEncoder().encode(str);
}

/**
 * 文字列をUTF-8 BOM付きのバイト列にエンコード
 * @param {string} str - エンコード対象の文字列
 * @returns {Uint8Array} UTF-8(BOM付き)バイト列
 */
export function encodeToUTF8BOM(str) {
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(str);
  /* BOM (EF BB BF) を先頭に追加 */
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const result = new Uint8Array(bom.length + utf8Bytes.length);
  result.set(bom, 0);
  result.set(utf8Bytes, bom.length);
  return result;
}
