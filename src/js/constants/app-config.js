/**
 * アプリケーション設定定数
 * アプリ全体で使用する設定値を集約
 */

export const APP_CONFIG = {
  /** アプリケーション名 */
  APP_NAME: 'NTT電話帳エディタ',

  /** デフォルト機種ID */
  DEFAULT_SPEC_ID: 'zx2sm',

  /** デフォルト桁数モード */
  DEFAULT_DIGIT_MODE: '3digit',

  /** CSVパース設定 */
  CSV: {
    /** デフォルトの区切り文字 */
    DELIMITER: ',',
    /** デフォルト出力エンコーディング */
    DEFAULT_OUTPUT_ENCODING: 'Shift_JIS',
    /** BOM（UTF-8） */
    UTF8_BOM: '\uFEFF',
    /** 出力ファイル名テンプレート（{model}は機種名に置換） */
    OUTPUT_FILENAME_TEMPLATE: 'addressbook_{model}_{date}.csv',
  },

  /** バリデーション設定 */
  VALIDATION: {
    /** バリデーション実行の遅延（ms） - 入力中の頻繁な再検証を防止 */
    DEBOUNCE_MS: 300,
  },

  /** テーブル表示設定 */
  TABLE: {
    /** 仮想スクロールの行の高さ（px） */
    ROW_HEIGHT: 32,
    /** 画面外にレンダリングするバッファ行数 */
    BUFFER_ROWS: 20,
    /** 新規行追加時のデフォルト値 */
    DEFAULT_ROW_VALUES: {},
  },

  /** トースト通知の表示時間（ms） */
  TOAST_DURATION_MS: 4000,
};
