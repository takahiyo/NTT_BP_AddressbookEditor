# 開発・デバッグログ

## 2026-03-18 14:40
### 修正内容の要約
- 電話番号の分割展開ロジックの改善（多重 ::: 対応）
- 名前統合機能の空フィールド対応
- 半角変換時のひらがな→カタカナ変換

### 現在の課題
- Google CSVをD&Dした際に入力機種が自動で「Google連絡先」に切り替わらない
- GitHubの更新がユーザー側で確認できない

- [x] `detectSpecFromCSV` で Google のヘッダー（Given Name, Family Name 等）を検知できているか確認が必要。
  - 原因：列数（columnCount）が仕様に定義されていないため、ループ内でスキップされていた。
  - 対策：`headerSignature` による判別をループの最優先に移動した。
- [x] `app.js` の `loadFile` 内で `state.inputSpec` が更新された際に UI（セレクトボックス）が連動しているか確認。
  - 確認結果：`inputSelect.value = detectedSpec.id;` が実行されており、正常に連動するはず。
- [x] GitHubの同期確認
  - アクション：`git push` を再実行し、リモートの `dev` ブランチと完全に一致させている。
- [x] 電話番号が Phone 1 にまとまってしまう問題の根本解決
  - 原因：`row.phone1`（内部用）は更新されていたが、Google形式の表示に使われる `row.phone1Value` が未更新だったため、画面表示が変わっていなかった。
  - 対策：`model-converter.js` で `phoneXValue` も同時に更新するように修正。
