/**
 * テーブルエディタUI
 * CSVデータの表形式表示・編集機能
 *
 * 機能:
 * - カラム定義に基づくテーブル自動生成
 * - セル編集（input要素）
 * - バイトカウント表示
 * - 行選択、追加、削除
 * - バリデーション結果のハイライト反映
 */

import { UI_TEXT } from '../constants/ui-text.js';
import { APP_CONFIG } from '../constants/app-config.js';
import { getByteLength, toHalfWidth } from '../utils/char-utils.js';

/**
 * テーブルエディタクラス
 */
export class TableEditor {
  /**
   * @param {HTMLElement} container - テーブルを格納するコンテナ要素
   * @param {Function} onCellChange - セル値変更時のコールバック (rowIndex, fieldKey, newValue)
   */
  constructor(container, onCellChange) {
    this._container = container;
    this._onCellChange = onCellChange;
    this._data = [];
    this._columns = [];
    this._spec = null;
    this._validationResults = [];
    this._selectedRows = new Set();
    this._tableEl = null;
    this._tbodyEl = null;
    this._selectedColumns = new Set();
    this._sortConfig = { key: null, order: 'asc' }; // asc or desc
    this._currentPage = 1;
    this._pageSize = 100;
    this._mappingSpec = null; // 出力形式のマッピング用
  }

  /**
   * 機種仕様を設定し、テーブルヘッダーを生成
   * @param {Object} spec - 機種仕様
   */
  setSpec(spec) {
    this._spec = spec;
    /* カラム定義にフィールドのUI情報(type, cssClass等)をマージ */
    this._columns = spec.columns.map(col => {
      const field = spec.fields.find(f => f.key === col.key) || {};
      return { ...field, ...col };
    });
    /* 空状態のプレースホルダーを表示 */
    if (this._data.length === 0) {
      this._render();
    }
  }

  setMappingSpec(spec) {
    this._mappingSpec = spec;
    /* this._render(); 不要になったため呼び出しのみ残すか削除するが、互換性維持のため残す。
       あるいは何もせずリターンでOK */
  }

  /**
   * データをセットしてテーブルを再描画
   * @param {Array<Object>} data - 行データ配列
   */
  setData(data) {
    this._data = data;
    this._selectedRows.clear();
    this._currentPage = 1;
    this._render();
  }

  /**
   * 現在のデータを取得
   * @returns {Array<Object>}
   */
  getData() {
    return this._data;
  }

  /**
   * バリデーション結果をテーブルに反映
   * @param {Array<Object>} results - validateAll()の結果
   */
  setValidationResults(results) {
    this._validationResults = results;
    this._applyValidationHighlights();
  }

  /**
   * 選択中の行インデックスを取得
   * @returns {Array<number>}
   */
  getSelectedRowIndices() {
    return [...this._selectedRows];
  }

