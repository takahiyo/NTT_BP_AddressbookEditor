# デバッグログ：ドロップダウンメニューの表示順序修正

## 状況
- ツールバーのドロップダウンメニューが、テーブルの下に潜り込んでしまい、一部または全部が見えなくなっている。

## 調査工程
1. [x] `layout.css` および `table.css` の `z-index` 設定を確認する。
   - `.table-container` が `backdrop-filter` を持っており、スタックコンテキストを形成している。
   - `thead` は `z-index: 10`。
2. [x] `.toolbar` の `overflow` プロパティが `hidden` になっていないか確認する。
   - `.toolbar` 自体には `overflow: hidden` はないが、`.app-main` にはある。しかしドロップダウンは `.app-main` 内に収まるはず。
3. [x] 親要素（`.app-main` 等）の重なり順を確認する。
   - `.toolbar` と `.table-container` は兄弟要素であり、`.table-container` が後にあるため、デフォルトでは後者が前面。

## 対応案
- [x] `.toolbar` に `position: relative` と、`.table-container` より高い `z-index` を設定する。
- ツールバーまたはドロップダウンメニューの `z-index` を十分に大きく設定する。
- ツールバーの `overflow: hidden` があれば解除する。


## テスト結果
- [x] `.toolbar` に `z-index: 20` を設定。
- [x] ドロップダウンメニューが表（`thead` の `z-index: 10` を含む）より前面に表示されることを確認。
