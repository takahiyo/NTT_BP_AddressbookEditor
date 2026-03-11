/**
 * アプリケーションメインコントローラ
 * 全モジュールの初期化、イベントハンドリング、状態管理
 */

import { APP_CONFIG } from './constants/app-config.js';
import { UI_TEXT } from './constants/ui-text.js';
import { getSpec, getAllSpecs, getSpecOptions } from './models/spec-registry.js';
import { parseCSVFile, mapRowsToObjects } from './services/csv-parser.js';
import { buildCSVText, objectsToRows, downloadCSV, generateFilename } from './services/csv-exporter.js';
import { validateAll } from './services/validator.js';
import {
  toHalfWidth, toFullWidth, removeSymbols,
  truncateField, deleteEmptyPhoneRows,
} from './services/converter.js';
import { convertBetweenModels } from './services/model-converter.js';
import { TableEditor } from './ui/table-editor.js';
import { initToolbar, updateToolbarState } from './ui/toolbar.js';
import { showToast, formatText } from './ui/toast.js';
import { confirmDialog, showGaijiEditor } from './ui/modal.js';

/* ============================================
 * アプリ状態
 * ============================================ */

/** アプリケーション状態 */
const state = {
  /** 現在の入力機種仕様 */
  inputSpec: null,
  /** 現在の出力機種仕様 */
  outputSpec: null,
  /** 現在の桁数モード */
  digitMode: APP_CONFIG.DEFAULT_DIGIT_MODE,
  /** 読み込み時のCSVヘッダー */
  csvHeader: [],
  /** 読み込み時のエンコーディング */
  detectedEncoding: '',
  /** テーブルエディタインスタンス */
  tableEditor: null,
  /** ツールバーボタン参照 */
  toolbarButtons: null,
  /** 外字設定（使用不可文字のSet） */
  gaijiChars: new Set(),
  /** 外字設定テキスト（テキストエリアの生テキスト） */
  gaijiText: '',
  /** バリデーション結果 */
  lastValidation: null,
};

/* ============================================
 * 初期化
 * ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initSpecs();
  initTableEditor();
  initToolbarUI();
  initDragDrop();
  initFileInput();
  loadGaijiFromStorage();
  updateStatusBar();
});

/** 機種セレクターの初期化 */
function initSpecs() {
  const inputSelect = document.getElementById('input-model-select');
  const outputSelect = document.getElementById('output-model-select');
  const digitSelect = document.getElementById('digit-mode-select');

  const options = getSpecOptions();
  options.forEach(opt => {
    inputSelect.add(new Option(opt.name, opt.id));
    outputSelect.add(new Option(opt.name, opt.id));
  });

  /* デフォルト機種を設定 */
  state.inputSpec = getSpec(APP_CONFIG.DEFAULT_SPEC_ID);
  state.outputSpec = getSpec(APP_CONFIG.DEFAULT_SPEC_ID);

  /* 桁数モードのオプションを生成 */
  if (state.inputSpec?.digitModes) {
    Object.entries(state.inputSpec.digitModes).forEach(([key, mode]) => {
      digitSelect.add(new Option(mode.label, key));
    });
    digitSelect.value = APP_CONFIG.DEFAULT_DIGIT_MODE;
  }

  /* 変更イベント */
  inputSelect.addEventListener('change', () => {
    state.inputSpec = getSpec(inputSelect.value);
    state.tableEditor.setSpec(state.inputSpec);
    runValidation();
  });

  outputSelect.addEventListener('change', () => {
    state.outputSpec = getSpec(outputSelect.value);
  });

  digitSelect.addEventListener('change', () => {
    state.digitMode = digitSelect.value;
  });
}

/** テーブルエディタの初期化 */
function initTableEditor() {
  const container = document.getElementById('table-container');
  state.tableEditor = new TableEditor(container, onCellChange);
  state.tableEditor.setSpec(state.inputSpec);
}

/** ツールバーの初期化 */
function initToolbarUI() {
  const container = document.getElementById('toolbar');
  state.toolbarButtons = initToolbar(container, {
    onImport: handleImport,
    onExport: handleExport,
    onAddRow: handleAddRow,
    onDeleteRow: handleDeleteRow,
    onValidate: handleValidate,
    onToHalf: handleToHalf,
    onToFull: handleToFull,
    onRemoveSymbols: handleRemoveSymbols,
    onTruncate: handleTruncate,
    onDeleteEmpty: handleDeleteEmpty,
    onGaijiSettings: handleGaijiSettings,
  });
  updateToolbarState(state.toolbarButtons, false);
}

/** ドラッグ＆ドロップの初期化 */
function initDragDrop() {
  const dropOverlay = document.getElementById('drop-overlay');
  let dragCounter = 0;

  document.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dropOverlay.classList.add('is-active');
  });

  document.addEventListener('dragleave', () => {
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropOverlay.classList.remove('is-active');
    }
  });

  document.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.classList.remove('is-active');
    const file = e.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  });
}

