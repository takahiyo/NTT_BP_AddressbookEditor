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
    forceHalfWidth: true,
  },
  memoryNo: {
    key: 'memoryNo',
    label: 'メモリ番号',
    type: 'text',
    editable: true,
    cssClass: 'col-memory',
    forceHalfWidth: true,
  },
  name: {
    key: 'name',
    label: '名称',
    type: 'text',
    editable: true,
    cssClass: 'col-name',
    forceHalfWidth: false,
  },
  furigana: {
    key: 'furigana',
    label: 'ﾌﾘｶﾞﾅ',
    type: 'text',
    editable: true,
    cssClass: 'col-furigana',
    /* 半角カナが基本だが、機種固有で上書き可能 */
    charType: 'halfKana',
    forceHalfWidth: false,
  },
  groupNo: {
    key: 'groupNo',
    label: 'グループ番号',
    type: 'number',
    editable: true,
    cssClass: 'col-group',
    forceHalfWidth: true,
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
      forceHalfWidth: true,
    },
    {
      key: `icon${slotNumber}`,
      label: `アイコン番号(${slotNumber})`,
      type: 'number',
      editable: true,
      cssClass: 'col-icon',
      forceHalfWidth: true,
    },
    {
      key: `dialAttr${slotNumber}`,
      label: `発信番号属性(${slotNumber})`,
      type: 'number',
      editable: true,
      cssClass: 'col-dial-attr',
      forceHalfWidth: true,
    },
  ];
}

/**
 * フィールド定義から機種仕様（スペック）の大部分を自動生成する
 * @param {Object} partialSpec - 機種固有の基本設定 (id, name, family 等)
 * @param {Array} items - フィールドの配列定義 (key, overrides 等)
 * @returns {Object} 完成した機種仕様オブジェクト
 */
export function defineSpec(partialSpec, items) {
  const columns = [];
  const fieldConstraints = {};
  const uiFields = [];

  items.forEach(item => {
    /* BASE_FIELDS から基本設定を取得 */
    const base = { ...BASE_FIELDS[item.key] };
    if (!base.key) {
      /* 基底にない場合は新規作成（またはエラー） */
      base.key = item.key;
      base.label = item.label || item.key;
    }

    /* 機種固有の上書きを適用 */
    const finalField = { ...base, ...item };

    /* 1. CSVカラム定義に追加 */
    columns.push({
      key: finalField.key,
      label: finalField.label,
    });

    /* 2. 制約（バリデーション）に追加 */
    if (finalField.constraints) {
      fieldConstraints[finalField.key] = finalField.constraints;
    }

    /* 3. UIフィールド定義に追加 (editable等を含む) */
    uiFields.push({
      key: finalField.key,
      label: finalField.label,
      type: finalField.type || 'text',
      width: finalField.width || 'col-default',
      editable: finalField.editable !== false,
      cssClass: finalField.cssClass || '',
      defaultValue: finalField.defaultValue || '',
      /* 名称とフリガナ以外はデフォルトで半角強制 */
      forceHalfWidth: finalField.forceHalfWidth !== false,
    });
  });

  return {
    ...partialSpec,
    columns,
    fieldConstraints,
    fields: uiFields,
  };
}

