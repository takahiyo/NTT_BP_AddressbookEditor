// verify_furigana.mjs
// フリガナ生成と API エラーハンドリングの検証

// 1. 動的インポートの前に localStorage をグローバルに定義して ReferenceError を防止
globalThis.localStorage = {
  getItem: (key) => null,
  setItem: (key, val) => {},
};

import assert from 'assert';

async function runTests() {
  console.log('=== フリガナ生成＆エラーハンドリング検証テスト ===');

  // 動的インポートにより、localStorage の定義が完了した後にモジュールを読み込ませる
  const { APP_CONFIG } = await import('./src/js/constants/app-config.js');
  const { processAllFurigana } = await import('./src/js/services/furigana-processor.js');
  const { ZXSMH_SPEC } = await import('./src/js/models/specs/zxsmh.js');

  // 検証 1: 設定ファイルの SSOT 化確認
  console.log('検証 1: app-config.js に API URL が定義されているか');
  assert.ok(APP_CONFIG.FURIGANA_API, 'APP_CONFIG.FURIGANA_API が定義されていません');
  assert.strictEqual(
    APP_CONFIG.FURIGANA_API.URL,
    'https://furigana-api.taka-hiyo.workers.dev/api/furigana',
    'API URL が期待される値と異なります'
  );
  console.log('-> OK (URL: ' + APP_CONFIG.FURIGANA_API.URL + ')');

  // 検証 2: API 正常系および同一行（isSame / memoryNo）の検証
  console.log('\n検証 2: 正常な API URL で漢字フリガナが取得でき、同一行やメタデータが正しく取得できるか');
  const mockData = [
    { memoryNo: '000', name: '山田太郎', furigana: '' },
    { memoryNo: '001', name: '佐藤花子', furigana: '' },
    { memoryNo: '002', name: 'ひらがな', furigana: '' },      // ひらがなのみ（API を叩かないフォールバック）
    { memoryNo: '003', name: 'Taro', furigana: '' },          // 英字のみ（API を叩かないフォールバック）
    { memoryNo: '004', name: '鈴木一郎', furigana: 'ｽｽﾞｷｲﾁﾛｳ' } // 既に同じフリガナが入っている行（同一判定）
  ];

  try {
    const results = await processAllFurigana(mockData, ZXSMH_SPEC);
    console.log('生成された結果の件数:', results.length);
    console.log('生成結果詳細:', JSON.stringify(results, null, 2));

    // 検証 2-1: 件数が5件すべて含まれていること
    assert.strictEqual(results.length, 5, '生成結果の件数がモック件数と異なります（同一行が除外された可能性があります）');

    // 山田太郎（新規生成・差分あり）の検証
    const yamada = results.find(r => r.name === '山田太郎');
    assert.ok(yamada, '山田太郎のフリガナが生成されていません');
    assert.strictEqual(yamada.generated, 'ﾔﾏﾀﾞﾀﾛｳ', '山田太郎のフリガナが異なります');
    assert.strictEqual(yamada.isSame, false, '山田太郎の isSame が正しくありません');
    assert.strictEqual(yamada.memoryNo, '000', '山田太郎の memoryNo が正しくありません');

    // 佐藤花子（新規生成・差分あり）の検証
    const sato = results.find(r => r.name === '佐藤花子' && r.current === '');
    assert.ok(sato, '佐藤花子のフリガナが生成されていません');
    assert.strictEqual(sato.generated, 'ｻﾄｳﾊﾅｺ', '佐藤花子のフリガナが異なります');
    assert.strictEqual(sato.isSame, false, '佐藤花子の isSame が正しくありません');
    assert.strictEqual(sato.memoryNo, '001', '佐藤花子の memoryNo が正しくありません');

    // ひらがなのフォールバックの検証
    const hiragana = results.find(r => r.name === 'ひらがな');
    assert.ok(hiragana, 'ひらがなのフリガナが生成されていません');
    assert.strictEqual(hiragana.generated, 'ﾋﾗｶﾞﾅ', 'ひらがnanoフリガナが異なります');
    assert.strictEqual(hiragana.isSame, false, 'ひらがなの isSame が正しくありません');
    assert.strictEqual(hiragana.memoryNo, '002', 'ひらがなの memoryNo が正しくありません');

    // 鈴木一郎（完全同一・変更なし）の検証
    const suzuki = results.find(r => r.name === '鈴木一郎');
    assert.ok(suzuki, '鈴木一郎が結果から除外されています');
    assert.strictEqual(suzuki.isSame, true, '鈴木一郎の isSame が true になっていません');
    assert.strictEqual(suzuki.memoryNo, '004', '鈴木一郎の memoryNo が正しくありません');

    console.log('-> OK (全フリガナ、同一行判定、メタデータが期待通り取得できました！)');
  } catch (err) {
    console.error('検証 2 失敗:', err.message);
    process.exit(1);
  }

  // 検証 3: API エラー発生時の例外スロー検証
  console.log('\n検証 3: 無効な URL を設定したとき、例外がサイレントに握りつぶされずにスローされるか');
  
  // URL を意図的に無効なものに書き換える
  APP_CONFIG.FURIGANA_API.URL = 'https://invalid-furigana-domain-test.dev/api';

  const mockDataWithKanji = [
    { memoryNo: '000', name: '山田太郎', furigana: '' }
  ];

  let errorThrown = false;
  try {
    await processAllFurigana(mockDataWithKanji, ZXSMH_SPEC);
  } catch (err) {
    errorThrown = true;
    console.log('キャッチした例外メッセージ:', err.message);
    assert.ok(err.message.includes('フリガナAPI接続エラー'), 'エラーメッセージに期待するキーワードが含まれていません');
  }

  assert.ok(errorThrown, 'APIが失敗したにもかかわらず例外がスローされませんでした');
  console.log('-> OK (期待通り「フリガナAPI接続エラー」の例外が正しくスローされました！)');

  console.log('\n=============================================');
  console.log('🎉 すべてのフリガナ検証テストに合格しました！ 🎉');
  console.log('=============================================');
}

runTests();