/** 隠しファイル入力の初期化 */
function initFileInput() {
  const fileInput = document.getElementById('file-input');
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    fileInput.value = ''; /* 同じファイルの再読込を可能に */
  });
}

/* ============================================
 * ファイル操作ハンドラ
 * ============================================ */

/** CSV読込ボタンのハンドラ */
function handleImport() {
  document.getElementById('file-input').click();
}

/**
 * ファイルを読み込んでテーブルに表示
 * @param {File} file - CSVファイル
 */
async function loadFile(file) {
  try {
    const { header, rows, encoding } = await parseCSVFile(file);
    state.csvHeader = header;
    state.detectedEncoding = encoding;

    /* カラム定義に基づいてデータをマッピング */
    const data = mapRowsToObjects(rows, state.inputSpec.columns);
    state.tableEditor.setData(data);
    updateToolbarState(state.toolbarButtons, true);
    runValidation();
    updateStatusBar();

    showToast(formatText(UI_TEXT.TOAST.IMPORT_SUCCESS, { count: data.length }), 'success');
  } catch (err) {
    console.error('[app] CSV読込エラー:', err);
    showToast(formatText(UI_TEXT.TOAST.IMPORT_ERROR, { message: err.message }), 'error');
  }
}

/** CSV書出ボタンのハンドラ */
function handleExport() {
  const data = state.tableEditor.getData();
  if (!data || data.length === 0) {
    showToast(UI_TEXT.TOAST.NO_DATA, 'error');
    return;
  }

  /* 出力機種のカラム構成でCSVを生成 */
  let exportData = data;
  let exportSpec = state.outputSpec;

  /* 入力機種と出力機種が異なる場合は変換 */
  if (state.inputSpec.id !== state.outputSpec.id) {
    const result = convertBetweenModels(data, state.inputSpec, state.outputSpec);
    exportData = result.data;
    result.warnings.forEach(w => showToast(w, 'info'));
  }

  /* ヘッダー行を生成 */
  const header = exportSpec.columns.map(col => col.label);
  const rows = objectsToRows(exportData, exportSpec.columns);
  const csvText = buildCSVText(header, rows);

  /* ダウンロード */
  const filename = generateFilename(exportSpec.name);
  downloadCSV(csvText, exportSpec.encoding, filename);

  showToast(UI_TEXT.TOAST.EXPORT_SUCCESS, 'success');
}

/* ============================================
 * 行操作ハンドラ
 * ============================================ */

function handleAddRow() {
  state.tableEditor.addRow();
  updateStatusBar();
}

async function handleDeleteRow() {
  const selected = state.tableEditor.getSelectedRowIndices();
  if (selected.length === 0) {
    showToast(UI_TEXT.ERRORS.NO_ROWS_SELECTED, 'info');
    return;
  }
  const ok = await confirmDialog(
    formatText(UI_TEXT.MODAL.CONFIRM_DELETE, { count: selected.length })
  );
  if (ok) {
    state.tableEditor.deleteSelectedRows();
    runValidation();
    updateStatusBar();
  }
}

/* ============================================
 * バリデーション
 * ============================================ */

function handleValidate() {
  runValidation();
  const v = state.lastValidation;
  showToast(
    formatText(UI_TEXT.TOAST.VALIDATION_COMPLETE, { errors: v.errorCount, warnings: v.warningCount }),
    v.errorCount > 0 ? 'error' : 'success'
  );
}

/** バリデーションを実行して結果を反映 */
function runValidation() {
  const data = state.tableEditor.getData();
  if (!data || data.length === 0) return;

  state.lastValidation = validateAll(data, state.inputSpec, state.gaijiChars);
  state.tableEditor.setValidationResults(state.lastValidation.results);
  updateStatusBar();
}

/** セル値変更時のコールバック（遅延バリデーション） */
let validateTimer = null;
function onCellChange(_rowIndex, _fieldKey, _newValue) {
  clearTimeout(validateTimer);
  validateTimer = setTimeout(() => {
    runValidation();
  }, APP_CONFIG.VALIDATION.DEBOUNCE_MS);
}

/* ============================================
 * 変換・一括処理ハンドラ
 * ============================================ */

/** 半角変換：フリガナ列を半角に */
function handleToHalf() {
  const data = state.tableEditor.getData();
  let count = 0;
  const newData = data.map(row => {
    const oldVal = row.furigana || '';
    const newVal = toHalfWidth(oldVal);
    if (oldVal !== newVal) count++;
    return { ...row, furigana: newVal };
  });
  state.tableEditor.updateData(newData);
  runValidation();
  showToast(formatText(UI_TEXT.TOAST.CONVERT_COMPLETE, { count }), 'success');
}

/** 全角変換：名称列を全角に */
function handleToFull() {
  const data = state.tableEditor.getData();
  let count = 0;
  const newData = data.map(row => {
    const oldVal = row.name || '';
    const newVal = toFullWidth(oldVal);
    if (oldVal !== newVal) count++;
    return { ...row, name: newVal };
  });
  state.tableEditor.updateData(newData);
  runValidation();
  showToast(formatText(UI_TEXT.TOAST.CONVERT_COMPLETE, { count }), 'success');
}

