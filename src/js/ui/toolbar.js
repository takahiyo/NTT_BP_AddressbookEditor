/**
 * ツールバーUI
 * ボタン群の生成とイベントバインド
 */

import { UI_TEXT } from '../constants/ui-text.js';

/**
 * ツールバーを初期化
 * @param {HTMLElement} container - ツールバーのコンテナ要素
 * @param {Object} handlers - ボタンごとのクリックハンドラ
 * @returns {Object} ボタン要素への参照（状態の有効/無効切替用）
 */
export function initToolbar(container, handlers) {
  const buttons = {};

  /**
   * ボタン要素を生成するヘルパー
   * @param {string} id - ボタンID
   * @param {string} label - 表示テキスト
   * @param {string} icon - アイコン絵文字
   * @param {string} style - ボタンスタイル('primary'|'secondary'|'warning')
   * @param {Function} handler - クリックハンドラ
   * @returns {HTMLButtonElement}
   */
  const createButton = (id, label, icon, style, handler) => {
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = `toolbar__btn toolbar__btn--${style}`;
    btn.innerHTML = `<span class="toolbar__btn-icon">${icon}</span>${label}`;
    btn.disabled = false;
    if (handler) {
      btn.addEventListener('click', handler);
    }
    buttons[id] = btn;
    return btn;
  };

  /** セパレーターを生成 */
  const createSeparator = () => {
    const sep = document.createElement('div');
    sep.className = 'toolbar__separator';
    return sep;
  };

  /* === ファイル操作グループ === */
  const fileGroup = document.createElement('div');
  fileGroup.className = 'toolbar__group';
  fileGroup.appendChild(createButton('btn-import', UI_TEXT.TOOLBAR.IMPORT_CSV,  '📂', 'primary',   handlers.onImport));
  fileGroup.appendChild(createButton('btn-export', UI_TEXT.TOOLBAR.EXPORT_CSV,  '💾', 'primary',   handlers.onExport));
  container.appendChild(fileGroup);

  container.appendChild(createSeparator());

  /* === 行操作グループ === */
  const rowGroup = document.createElement('div');
  rowGroup.className = 'toolbar__group';
  rowGroup.appendChild(createButton('btn-add-row',    UI_TEXT.TOOLBAR.ADD_ROW,    '➕', 'secondary', handlers.onAddRow));
  rowGroup.appendChild(createButton('btn-delete-row', UI_TEXT.TOOLBAR.DELETE_ROW, '🗑️', 'secondary', handlers.onDeleteRow));
  container.appendChild(rowGroup);

  container.appendChild(createSeparator());

  /* === バリデーショングループ === */
  const validGroup = document.createElement('div');
  validGroup.className = 'toolbar__group';
  validGroup.appendChild(createButton('btn-validate', UI_TEXT.TOOLBAR.VALIDATE_ALL, '✅', 'secondary', handlers.onValidate));
  container.appendChild(validGroup);

  container.appendChild(createSeparator());

  /* === 変換グループ === */
  const convertGroup = document.createElement('div');
  convertGroup.className = 'toolbar__group';
  convertGroup.appendChild(createButton('btn-to-half',       UI_TEXT.TOOLBAR.CONVERT_HALFWIDTH, '㊀', 'secondary', handlers.onToHalf));
  convertGroup.appendChild(createButton('btn-to-full',       UI_TEXT.TOOLBAR.CONVERT_FULLWIDTH, '㊁', 'secondary', handlers.onToFull));
  convertGroup.appendChild(createButton('btn-remove-symbols', UI_TEXT.TOOLBAR.REMOVE_SYMBOLS,  '✂️', 'secondary', handlers.onRemoveSymbols));
  container.appendChild(convertGroup);

  container.appendChild(createSeparator());

  /* === 一括処理グループ === */
  const batchGroup = document.createElement('div');
  batchGroup.className = 'toolbar__group';
  batchGroup.appendChild(createButton('btn-truncate',     UI_TEXT.TOOLBAR.TRUNCATE_ALL,      '📏', 'warning',   handlers.onTruncate));
  batchGroup.appendChild(createButton('btn-delete-empty', UI_TEXT.TOOLBAR.DELETE_EMPTY_ROWS,  '🧹', 'warning',   handlers.onDeleteEmpty));
  container.appendChild(batchGroup);

  container.appendChild(createSeparator());

  const settingsGroup = document.createElement('div');
  settingsGroup.className = 'toolbar__group';
  settingsGroup.appendChild(createButton('btn-gaiji', UI_TEXT.TOOLBAR.GAIJI_SETTINGS, '⚙️', 'secondary', handlers.onGaijiSettings));
  container.appendChild(settingsGroup);

  container.appendChild(createSeparator());

  /* === 新機能グループ === */
  const newGroup = document.createElement('div');
  newGroup.className = 'toolbar__group';
  newGroup.appendChild(createButton('btn-auto-memory', UI_TEXT.TOOLBAR.AUTO_ASSIGN_MEMORY, '🔢', 'secondary', handlers.onAutoMemory));
  newGroup.appendChild(createButton('btn-phone-proc',  UI_TEXT.TOOLBAR.PHONE_PROCESS,        '📞', 'secondary', handlers.onPhoneProcess));
  container.appendChild(newGroup);

  return buttons;
}

/**
 * ボタンの有効/無効を一括設定
 * @param {Object} buttons - initToolbarの戻り値
 * @param {boolean} hasData - データが存在するか
 */
export function updateToolbarState(buttons, hasData) {
  const dataRequiredButtons = [
    'btn-export', 'btn-delete-row',
    'btn-validate', 'btn-to-half', 'btn-to-full',
    'btn-remove-symbols', 'btn-truncate', 'btn-delete-empty',
    'btn-auto-memory', 'btn-phone-proc',
  ];
  dataRequiredButtons.forEach(id => {
    if (buttons[id]) {
      buttons[id].disabled = !hasData;
    }
  });
}
