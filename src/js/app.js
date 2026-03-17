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
  truncateField, deleteEmptyPhoneRows, normalizePhoneInconsistencies,
  normalizeIcons,
} from './services/converter.js';
import { convertBetweenModels } from './services/model-converter.js';
import { TableEditor } from './ui/table-editor.js';
import { initToolbar, updateToolbarState } from './ui/toolbar.js';
import { showToast, formatText } from './ui/toast.js';
import { confirmDialog, showGaijiEditor, showCityCodeModal, showFuriganaReviewModal } from './ui/modal.js';
import { autoAssignMemoryNos, padDataToCapacity } from './services/memory-service.js';
import { processAllPhoneNumbers } from './services/phone-processor.js';
import { processAllFurigana } from './services/furigana-processor.js';
import { createLogger, getLogText } from './utils/logger.js';



const log = createLogger('app');

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
  gaijiText: '',
  /** バリデーション結果 */


  lastValidation: null,
};

/* ============================================
 * 初期化
 * ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

/** アプリケーションの初期化 */
function initApp() {
  log.info('アプリケーション初期化を開始');
  initSpecs();
  initToolbarUI();
  initTableEditor();
  initTheme();

  /* ファイル関係のイベント登録 */
  initDragDrop();
  initFileInput();
  loadGaijiFromStorage();
  updateStatusBar();



  /* デバッグ用: グローバルにログテキスト取得関数を公開 */
  window.__getAppLog = getLogText;

  log.info('アプリケーション初期化を完了', { spec: state.inputSpec?.id });
}

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
  log.debug('機種仕様を設定', { input: state.inputSpec?.id, output: state.outputSpec?.id });

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
    log.info('入力機種を変更', { specId: state.inputSpec?.id });
    
    // 現在のデータをクリア（カラム構造が変わるため）
    // ※今後、データ変換処理を挟む場合は別途検討
    state.tableEditor.setSpec(state.inputSpec);
    state.tableEditor.setData([]);
    updateToolbarState(state.toolbarButtons, false);
    
    runValidation();
    updateStatusBar();
  });

  outputSelect.addEventListener('change', async () => {
    const newSpec = getSpec(outputSelect.value);

    /* --- 1. 出力機種に合わせてデータを変換（レイアウト変更） --- */
    const currentData = state.tableEditor.getData();
    let convertedData = currentData;
    if (state.inputSpec.id !== newSpec.id && currentData.length > 0) {
      const result = convertBetweenModels(currentData, state.inputSpec, newSpec);
      convertedData = result.data;
      result.warnings.forEach(w => showToast(w, 'info'));
    }

    /* --- 2. 特定機種向けパディング処理（変換後のレイアウトに基づく） --- */
    if (newSpec.id === 'a1' || newSpec.id === 'zxl') {
      const targetCount = newSpec.id === 'a1' ? 20000 : 19800;
      const currentCount = convertedData.length;

      if (currentCount > 0 && currentCount < targetCount) {
        const msg = formatText(UI_TEXT.MODAL.CONFIRM_PAD_CAPACITY, { 
          name: newSpec.name, 
          target: targetCount, 
          current: currentCount 
        });
        const ok = await confirmDialog(msg);

        if (ok) {
          log.info(`${newSpec.name}データパディングを実行`, { current: currentCount, target: targetCount });
          /* デフォルト桁数モードを取得してパディング */
          const defaultDigitMode = newSpec.digitModes ? Object.keys(newSpec.digitModes)[0] : APP_CONFIG.DEFAULT_DIGIT_MODE;
          convertedData = padDataToCapacity(convertedData, targetCount, newSpec, defaultDigitMode);
        } else {
          /* キャンセルされたら元の選択に戻す */
          outputSelect.value = state.outputSpec?.id || state.inputSpec.id;
          return;
        }
      }
    }

    /* --- 3. 新しい機種を「入力機種 兼 出力機種」として画面再構築 --- */
    state.inputSpec = newSpec;
    state.outputSpec = newSpec;
    
    inputSelect.value = newSpec.id;
    updateDigitModeSelect(newSpec);

    log.info('出力機種を変更（画面を再構築）', { specId: newSpec.id });
    
    state.tableEditor.setSpec(newSpec);
    state.tableEditor.setMappingSpec(newSpec); /* 同じ機種をセットすることで2段ヘッダーを消す */
    state.tableEditor.setData(convertedData);

    updateToolbarState(state.toolbarButtons, convertedData.length > 0);
    runValidation();
    updateStatusBar();
  });

  digitSelect.addEventListener('change', () => {
    state.digitMode = digitSelect.value;
    log.info('桁数モードを変更', { mode: state.digitMode });
  });
}