/** 記号削除：フリガナ列から記号を削除 */
function handleRemoveSymbols() {
  const data = state.tableEditor.getData();
  let count = 0;
  const newData = data.map(row => {
    const oldVal = row.furigana || '';
    const newVal = removeSymbols(oldVal);
    if (oldVal !== newVal) count++;
    return { ...row, furigana: newVal };
  });
  state.tableEditor.updateData(newData);
  runValidation();
  showToast(formatText(UI_TEXT.TOAST.CONVERT_COMPLETE, { count }), 'success');
}

/** 超過カット：全制約フィールドの超過分をカット */
async function handleTruncate() {
  const ok = await confirmDialog(UI_TEXT.MODAL.CONFIRM_TRUNCATE);
  if (!ok) return;

  let data = state.tableEditor.getData();
  let totalCount = 0;

  /* 制約のある全フィールドに対してカット */
  const constraints = state.inputSpec.fieldConstraints || {};
  Object.entries(constraints).forEach(([key, constraint]) => {
    if (constraint.maxBytes) {
      const result = truncateField(data, key, constraint.maxBytes);
      data = result.data;
      totalCount += result.truncatedCount;
    }
  });

  state.tableEditor.updateData(data);
  runValidation();
  showToast(formatText(UI_TEXT.TOAST.TRUNCATE_COMPLETE, { count: totalCount }), 'success');
}

/** 空行削除：電話番号が全スロット空の行を削除 */
async function handleDeleteEmpty() {
  const data = state.tableEditor.getData();
  const result = deleteEmptyPhoneRows(data, state.inputSpec.phoneNumberSlots);

  if (result.deletedCount === 0) {
    showToast('削除対象の空行はありません', 'info');
    return;
  }

  state.tableEditor.updateData(result.data);
  runValidation();
  updateStatusBar();
  showToast(formatText(UI_TEXT.TOAST.EMPTY_ROWS_DELETED, { count: result.deletedCount }), 'success');
}

/* ============================================
 * 外字設定
 * ============================================ */

/** 外字設定モーダルを開く */
async function handleGaijiSettings() {
  const result = await showGaijiEditor(state.gaijiText);
  if (result !== null) {
    state.gaijiText = result;
    state.gaijiChars = parseGaijiText(result);
    saveGaijiToStorage();
    runValidation();
    showToast(UI_TEXT.TOAST.GAIJI_SAVED, 'success');
  }
}

/**
 * 外字テキストをSetに変換
 * @param {string} text - 1行1文字のテキスト
 * @returns {Set<string>}
 */
function parseGaijiText(text) {
  const chars = new Set();
  if (!text) return chars;
  text.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length === 1) {
      chars.add(trimmed);
    }
  });
  return chars;
}

/** localStorageに外字設定を保存 */
function saveGaijiToStorage() {
  try {
    const key = `gaiji_${state.inputSpec?.id || 'default'}`;
    localStorage.setItem(key, state.gaijiText);
  } catch (e) {
    console.warn('[app] 外字設定の保存に失敗:', e);
  }
}

/** localStorageから外字設定を読み込み */
function loadGaijiFromStorage() {
  try {
    const key = `gaiji_${state.inputSpec?.id || 'default'}`;
    const text = localStorage.getItem(key);
    if (text) {
      state.gaijiText = text;
      state.gaijiChars = parseGaijiText(text);
    }
  } catch (e) {
    console.warn('[app] 外字設定の読み込みに失敗:', e);
  }
}

/* ============================================
 * ステータスバー更新
 * ============================================ */

function updateStatusBar() {
  const data = state.tableEditor?.getData() || [];
  const rowCount = data.length;
  const errorCount = state.lastValidation?.errorCount || 0;
  const warningCount = state.lastValidation?.warningCount || 0;

  const statusRows = document.getElementById('status-rows');
  const statusErrors = document.getElementById('status-errors');
  const statusWarnings = document.getElementById('status-warnings');
  const statusModel = document.getElementById('status-model');
  const statusEncoding = document.getElementById('status-encoding');

  if (statusRows) statusRows.textContent = formatText(UI_TEXT.STATUS.ROWS, { count: rowCount });
  if (statusErrors) {
    statusErrors.textContent = formatText(UI_TEXT.STATUS.ERRORS, { count: errorCount });
    statusErrors.className = `statusbar__item ${errorCount > 0 ? 'statusbar__count--error' : 'statusbar__count--ok'}`;
  }
  if (statusWarnings) {
    statusWarnings.textContent = formatText(UI_TEXT.STATUS.WARNINGS, { count: warningCount });
    statusWarnings.className = `statusbar__item ${warningCount > 0 ? 'statusbar__count--warning' : ''}`;
  }
  if (statusModel) statusModel.textContent = formatText(UI_TEXT.STATUS.MODEL, { name: state.inputSpec?.name || '-' });
  if (statusEncoding) statusEncoding.textContent = formatText(UI_TEXT.STATUS.ENCODING, { enc: state.detectedEncoding || '-' });
}
