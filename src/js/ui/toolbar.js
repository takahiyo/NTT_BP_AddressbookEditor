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

  /**
   * ドロップダウンを生成するヘルパー
   * @param {string} label - 表示テキスト
   * @param {string} icon - アイコン絵文字
   * @returns {Object} { container, menu }
   */
  const createDropdown = (label, icon) => {
    const dropdown = document.createElement('div');
    dropdown.className = 'toolbar__dropdown';

    const toggle = document.createElement('button');
    toggle.className = 'toolbar__btn toolbar__btn--secondary toolbar__dropdown-toggle';
    toggle.innerHTML = `<span class="toolbar__btn-icon">${icon}</span>${label}<span class="toolbar__dropdown-arrow">▼</span>`;
    
    const menu = document.createElement('div');
    menu.className = 'toolbar__dropdown-menu';

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = dropdown.classList.contains('is-active');
      // 他のドロップダウンを閉じる
      document.querySelectorAll('.toolbar__dropdown').forEach(d => d.classList.remove('is-active'));
      if (!isActive) {
        dropdown.classList.add('is-active');
      }
    });

    dropdown.appendChild(toggle);
    dropdown.appendChild(menu);
    container.appendChild(dropdown);

    return { container: dropdown, menu };
  };

  // ドキュメントクリックでドロップダウンを閉じる
  document.addEventListener('click', () => {
    document.querySelectorAll('.toolbar__dropdown').forEach(d => d.classList.remove('is-active'));
  });

  /* === ファイル === */
  const fileDrop = createDropdown(UI_TEXT.TOOLBAR.CATEGORIES.FILE, '📁');
  fileDrop.menu.appendChild(createButton('btn-import', UI_TEXT.TOOLBAR.IMPORT_CSV, '📂', 'primary', handlers.onImport));
  fileDrop.menu.appendChild(createButton('btn-export', UI_TEXT.TOOLBAR.EXPORT_CSV, '💾', 'primary', handlers.onExport));

  /* === 行編集 === */
  const rowDrop = createDropdown(UI_TEXT.TOOLBAR.CATEGORIES.EDIT_ROW, '📝');
  rowDrop.menu.appendChild(createButton('btn-add-row', UI_TEXT.TOOLBAR.ADD_ROW, '➕', 'secondary', handlers.onAddRow));
  rowDrop.menu.appendChild(createButton('btn-delete-row', UI_TEXT.TOOLBAR.DELETE_ROW, '🗑️', 'secondary', handlers.onDeleteRow));

  /* === 列編集 === */
  const colDrop = createDropdown(UI_TEXT.TOOLBAR.CATEGORIES.EDIT_COL, '📊');
  colDrop.menu.appendChild(createButton('btn-to-half', UI_TEXT.TOOLBAR.CONVERT_HALFWIDTH, '㊀', 'secondary', handlers.onToHalf));
  colDrop.menu.appendChild(createButton('btn-to-full', UI_TEXT.TOOLBAR.CONVERT_FULLWIDTH, '㊁', 'secondary', handlers.onToFull));
  colDrop.menu.appendChild(createButton('btn-remove-symbols', UI_TEXT.TOOLBAR.REMOVE_SYMBOLS, '✂️', 'secondary', handlers.onRemoveSymbols));
  colDrop.menu.appendChild(createButton('btn-normalize-icons', UI_TEXT.TOOLBAR.NORMALIZE_ICONS, '🎨', 'secondary', handlers.onNormalizeIcons));

  /* === 自動加工 === */
  const autoProcDrop = createDropdown(UI_TEXT.TOOLBAR.CATEGORIES.AUTO_PROC, '🪄');
  autoProcDrop.menu.appendChild(createButton('btn-phone-proc', UI_TEXT.TOOLBAR.PHONE_PROCESS, '📞', 'secondary', handlers.onPhoneProcess));
  autoProcDrop.menu.appendChild(createButton('btn-furigana', UI_TEXT.TOOLBAR.GENERATE_FURIGANA, '📛', 'secondary', handlers.onFurigana));



  /* === 全体 === */
  const generalDrop = createDropdown(UI_TEXT.TOOLBAR.CATEGORIES.GENERAL, '⚙️');
  generalDrop.menu.appendChild(createButton('btn-auto-memory', UI_TEXT.TOOLBAR.AUTO_ASSIGN_MEMORY, '🔢', 'secondary', handlers.onAutoMemory));
  generalDrop.menu.appendChild(createButton('btn-truncate', UI_TEXT.TOOLBAR.TRUNCATE_ALL, '📏', 'warning', handlers.onTruncate));
  generalDrop.menu.appendChild(createButton('btn-delete-empty', UI_TEXT.TOOLBAR.DELETE_EMPTY_ROWS, '🧹', 'warning', handlers.onDeleteEmpty));
  generalDrop.menu.appendChild(createButton('btn-gaiji', UI_TEXT.TOOLBAR.GAIJI_SETTINGS, '⚙️', 'secondary', handlers.onGaijiSettings));

  /* === 全検証 === */
  const validateBtn = createButton('btn-validate', UI_TEXT.TOOLBAR.CATEGORIES.VALIDATE, '✅', 'secondary', handlers.onValidate);
  container.appendChild(validateBtn);

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
    'btn-auto-memory', 'btn-phone-proc', 'btn-furigana', 'btn-normalize-icons',
  ];
  dataRequiredButtons.forEach(id => {
    if (buttons[id]) {
      buttons[id].disabled = !hasData;
    }
  });
}
