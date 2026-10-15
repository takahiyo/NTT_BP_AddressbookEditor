/** データ損失を伴う操作の回帰テスト。外部通信・DOM描画は行わない。 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import { getSpec } from './src/js/models/spec-registry.js';
import { parseCSVFile } from './src/js/services/csv-parser.js';
import { convertBetweenModels } from './src/js/services/model-converter.js';
import { padDataToCapacity } from './src/js/services/memory-service.js';
import { objectsToRows, buildCSVText } from './src/js/services/csv-exporter.js';
import { TableEditor } from './src/js/ui/table-editor.js';

// ソート後も選択した連絡先だけを削除し、検証結果の対応も維持する。
test('sorting keeps selection and validation attached to the contact', () => {
  const editor = new TableEditor(null, () => {});
  editor._render = () => {};
  editor._columns = [{ key: 'name', type: 'text' }];
  editor._data = [{ name: 'B' }, { name: 'A' }];
  const issue = { name: [{ severity: 'error' }] };
  editor._validationResults = [issue, {}];
  editor._selectedRows.add(0);
  editor._sortData('name');
  assert.equal(editor.getData()[editor.getSelectedRowIndices()[0]].name, 'B');
  assert.equal(editor._validationResults[1], issue);
  assert.equal(editor.getData()[1]._rowIndex, 1);
  editor._sortData('name');
  editor.deleteSelectedRows();
  assert.deepEqual(editor.getData().map(r => r.name), ['A']);
});

// 選択中の列数・ヘッダー有無によらず検出機種で解釈する。
test('import uses detected spec before validating columns and header', async () => {
  for (const [selected, detected] of [['a1', 'zx2l'], ['zx2l', 'a1'], ['zx2l', 'zxsmh']]) {
    const spec = getSpec(detected);
    const row = Array(spec.expectedColumns || spec.columns.length).fill('0');
    const lines = spec.hasHeader === false ? [row] : [spec.columns.map(c => c.label), row];
    const bytes = new TextEncoder().encode(lines.map(r => r.join(',')).join('\r\n'));
    const result = await parseCSVFile({ arrayBuffer: async () => bytes.buffer }, getSpec(selected));
    assert.equal(result.detectedSpecId, detected);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].length, spec.columns.length);
  }
  const bytes = new TextEncoder().encode('a,b,c');
  await assert.rejects(parseCSVFile({ arrayBuffer: async () => bytes.buffer }, getSpec('a1')));
});

// 既知の外線・PBXは往復で意味を保持し、対応不能な属性は警告する。
test('dial attributes convert by meaning', () => {
  for (const [smh, l] of [['1', '0'], ['2', '1']]) {
    const forward = convertBetweenModels([{ phone1: '0312345678', dialAttr1: smh }], getSpec('zxsmh'), getSpec('zx2l'));
    assert.equal(forward.data[0].dialAttr1, l);
    const reverse = convertBetweenModels(forward.data, getSpec('zx2l'), getSpec('zxsmh'));
    assert.equal(reverse.data[0].dialAttr1, smh);
  }
  const unsupported = convertBetweenModels([{ phone1: '1234', dialAttr1: '2' }], getSpec('zx2l'), getSpec('zxsmh'));
  assert.ok(unsupported.warnings.some(w => w.includes('発信属性')));
  const google = convertBetweenModels([{ firstName: 'Test', phone1Value: '0312345678' }], getSpec('google'), getSpec('zx2l'));
  assert.equal(google.data[0].dialAttr1, '0');
  const a1 = convertBetweenModels([{ phone1: '1234', dialAttr1: '2' }], getSpec('a1'), getSpec('zx2l'));
  assert.equal(a1.data[0].dialAttr1, '0');
  assert.ok(a1.warnings.some(w => w.includes('発信属性')));
  const original = [{ firstName: 'Test', phone1Value: '0312345678' }];
  const snapshot = structuredClone(original);
  convertBetweenModels(original, getSpec('google'), getSpec('a1'));
  assert.deepEqual(original, snapshot);
});

// 実際のhandleExportを読み込み、UIとダウンロードのみ代替して連続操作を検証する。
test('repeated export preserves Google editor data and identical CSV output', async () => {
  const source = readFileSync(new URL('./src/js/app.js', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?from ['"][^'"]+['"];\s*/gm, '');
  const downloads = [];
  const sandbox = {
    APP_CONFIG: { DEFAULT_DIGIT_MODE: '4digit' },
    UI_TEXT: { MODAL: { CONFIRM_PAD_CAPACITY: '' }, TOAST: { EXPORT_SUCCESS: '' } },
    createLogger: () => ({ info() {} }),
    document: { addEventListener() {} },
    convertBetweenModels, padDataToCapacity, objectsToRows, buildCSVText,
    formatText: s => s, confirmDialog: async () => true, showToast() {},
    generateFilename: () => 'test.csv', downloadCSV: text => downloads.push(text),
  };
  vm.createContext(sandbox);
  vm.runInContext(source + '\nthis.controller = { state, handleExport };', sandbox);
  const { state, handleExport } = sandbox.controller;
  const data = [{ firstName: 'Test', lastName: 'User', phone1Value: '0312345678', phone1Type: 'Work' }];
  const before = structuredClone(data);
  state.inputSpec = getSpec('google');
  state.outputSpec = getSpec('a1');
  state.tableEditor = { getData: () => data, setData: () => assert.fail('export replaced editor data') };
  await handleExport();
  await handleExport();
  assert.deepEqual(data, before);
  assert.equal(downloads.length, 2);
  assert.equal(downloads[0], downloads[1]);
  assert.ok(downloads[0].includes('User Test'));
  assert.ok(downloads[0].includes('0312345678'));
  // 同一機種の書出でも自動採番は入力側へ反映しない。
  const nativeData = [{ name: 'Native', memoryNo: '00123', phone1: '0312345678' }];
  state.inputSpec = state.outputSpec;
  state.tableEditor.getData = () => nativeData;
  await handleExport();
  assert.equal(nativeData[0].memoryNo, '00123');
  assert.equal(nativeData.length, 1);
});
