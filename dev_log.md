# 開発・デバッグログ (2026-03-18 15:00)

## 現在の課題
- 他機種（A1, ZXH等）を入力、Google連絡先を出力として選択した際、機種変換後のデータが空（またはGoogle固有フィールドに値が入らない）になる。

## 調査方針
- `model-converter.js` の `convertBetweenModels` において、`targetSpec.id === 'google'` の場合の処理を追加する。
- 内部モデルの `name` を `firstName` へ、`phoneX` を `phoneXValue` へマッピングする。
- Google出力時はインポート時と逆の変換が必要。
