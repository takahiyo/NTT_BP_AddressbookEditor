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
import { getByteLength } from '../utils/char-utils.js';

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
  }

  /**
   * 機種仕様を設定し、テーブルヘッダーを生成
   * @param {Object} spec - 機種仕様
   */
  setSpec(spec) {
    this._spec = spec;
    this._columns = spec.columns;
    /* 空状態のプレースホルダーを表示 */
    if (this._data.length === 0) {
      this._render();
    }
  }

  /**
   * データをセットしてテーブルを再描画
   * @param {Array<Object>} data - 行データ配列
   */
  setData(data) {
    this._data = data;
    this._selectedRows.clear();
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
      newRow[f.key] = '';
      /* アイコン番号のデフォルトは1 (0は不可) */
      if (f.key.startsWith('icon')) {
        newRow[f.key] = '1';
      }
    });

    this._data.splice(insertAt, 0, newRow);
    this._reindex();
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
    this._data.forEach((row, rowIndex) => {
      this._tbodyEl.appendChild(this._createRow(row, rowIndex));
    });
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
    const tr = document.createElement('tr');

    /* 選択チェックボックス列 */
    const thCheck = document.createElement('th');
    thCheck.className = 'col-rownum';
    const selectAll = document.createElement('input');
    selectAll.type = 'checkbox';
    selectAll.id = 'select-all-rows';
    selectAll.addEventListener('change', () => this._toggleSelectAll(selectAll.checked));
    thCheck.appendChild(selectAll);
    tr.appendChild(thCheck);

    /* 行番号列 */
    const thNum = document.createElement('th');
    thNum.className = 'col-rownum';
    thNum.textContent = UI_TEXT.TABLE.ROW_NUM;
    tr.appendChild(thNum);

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

      /* 制約がある場合、ツールチップにバイト制限を表示 */
      const constraint = this._spec?.fieldConstraints?.[col.key];
      if (constraint?.maxBytes) {
        th.title = `最大${constraint.maxBytes}バイト`;
      }
      tr.appendChild(th);
    });

    thead.appendChild(tr);
    this._tableEl.appendChild(thead);
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
        const value = e.target.value;
        this._data[rowIndex][col.key] = value;
        this._updateByteCount(td, col.key, value);

        /* 電話番号入力時にアイコンと属性を自動設定 (1) */
        if (col.type === 'phone' && value.trim().length > 0) {
          const index = col.key.replace('phone', '');
          const iconKey = `icon${index}`;
          const dialAttrKey = `dialAttr${index}`;

          if (!this._data[rowIndex][iconKey] || this._data[rowIndex][iconKey] === '0') {
            this._updateCellValue(rowIndex, iconKey, '1');
          }
          if (!this._data[rowIndex][dialAttrKey] || this._data[rowIndex][dialAttrKey] === '0') {
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
      const constraint = this._spec?.fieldConstraints?.[col.key];
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