  /**
   * 行を追加
   * @param {number} [insertAt] - 挿入位置（省略時は末尾）
   */
  addRow() {
    /* 選択行の後に挿入、何も選択されていなければ末尾 */
    const selectedIndices = this.getSelectedRowIndices();
    let insertAt = this._data.length;
    if (selectedIndices.length > 0) {
      insertAt = Math.max(...selectedIndices) + 1;
    }

    const newRow = {};
    this._spec.fields.forEach(f => {
      newRow[f.key] = f.defaultValue !== undefined && f.defaultValue !== '' ? f.defaultValue : '';
      /* アイコン番号等の旧互換対応（すでにdefaultValueがあれば上書きしない） */
      if (f.key.startsWith('icon') && (!newRow[f.key] || newRow[f.key] === '0')) {
        newRow[f.key] = '1';
      }
    });

    this._data.splice(insertAt, 0, newRow);
    this._reindex();
    
    /* 挿入された行があるページに移動 */
    this._currentPage = Math.ceil((insertAt + 1) / this._pageSize) || 1;
    this._render();
    
    /* 追加された行をスクロールで見えるように（簡易実装） */
    setTimeout(() => {
      const el = document.getElementById(`cell-${insertAt}-${this._columns[0].key}`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el?.focus();
    }, 100);
  }

  /**
   * 選択中の行を削除
   * @returns {number} 削除した行数
   */
  deleteSelectedRows() {
    if (this._selectedRows.size === 0) return 0;
    const indices = [...this._selectedRows].sort((a, b) => b - a);
    indices.forEach(i => this._data.splice(i, 1));
    const count = indices.length;
    this._selectedRows.clear();
    this._reindex();
    this._render();
    return count;
  }

  /**
   * データを直接更新（一括変換後等）
   * @param {Array<Object>} newData - 更新後データ
   */
  updateData(newData) {
    this._data = newData;
    this._reindex();
    this._currentPage = 1;
    this._render();
  }

  /* ============================================
   * 内部メソッド
   * ============================================ */

  /** 行インデックスを振り直し */
  _reindex() {
    this._data.forEach((row, i) => { row._rowIndex = i; });
  }

  /**
   * 選択されているカラムキーを取得
   * @returns {Array<string>}
   */
  getSelectedColumns() {
    return [...this._selectedColumns];
  }

  /**
   * カラムのソートを実行
   * @param {string} key - カラムキー
   */
  _sortData(key) {
    if (this._sortConfig.key === key) {
      this._sortConfig.order = this._sortConfig.order === 'asc' ? 'desc' : 'asc';
    } else {
      this._sortConfig.key = key;
      this._sortConfig.order = 'asc';
    }

    const col = this._columns.find(c => c.key === key);
    const isNumber = col?.type === 'number';

    this._data.sort((a, b) => {
      let valA = a[key] || '';
      let valB = b[key] || '';

      if (isNumber) {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return this._sortConfig.order === 'asc' ? -1 : 1;
      if (valA > valB) return this._sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });

    this._currentPage = 1;
    this._render();
  }

  /** テーブル全体を描画 */
  _render() {
    this._container.innerHTML = '';

    if (!this._columns.length || !this._data.length) {
      this._renderEmpty();
      return;
    }

    /* テーブル要素生成 */
    this._tableEl = document.createElement('table');
    this._tableEl.className = 'data-table';
    this._tableEl.id = 'data-table';

    /* ヘッダー */
    this._renderHeader();

    /* ボディ */
    this._tbodyEl = document.createElement('tbody');
    
    /* ページネーション計算 */
    const totalItems = this._data.length;
    const totalPages = Math.ceil(totalItems / this._pageSize) || 1;
    if (this._currentPage > totalPages) this._currentPage = totalPages;
    if (this._currentPage < 1) this._currentPage = 1;

    const startIndex = (this._currentPage - 1) * this._pageSize;
    const endIndex = Math.min(startIndex + this._pageSize, totalItems);

    /* ページネーションコントロールの描画 (上部) */
    this._renderPagination(startIndex, endIndex, totalItems, totalPages);

    /* テーブル要素生成 */
    this._tableEl = document.createElement('table');
    this._tableEl.className = 'data-table';
    this._tableEl.id = 'data-table';

    /* ヘッダー */
    this._renderHeader();

    /* ボディ */
    this._tbodyEl = document.createElement('tbody');

    for (let i = startIndex; i < endIndex; i++) {
      this._tbodyEl.appendChild(this._createRow(this._data[i], i));
    }
    
    this._tableEl.appendChild(this._tbodyEl);

    this._container.appendChild(this._tableEl);
  }

  /** 空状態のプレースホルダーを表示 */
  _renderEmpty() {
    const empty = document.createElement('div');
    empty.className = 'table-container__empty';
    empty.innerHTML = `
      <span class="table-container__empty-icon">${UI_TEXT.TABLE.EMPTY_TITLE}</span>
      <span class="table-container__empty-text">${UI_TEXT.TABLE.EMPTY_TEXT}</span>
      <span class="table-container__empty-hint">${UI_TEXT.TABLE.EMPTY_HINT}</span>
    `;
    this._container.appendChild(empty);
  }

  /** テーブルヘッダーを生成 */
  _renderHeader() {
    const thead = document.createElement('thead');
    const tr1 = document.createElement('tr');

    /* 選択チェックボックス列 */
    const thCheck = document.createElement('th');
    thCheck.className = 'col-rownum';
    const selectAll = document.createElement('input');
    selectAll.type = 'checkbox';
    selectAll.id = 'select-all-rows';
    selectAll.addEventListener('change', () => this._toggleSelectAll(selectAll.checked));
    thCheck.appendChild(selectAll);
    tr1.appendChild(thCheck);

    /* 行番号列 */
    const thNum = document.createElement('th');
    thNum.className = 'col-rownum';
    thNum.textContent = UI_TEXT.TABLE.ROW_NUM;
    tr1.appendChild(thNum);

    /* データ列 */
    this._columns.forEach(col => {
      const th = document.createElement('th');
      th.className = col.cssClass || '';
      
      /* 列選択用チェックボックス */
      const colCheck = document.createElement('input');
      colCheck.type = 'checkbox';
      colCheck.className = 'col-selector';
      colCheck.checked = this._selectedColumns.has(col.key);
      colCheck.addEventListener('change', (e) => {
        if (e.target.checked) this._selectedColumns.add(col.key);
        else this._selectedColumns.delete(col.key);
      });
      th.appendChild(colCheck);

      /* カラム名ラベル */
      const label = document.createElement('span');
      label.className = 'col-label';
      label.textContent = col.label;
      label.addEventListener('click', () => this._sortData(col.key));
      th.appendChild(label);

      /* ソートアイコン */
      if (this._sortConfig.key === col.key) {
        const icon = document.createElement('span');
        icon.className = 'sort-icon';
        icon.textContent = this._sortConfig.order === 'asc' ? ' 🔼' : ' 🔽';
        th.appendChild(icon);
      }

      /* アイコンまたは発信属性の場合、選択可能なリストをツールチップに表示 */
      if (col.key.startsWith('icon') || col.key.startsWith('dialAttr')) {
        const range = col.key.startsWith('icon') ? this._spec.iconRange : this._spec.dialAttrRange;
        if (range && range.labels) {
          const lines = Object.entries(range.labels)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([val, label]) => `${val}: ${label}`);
          th.title = lines.join('\n');
        }
      }

      /* 制約がある場合、ツールチップにバイト制限を表示 */
      const constraint = (this._spec?.fieldConstraints || this._spec?.constraints)?.[col.key];
      if (constraint?.maxBytes) {
        th.title = (th.title ? th.title + '\n' : '') + `最大${constraint.maxBytes}バイト`;
      }
      tr1.appendChild(th);
    });

    thead.appendChild(tr1);
    this._tableEl.appendChild(thead);
  }

  /**
   * ページネーションコントロールを描画
   * @param {number} startIndex - 現在ページの開始インデックス
   * @param {number} endIndex - 現在ページの終了インデックス(含まない)
   * @param {number} totalItems - 総アイテム数
   * @param {number} totalPages - 総ページ数
   */
  _renderPagination(startIndex, endIndex, totalItems, totalPages) {
    if (totalItems === 0) return;

    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-controls';

    const leftGroup = document.createElement('div');
    leftGroup.className = 'pagination-controls__left';

    const infoSpan = document.createElement('span');
    infoSpan.className = 'pagination-controls__info';
    let infoText = UI_TEXT.TABLE.PAGINATION_INFO
      .replace('{start}', startIndex + 1)
      .replace('{end}', endIndex)
      .replace('{total}', totalItems);
    infoSpan.textContent = infoText;

    const pageSizeSelect = document.createElement('select');
    pageSizeSelect.className = 'pagination-controls__select';
    [100, 500, 1000].forEach(size => {
      const option = document.createElement('option');
      option.value = size;
      option.textContent = `${size}件/ページ`;
      if (size === this._pageSize) option.selected = true;
      pageSizeSelect.appendChild(option);
    });
    pageSizeSelect.addEventListener('change', (e) => {
      this._pageSize = parseInt(e.target.value, 10);
      this._currentPage = 1;
      this._render();
    });

    leftGroup.appendChild(infoSpan);
    leftGroup.appendChild(pageSizeSelect);

    const rightGroup = document.createElement('div');
    rightGroup.className = 'pagination-controls__right';

    const pageInfoSpan = document.createElement('span');
    pageInfoSpan.className = 'pagination-controls__info';
    pageInfoSpan.textContent = UI_TEXT.TABLE.PAGINATION_PAGE
      .replace('{current}', this._currentPage)
      .replace('{total}', totalPages);

    const btnPrev = document.createElement('button');
    btnPrev.className = 'pagination-controls__btn';
    btnPrev.textContent = UI_TEXT.TABLE.PAGINATION_PREV;
    btnPrev.disabled = this._currentPage <= 1;
    btnPrev.addEventListener('click', () => {
      if (this._currentPage > 1) {
        this._currentPage--;
        this._render();
      }
    });

    const btnNext = document.createElement('button');
    btnNext.className = 'pagination-controls__btn';
    btnNext.textContent = UI_TEXT.TABLE.PAGINATION_NEXT;
    btnNext.disabled = this._currentPage >= totalPages;
    btnNext.addEventListener('click', () => {
      if (this._currentPage < totalPages) {
        this._currentPage++;
        this._render();
      }
    });

    rightGroup.appendChild(pageInfoSpan);
    rightGroup.appendChild(btnPrev);
    rightGroup.appendChild(btnNext);

    paginationContainer.appendChild(leftGroup);
    paginationContainer.appendChild(rightGroup);
    
    this._container.appendChild(paginationContainer);
  }

  /**
   * データ行のDOM要素を生成
   * @param {Object} rowData - 行データ
   * @param {number} rowIndex - 行インデックス
   * @returns {HTMLTableRowElement}
   */
  _createRow(rowData, rowIndex) {
    const tr = document.createElement('tr');
    tr.dataset.rowIndex = rowIndex;

    /* 行破棄ハイライト（システム容量超過） */
    if (this._mappingSpec && this._mappingSpec.systemCapacity) {
      /* TODO: systemCapacity の構造に合わせた厳密な判定が必要だが、
       * 現状の簡易実装として容量を超えている場合にハイライト */
       // A1等の単一機種の場合は1つ目を使用
      const capacities = Object.values(this._mappingSpec.systemCapacity)[0];
      const maxRows = capacities ? (capacities[APP_CONFIG.DEFAULT_DIGIT_MODE] || Object.values(capacities)[0]) : 99999;
      
      if (rowIndex >= maxRows) {
        tr.classList.add('row--discarded');
        tr.title = `出力機種の容量（${maxRows}件）を超えているため、書き出し時に破棄されます`;
      }
    }

    /* チェックボックス */
    const tdCheck = document.createElement('td');
    tdCheck.className = 'col-rownum';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = this._selectedRows.has(rowIndex);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        this._selectedRows.add(rowIndex);
      } else {
        this._selectedRows.delete(rowIndex);
      }
    });
    tdCheck.appendChild(checkbox);
    tr.appendChild(tdCheck);

    /* 行番号 */
    const tdNum = document.createElement('td');
    tdNum.className = 'col-rownum';
    tdNum.textContent = rowIndex + 1;
    tr.appendChild(tdNum);

    /* データセル */
    this._columns.forEach(col => {
      const td = document.createElement('td');
      td.className = col.cssClass || '';
      td.dataset.fieldKey = col.key;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'cell-input';
      input.value = rowData[col.key] || '';
      input.id = `cell-${rowIndex}-${col.key}`;

      /* セル値変更イベント */
      input.addEventListener('input', (e) => {
        let value = e.target.value;
        if (col.forceHalfWidth) {
          value = toHalfWidth(value);
          if (e.target.value !== value) {
            e.target.value = value;
          }
        }
        this._data[rowIndex][col.key] = value;
        this._updateByteCount(td, col.key, value);

        /* 電話番号入力時にアイコンと属性を自動設定 (1) */
        if (col.type === 'phone') {
          const index = col.key.replace('phone', '');
          const iconKey = `icon${index}`;
          const dialAttrKey = `dialAttr${index}`;

          const currentIcon = this._data[rowIndex][iconKey];
          const currentDialAttr = this._data[rowIndex][dialAttrKey];
          const hasPhoneInput = value.trim().length > 0;

          /* アイコン番号の範囲チェック (1-8) */
          let isValidIcon = false;
          if (currentIcon !== undefined && currentIcon !== null && currentIcon !== '') {
            const numIcon = parseInt(currentIcon, 10);
            if (!isNaN(numIcon) && numIcon >= 1 && numIcon <= 8) {
              isValidIcon = true;
            }
          }

          /* 発信番号属性の範囲チェック (1-2) */
          let isValidDialAttr = false;
          if (currentDialAttr !== undefined && currentDialAttr !== null && currentDialAttr !== '') {
            const numDialAttr = parseInt(currentDialAttr, 10);
            if (!isNaN(numDialAttr) && numDialAttr >= 1 && numDialAttr <= 2) {
              isValidDialAttr = true;
            }
          }

          if (hasPhoneInput) {
            /* 電話番号あり: どちらかでも無効値(空含む)なら、両方初期値1をセット */
            if (!isValidIcon || !isValidDialAttr) {
              console.log(`[TableEditor] 電話あり+無効値: Icon(${currentIcon}->1), DialAttr(${currentDialAttr}->1)`);
              this._updateCellValue(rowIndex, iconKey, '1');
              this._updateCellValue(rowIndex, dialAttrKey, '1');
            }
          } else {
            /* 電話番号空: 常に初期値1にリセット */
            console.log(`[TableEditor] 電話なし: Icon(${currentIcon}->1), DialAttr(${currentDialAttr}->1)`);
            this._updateCellValue(rowIndex, iconKey, '1');
            this._updateCellValue(rowIndex, dialAttrKey, '1');
          }
        }

        if (this._onCellChange) {
          this._onCellChange(rowIndex, col.key, value);
        }
      });

      /* フォーカス時にバイトカウント表示 */
      input.addEventListener('focus', () => {
        this._updateByteCount(td, col.key, input.value);
      });

      td.appendChild(input);

      /* キーナビゲーション（上下移動） */
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this._focusCell(rowIndex - 1, col.key);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this._focusCell(rowIndex + 1, col.key);
        }
      });

      /* バイトカウント表示要素 */
      const constraint = (this._spec?.fieldConstraints || this._spec?.constraints)?.[col.key];
      if (constraint?.maxBytes) {
        const byteCount = document.createElement('span');
        byteCount.className = 'cell-byte-count';
        byteCount.dataset.fieldKey = col.key;
        td.appendChild(byteCount);
        /* 初期値のバイトカウントを計算 */
        this._updateByteCount(td, col.key, rowData[col.key] || '');
      }

      tr.appendChild(td);
    });

    return tr;
  }

  /**
   * セルのバイトカウント表示を更新
   * @param {HTMLElement} td - セルのtd要素
   * @param {string} fieldKey - フィールドキー
   * @param {string} value - 現在の値
   */
  _updateByteCount(td, fieldKey, value) {
    const constraint = this._spec?.fieldConstraints?.[fieldKey];
    if (!constraint?.maxBytes) return;

    const byteCountEl = td.querySelector('.cell-byte-count');
    if (!byteCountEl) return;

    const currentBytes = getByteLength(value);
    const maxBytes = constraint.maxBytes;
    byteCountEl.textContent = `${currentBytes}/${maxBytes}B`;

    if (currentBytes > maxBytes) {
      byteCountEl.classList.add('cell-byte-count--over');
    } else {
      byteCountEl.classList.remove('cell-byte-count--over');
    }
  }

  /** バリデーション結果をテーブルに反映（ハイライト） */
  _applyValidationHighlights() {
    if (!this._tbodyEl) return;

    const rows = this._tbodyEl.querySelectorAll('tr');
    rows.forEach((tr, rowIndex) => {
      const result = this._validationResults[rowIndex];
      if (!result) {
        /* 問題なし → ハイライト解除 */
        tr.classList.remove('row--empty-phone');
        tr.querySelectorAll('td').forEach(td => {
          td.classList.remove('cell--error', 'cell--warning');
          td.title = '';
        });
        return;
      }

      /* 行レベルのエラー（空電話番号等） */
      if (result._rowErrors && result._rowErrors.length > 0) {
        tr.classList.add('row--empty-phone');
      } else {
        tr.classList.remove('row--empty-phone');
      }

      /* セルレベルのハイライト */
      tr.querySelectorAll('td[data-field-key]').forEach(td => {
        const fieldKey = td.dataset.fieldKey;
        const fieldResults = result[fieldKey];

        td.classList.remove('cell--error', 'cell--warning');
        td.title = '';

        if (fieldResults && fieldResults.length > 0) {
          /* 最も重大なレベルでハイライト */
          const hasError = fieldResults.some(r => r.severity === 'error');
          td.classList.add(hasError ? 'cell--error' : 'cell--warning');
          td.title = fieldResults.map(r => r.message).join('\n');
        }
      });
    });
  }

  /**
   * 全行の選択/解除を切り替え
   * @param {boolean} checked - 選択状態
   */
  _toggleSelectAll(checked) {
    this._selectedRows.clear();
    if (checked) {
      this._data.forEach((_, i) => this._selectedRows.add(i));
    }
    /* チェックボックスの表示を更新 */
    const checkboxes = this._tbodyEl?.querySelectorAll('input[type="checkbox"]');
    checkboxes?.forEach(cb => { cb.checked = checked; });
  }

  /**
   * 特定のセルの値を更新して再描画（input要素も同期）
   * @param {number} rowIndex - 行番号
   * @param {string} fieldKey - フィールドキー
   * @param {string} value - 新しい値
   */
  _updateCellValue(rowIndex, fieldKey, value) {
    this._data[rowIndex][fieldKey] = value;
    const input = document.getElementById(`cell-${rowIndex}-${fieldKey}`);
    if (input) {
      input.value = value;
      const td = input.closest('td');
      if (td) this._updateByteCount(td, fieldKey, value);
    }
  }

  /**
   * 指定したセルにフォーカスを移動
   * @param {number} rowIndex - 行番号
   * @param {string} fieldKey - フィールドキー
   */
  _focusCell(rowIndex, fieldKey) {
    if (rowIndex < 0 || rowIndex >= this._data.length) return;
    const input = document.getElementById(`cell-${rowIndex}-${fieldKey}`);
    input?.focus();
  }
}