/** 桁数モードセレクトボックスを再構築する */
function updateDigitModeSelect(spec) {
  const digitSelect = document.getElementById('digit-mode-select');
  digitSelect.innerHTML = ''; // クリア

  if (!spec || !spec.digitModes) return;

  const modes = Object.keys(spec.digitModes);
  modes.forEach(key => {
    const mode = spec.digitModes[key];
    digitSelect.add(new Option(mode.label, key));
  });

  /* 以前の選択値があればそれを、なければデフォルト、それもなければ最初のものを選択 */
  if (modes.includes(state.digitMode)) {
    digitSelect.value = state.digitMode;
  } else if (modes.includes(APP_CONFIG.DEFAULT_DIGIT_MODE)) {
    digitSelect.value = APP_CONFIG.DEFAULT_DIGIT_MODE;
    state.digitMode = APP_CONFIG.DEFAULT_DIGIT_MODE;
  } else if (modes.length > 0) {
    digitSelect.value = modes[0];
    state.digitMode = modes[0];
  }
}


/** テーブルエディタの初期化 */
function initTableEditor() {
  const container = document.getElementById('table-container');
  state.tableEditor = new TableEditor(container, onCellChange);
  state.tableEditor.setSpec(state.inputSpec);
  state.tableEditor.setMappingSpec(state.outputSpec);
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
    onAutoMemory: handleAutoMemory,
    onPhoneProcess: handlePhoneProcess,
    onFurigana: handleFurigana,
    onNormalizeIcons: handleNormalizeIcons,
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
 * 機種自動判別 → 必要に応じて入力機種を切替 → データ表示
 * @param {File} file - CSVファイル
 */
async function loadFile(file) {
  log.info('ファイル読み込み開始', { name: file.name, size: file.size });
  try {
    /* 初回パース（自動判別を含む） */
    let result = await parseCSVFile(file, state.inputSpec);
    let activeSpec = state.inputSpec;

    /* 機種自動判別: 検出された機種が現在と異なれば切替 */
    if (result.detectedSpecId && result.detectedSpecId !== state.inputSpec.id) {
      const detectedSpec = getSpec(result.detectedSpecId);
      if (detectedSpec) {
        log.info('機種を自動判別して切替', { from: state.inputSpec.id, to: detectedSpec.id });

        /* 入力機種を切替 */
        state.inputSpec = detectedSpec;
        activeSpec = detectedSpec;

        /* UIセレクターを同期 */
        const inputSelect = document.getElementById('input-model-select');
        if (inputSelect) inputSelect.value = detectedSpec.id;

        /* テーブルのカラム定義を更新 */
        state.tableEditor.setSpec(detectedSpec);

        /* 正しい機種仕様で再パース */
        result = await parseCSVFile(file, detectedSpec);

        showToast(formatText(UI_TEXT.TOAST.AUTO_DETECT_SWITCHED, { name: detectedSpec.name }), 'info');
      }
    }

    const { header, rows, encoding } = result;
    state.csvHeader = header;
    state.detectedEncoding = encoding;

    /* カラム定義に基づいてデータをマッピング */
    let data = mapRowsToObjects(rows, activeSpec.columns);

    /* 電話番号とアイコン・属性の不整合をチェック */
    const { data: normalizedData, changedCount } = normalizePhoneInconsistencies(data, activeSpec);
    if (changedCount > 0) {
      const ok = await confirmDialog(formatText(UI_TEXT.MODAL.CONFIRM_NORMALIZE_PHONE, { count: changedCount }));
      if (ok) {
        data = normalizedData;
        log.info('インポート時に不整合を補正', { count: changedCount });
      }
    }

    state.tableEditor.setData(data);
    updateToolbarState(state.toolbarButtons, true);
    runValidation();
    updateStatusBar();

    log.info('ファイル読み込み完了', { rows: data.length, encoding, columns: header.length });
    showToast(formatText(UI_TEXT.TOAST.IMPORT_SUCCESS, { count: data.length }), 'success');
  } catch (err) {
    log.error('CSV読込エラー', { error: err.message, stack: err.stack });
    showToast(formatText(UI_TEXT.TOAST.IMPORT_ERROR, { message: err.message }), 'error');
  }
}

/**
 * 書出前の機種固有エラー警告チェック
 * @param {Array<Object>} exportData - 出力用データ
 * @param {Object} exportSpec - 出力機種仕様
 * @returns {Promise<boolean>} 処理を続行する場合はtrue
 */
async function checkExportWarnings(exportData, exportSpec) {
  if (!exportSpec.exportWarnings || exportSpec.exportWarnings.length === 0) return true;

  for (const warning of exportSpec.exportWarnings) {
    let hasIssue = false;
    
    /* 警告タイプごとの判定ロジック */
    if (warning.type === 'emptyPhoneRows') {
      hasIssue = exportData.some(row => {
        let isEmpty = true;
        for (let i = 1; i <= exportSpec.phoneNumberSlots; i++) {
          const val = row[`phone${i}`];
          if (val && val.trim().length > 0) {
            isEmpty = false;
            break;
          }
        }
        return isEmpty;
      });
    }

    if (hasIssue) {
      const msgTemplate = UI_TEXT.MODAL[warning.messageKey] || warning.messageKey;
      const msg = formatText(msgTemplate, { modelName: exportSpec.name });
      const ok = await confirmDialog(msg);
      if (!ok) return false;
    }
  }
  return true;
}

/** CSV書出ボタンのハンドラ */
async function handleExport() {
  const data = state.tableEditor.getData();
  if (!data || data.length === 0) {
    showToast(UI_TEXT.TOAST.NO_DATA, 'error');
    return;
  }

  log.info('CSV書出開始', { rows: data.length });

  /* 出力機種のカラム構成でCSVを生成 */
  let exportData = data;
  let exportSpec = state.outputSpec;

  /* 入力機種と出力機種が異なる場合は変換 */
  if (state.inputSpec.id !== state.outputSpec.id) {
    const result = convertBetweenModels(data, state.inputSpec, state.outputSpec);
    exportData = result.data;
    result.warnings.forEach(w => showToast(w, 'info'));
  }

  /* 行数不足のチェック（A1: 20000, ZX-L: 19800） */
  if (exportSpec.id === 'a1' || exportSpec.id === 'zxl') {
    const targetCount = exportSpec.id === 'a1' ? 20000 : 19800;
    if (exportData.length < targetCount) {
      const msg = formatText(UI_TEXT.MODAL.CONFIRM_PAD_CAPACITY, { 
        name: exportSpec.name, 
        target: targetCount, 
        current: exportData.length 
      });
      const ok = await confirmDialog(msg);
      if (ok) {
        log.info(`${exportSpec.name}エクスポート前にパディングを実行`, { target: targetCount });
        const defaultDigitMode = exportSpec.digitModes ? Object.keys(exportSpec.digitModes)[0] : APP_CONFIG.DEFAULT_DIGIT_MODE;
        exportData = padDataToCapacity(exportData, targetCount, exportSpec, defaultDigitMode);
        /* アプリの状態も更新しておく（次回のために） */
        state.tableEditor.setData(exportData);
      } else {
        log.info('パディングがキャンセルされたためエクスポートを中止');
        return;
      }
    }
  }

  /* 書出前の機種固有警告チェック */
  const canExport = await checkExportWarnings(exportData, exportSpec);
  if (!canExport) {
    log.info('CSV書出キャンセル', { reason: 'export warning rejected' });
    return;
  }

  /* ヘッダー行を生成 */
  const header = exportSpec.columns.map(col => col.label);
  const rows = objectsToRows(exportData, exportSpec.columns, exportSpec);
  const csvText = buildCSVText(header, rows, ',', exportSpec);

  /* ダウンロード */
  const filename = generateFilename(exportSpec.name);
  downloadCSV(csvText, exportSpec.encoding, filename);

  log.info('CSV書出完了', { filename, encoding: exportSpec.encoding });
  showToast(UI_TEXT.TOAST.EXPORT_SUCCESS, 'success');
}

/* ============================================
 * 行操作ハンドラ
 * ============================================ */

function handleAddRow() {
  state.tableEditor.addRow();
  log.debug('行を追加');
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
    log.info('行を削除', { count: selected.length });
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
  log.info('バリデーション完了', { errors: v.errorCount, warnings: v.warningCount });
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

/** 半角変換：選択された列を半角に */
function handleToHalf() {
  const selectedCols = state.tableEditor.getSelectedColumns();
  if (selectedCols.length === 0) {
    showToast('変換対象の列を選択してください（ヘッダーのチェックボックス）', 'info');
    return;
  }

  const data = state.tableEditor.getData();
  let count = 0;
  const newData = data.map(row => {
    const newRow = { ...row };
    selectedCols.forEach(colKey => {
      const oldVal = row[colKey] || '';
      const newVal = toHalfWidth(oldVal);
      if (oldVal !== newVal) count++;
      newRow[colKey] = newVal;
    });
    return newRow;
  });

  state.tableEditor.updateData(newData);
  runValidation();
  log.info('半角変換完了', { columns: selectedCols, changed: count });
  showToast(formatText(UI_TEXT.TOAST.CONVERT_COMPLETE, { count }), 'success');
}

/** 全角変換：選択された列を全角に */
function handleToFull() {
  const selectedCols = state.tableEditor.getSelectedColumns();
  if (selectedCols.length === 0) {
    showToast('変換対象の列を選択してください（ヘッダーのチェックボックス）', 'info');
    return;
  }

  const data = state.tableEditor.getData();
  let count = 0;
  const newData = data.map(row => {
    const newRow = { ...row };
    selectedCols.forEach(colKey => {
      const oldVal = row[colKey] || '';
      const newVal = toFullWidth(oldVal);
      if (oldVal !== newVal) count++;
      newRow[colKey] = newVal;
    });
    return newRow;
  });

  state.tableEditor.updateData(newData);
  runValidation();
  log.info('全角変換完了', { columns: selectedCols, changed: count });
  showToast(formatText(UI_TEXT.TOAST.CONVERT_COMPLETE, { count }), 'success');
}

/** 記号削除：選択された列から記号を削除 */
function handleRemoveSymbols() {
  const selectedCols = state.tableEditor.getSelectedColumns();
  if (selectedCols.length === 0) {
    showToast('変換対象の列を選択してください（ヘッダーのチェックボックス）', 'info');
    return;
  }

  const data = state.tableEditor.getData();
  let count = 0;
  const newData = data.map(row => {
    const newRow = { ...row };
    selectedCols.forEach(colKey => {
      const oldVal = row[colKey] || '';
      const newVal = removeSymbols(oldVal);
      if (oldVal !== newVal) count++;
      newRow[colKey] = newVal;
    });
    return newRow;
  });

  state.tableEditor.updateData(newData);
  runValidation();
  log.info('記号削除完了', { columns: selectedCols, changed: count });
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
  log.info('超過カット完了', { count: totalCount });
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
  log.info('空行削除完了', { deleted: result.deletedCount });
  showToast(formatText(UI_TEXT.TOAST.EMPTY_ROWS_DELETED, { count: result.deletedCount }), 'success');
}

/** メモリ番号自動採番 */
function handleAutoMemory() {
  const data = state.tableEditor.getData();
  if (!data || data.length === 0) return;

  const result = autoAssignMemoryNos(data, state.inputSpec, state.digitMode);
  if (result.assignedCount === 0) {
    showToast('採番が必要な行はありません', 'info');
    return;
  }

  state.tableEditor.updateData(result.data);
  runValidation();
  log.info('メモリ番号採番完了', { assigned: result.assignedCount });
  showToast(`メモリ番号を ${result.assignedCount} 件 採番しました`, 'success');
}

/** 電話番号加工（AB-J変換） */
async function handlePhoneProcess() {
  const data = state.tableEditor.getData();
  if (!data || data.length === 0) return;

  const cityCode = await showCityCodeModal();
  if (cityCode === null) return;

  log.info('電話番号加工を開始', { cityCode });
  const result = processAllPhoneNumbers(data, state.inputSpec.phoneNumberSlots, cityCode);
  
  state.tableEditor.updateData(result.data);
  runValidation();
  
  log.info('電話番号加工を完了', { processed: result.processedCount, errors: result.errorCount });
  if (result.errorCount > 0) {
    showToast(`加工完了（${result.processedCount}件）。桁数が異常な番号が ${result.errorCount} 件あります`, 'warning');
  } else {
    showToast(`加工完了（${result.processedCount}件）`, 'success');
  }
}

/** フリガナ生成 */
async function handleFurigana() {
  const data = state.tableEditor.getData();
  if (!data || data.length === 0) return;

  log.info('フリガナ生成を開始', { rows: data.length });
  showToast(UI_TEXT.TOOLBAR.GENERATE_FURIGANA + '中...', 'info');

  const results = await processAllFurigana(data, state.inputSpec);
  if (results.length === 0) {
    showToast('生成可能なフリガナはありません', 'info');
    return;
  }

  log.info('フリガナ生成完了、レビューモーダルを表示', { candidates: results.length });
  const selectedResults = await showFuriganaReviewModal(results);
  if (!selectedResults || selectedResults.length === 0) {
    log.info('フリガナ反映をキャンセル');
    return;
  }

  const newData = [...data];
  selectedResults.forEach(item => {
    newData[item.index] = {
      ...newData[item.index],
      [item.fieldKey]: item.generated
    };
  });

  state.tableEditor.updateData(newData);
  runValidation();
  log.info('フリガナ反映完了', { applied: selectedResults.length });
  showToast(formatText(UI_TEXT.TOAST.CONVERT_COMPLETE, { count: selectedResults.length }), 'success');
}

/** アイコン番号の正規化 */
function handleNormalizeIcons() {
  const data = state.tableEditor.getData();
  if (!data || data.length === 0) return;

  log.info('アイコン番号の正規化を開始');
  const result = normalizeIcons(data, state.inputSpec);

  if (result.normalizedCount === 0) {
    showToast('正規化が必要なアイコン番号はありません', 'info');
    return;
  }

  state.tableEditor.updateData(result.data);
  runValidation();
  log.info('アイコン番号の正規化を完了', { normalized: result.normalizedCount });
  showToast(formatText(UI_TEXT.TOAST.NORMALIZE_SUCCESS, { count: result.normalizedCount }), 'success');
}

/* ============================================
 * テーマ（ダーク/ライトモード）
 * ============================================ */
function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
  }

  toggle?.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });
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
    log.info('外字設定を更新', { charCount: state.gaijiChars.size });
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
    log.warn('外字設定の保存に失敗', { error: e.message });
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
      log.debug('外字設定を読み込み', { charCount: state.gaijiChars.size });
    }
  } catch (e) {
    log.warn('外字設定の読み込みに失敗', { error: e.message });
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
