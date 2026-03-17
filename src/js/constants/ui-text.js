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
    CATEGORIES: {
      FILE: 'ファイル',
      EDIT_ROW: '行編集',
      EDIT_COL: '列編集',
      GENERAL: '全体',
      PHONE_PROC: '電話番号加工',
      AUTO_PROC: '自動加工',
      VALIDATE: '全検証',
    },
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
    GENERATE_FURIGANA: 'フリガナ生成',
    MAPPING_MASTER_ONOFF: '個別指定有効',
    EDIT_MAPPING_DICTIONARY: '個別指定辞書...',
    NORMALIZE_ICONS: 'アイコン正規化',
  },



  /* === テーブル === */
  TABLE: {
    ROW_NUM: '#',
    EMPTY_TITLE: '📋',
    EMPTY_TEXT: 'CSVファイルを読み込んでください',
    EMPTY_HINT: 'ドラッグ＆ドロップまたは「CSV読込」ボタンから',
    BYTE_COUNT_FORMAT: '{current}/{max}B',
    PAGINATION_PREV: '前のページ',
    PAGINATION_NEXT: '次のページ',
    PAGINATION_INFO: '{start} - {end} 件 / 全 {total} 件',
    PAGINATION_PAGE: '{current} / {total} ページ',
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
    BTN_CANCEL: 'キャンセル',
    BTN_CLOSE: '✕',
    BTN_OK: 'OK',
    CONFIRM_TITLE: '確認',
    GAIJI_TITLE: '外字設定',
    GAIJI_DESCRIPTION: '使用不可文字を1行1文字で入力してください',
    CITY_CODE_TITLE: '市外局番設定',
    CITY_CODE_DESC: '市外局番を指定してください（AB-J変換用）',
    BTN_EXECUTE_CONVERT: '変換実行',


    CONFIRM_DELETE: '選択した{count}行を削除してよろしいですか？',
    CONFIRM_TRUNCATE: '超過文字を一括カットします。よろしいですか？',
    CONFIRM_NORMALIZE_PHONE: '電話番号とアイコン・発信属性の不整合が {count} 件見つかりました。\nこれらを初期値(1)に補正して読み込みますか？\n（[キャンセル] を選ぶとそのまま読み込みます）',
    CONFIRM_PAD_CAPACITY: '{name}の出力には{target}行のデータが必要です。\n現在 {current} 行のため、不足分を初期値と連番で自動補填しますか？\n（[キャンセル] すると出力機種の変更を中止します）',
    EXPORT_WARNING_EMPTY_ROWS: '空行があると {modelName} では読み込み時にエラーが出ますが、このまま書き出してもよろしいですか？',
    FURIGANA_REVIEW_TITLE: 'フリガナ生成の確認',
    FURIGANA_REVIEW_DESC: '生成されたフリガナを確認してください。チェックを入れると上書きします。',
    FURIGANA_COL_NAME: '名称',
    FURIGANA_COL_CURRENT: '現在',
    FURIGANA_COL_GENERATED: '生成',
    BTN_APPLY: '選択を反映',
  },

  /* === トースト === */
  TOAST: {
    IMPORT_SUCCESS: 'CSVを読み込みました（{count}件）',
    IMPORT_ERROR: 'CSV読み込みエラー: {message}',
    EXPORT_SUCCESS: 'CSVを出力しました',
    VALIDATION_COMPLETE: 'バリデーション完了（エラー: {errors}, 警告: {warnings}）',
    CONVERT_COMPLETE: '変換完了（{count}セル）',
    NORMALIZE_SUCCESS: 'アイコン番号を正規化しました（{count}箇所）',
    TRUNCATE_COMPLETE: '超過カット完了（{count}セル）',
    EMPTY_ROWS_DELETED: '空行を{count}件削除しました',
    GAIJI_SAVED: '外字設定を保存しました',
    NO_DATA: 'データがありません',
    AUTO_DETECT_SWITCHED: '入力機種を {name} に自動切替しました',


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
