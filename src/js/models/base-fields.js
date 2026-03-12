/**
 * 共通フィールド定義
 * 全機種で共通のフィールドテンプレートを提供
 * 各機種はここからフィールドを選択し、制限値を上書きする
 */

/**
 * 共通フィールドテンプレート
 * key: 内部識別子（機種間変換時のマッピングキー）
 * label: CSVヘッダー表示名
 * type: フィールド種別（number/text/phone）
 * editable: ユーザー編集可能か
 */
export const BASE_FIELDS = {
  ten: {
    key: 'ten',
    label: 'TEN',
    type: 'number',
    editable: true,
    cssClass: 'col-ten',
  },
  memoryNo: {
    key: 'memoryNo',
    label: 'メモリ番号',
    type: 'text',
    editable: true,
    cssClass: 'col-memory',
  },
  name: {
    key: 'name',
    label: '名称',
    type: 'text',
    editable: true,
    cssClass: 'col-name',
  },
  furigana: {
    key: 'furigana',
    label: 'ﾌﾘｶﾞﾅ',
    type: 'text',
    editable: true,
    cssClass: 'col-furigana',
    /* 半角カナが基本だが、機種固有で上書き可能 */
    charType: 'halfKana',
  },
  groupNo: {
    key: 'groupNo',
    label: 'グループ番号',
    type: 'number',
    editable: true,
    cssClass: 'col-group',
  },
};

/**
 * 電話番号セット（電話番号＋アイコン番号＋発信番号属性）を生成
 * @param {number} slotNumber - スロット番号（1〜）
 * @returns {Array} 3フィールドの配列 [電話番号, アイコン番号, 発信番号属性]
 */
export function createPhoneFieldSet(slotNumber) {
  return [
    {
      key: `phone${slotNumber}`,
      label: `電話番号(${slotNumber})`,
      type: 'phone',
      editable: true,
      cssClass: 'col-phone',
    },
    {
      key: `icon${slotNumber}`,
      label: `アイコン番号(${slotNumber})`,
      type: 'number',
      editable: true,
      cssClass: 'col-icon',
    },
    {
      key: `dialAttr${slotNumber}`,
      label: `発信番号属性(${slotNumber})`,
      type: 'number',
      editable: true,
      cssClass: 'col-dial-attr',
    },
  ];
}

/**
 * 基本フィールド群＋電話番号スロットを組み合わせてカラム定義配列を生成
 * @param {Object} overrides - フィールドごとの上書き値 { fieldKey: { maxBytes: N, ... } }
 * @param {number} phoneSlots - 電話番号スロット数
 * @returns {Array} カラム定義配列（CSV列順）
 */
export function buildColumns(overrides = {}, phoneSlots = 4) {
  /* 基本5フィールド */
  const baseKeys = ['ten', 'memoryNo', 'name', 'furigana', 'groupNo'];
  const columns = baseKeys.map(key => {
    const base = { ...BASE_FIELDS[key] };
    if (overrides[key]) {
      Object.assign(base, overrides[key]);
    }
    return base;
  });

  /* 電話番号スロットを追加 */
  for (let i = 1; i <= phoneSlots; i++) {
    const phoneFields = createPhoneFieldSet(i);
    phoneFields.forEach(field => {
      /* phone1, icon1 等のキーで上書きを適用 */
      if (overrides[field.key]) {
        Object.assign(field, overrides[field.key]);
      }
      columns.push(field);
    });
  }

  return columns;
}
