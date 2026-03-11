/**
 * UI表示テキスト定義
 * アプリ内の全テキストを集約（日本語）
 */

export const UI_TEXT = {
  /* === ヘッダー === */
  HEADER: {
    TITLE: 'NTT電話帳エディタ',
    SUBTITLE: 'ビジネスフォン電話帳CSV編集ツール',
    INPUT_MODEL_LABEL: '入力機種:',
    OUTPUT_MODEL_LABEL: '出力機種:',
    DIGIT_MODE_LABEL: '桁数モード:',
  },

  /* === ツールバー === */
  TOOLBAR: {
    IMPORT_CSV: 'CSV読込',
    EXPORT_CSV: 'CSV書出',
    ADD_ROW: '行追加',
    DELETE_ROW: '行削除',
    VALIDATE_ALL: '全検証',
    CONVERT_HALFWIDTH: '→半角',
    CONVERT_FULLWIDTH: '→全角',
    REMOVE_SYMBOLS: '記号削除',
    TRUNCATE_ALL: '超過カット',
    DELETE_EMPTY_ROWS: '空行削除',
    GAIJI_SETTINGS: '外字設定',
    AUTO_ASSIGN_MEMORY: 'メモリ採番',
    PHONE_PROCESS: '電話番号加工',
  },

  /* === テーブル === */
  TABLE: {
    ROW_NUM: '#',
    EMPTY_TITLE: '📋',
    EMPTY_TEXT: 'CSVファイルを読み込んでください',
    EMPTY_HINT: 'ドラッグ＆ドロップまたは「CSV読込」ボタンから',
    BYTE_COUNT_FORMAT: '{current}/{max}B',
  },

  /* === ステータスバー === */
  STATUS: {
    ROWS: '件数: {count}',
    ERRORS: 'エラー: {count}',
    WARNINGS: '警告: {count}',
    MODEL: '機種: {name}',
    ENCODING: 'エンコーディング: {enc}',
    READY: '準備完了',
    LOADED: '{count}件のデータを読み込みました',
    EXPORTED: 'CSVを出力しました',
  },

  /* === モーダル === */
  MODAL: {
    GAIJI_TITLE: '外字設定',
    GAIJI_DESCRIPTION: '使用不可文字を1行1文字で入力してください',
    BTN_SAVE: '保存',
    BTN_CANCEL: 'キャンセル',
    BTN_CLOSE: '✕',
    CONFIRM_DELETE: '選択した{count}行を削除してよろしいですか？',
    CONFIRM_TRUNCATE: '超過文字を一括カットします。よろしいですか？',
  },

  /* === トースト === */
  TOAST: {
    IMPORT_SUCCESS: 'CSVを読み込みました（{count}件）',
    IMPORT_ERROR: 'CSV読み込みエラー: {message}',
    EXPORT_SUCCESS: 'CSVを出力しました',
    VALIDATION_COMPLETE: 'バリデーション完了（エラー: {errors}, 警告: {warnings}）',
    CONVERT_COMPLETE: '変換完了（{count}セル）',
    TRUNCATE_COMPLETE: '超過カット完了（{count}セル）',
    EMPTY_ROWS_DELETED: '空行を{count}件削除しました',
    GAIJI_SAVED: '外字設定を保存しました',
    NO_DATA: 'データがありません',
  },

  /* === エラーメッセージ === */
  ERRORS: {
    FILE_READ_FAILED: 'ファイルの読み込みに失敗しました',
    INVALID_CSV: '不正なCSV形式です',
    ENCODING_DETECT_FAILED: 'エンコーディングの判定に失敗しました',
    NO_ROWS_SELECTED: '行が選択されていません',
    DUPLICATE_MEMORY_NO: 'メモリ番号が重複しています',
    EMPTY_MEMORY_NO: 'メモリ番号が空です',
  },
};
