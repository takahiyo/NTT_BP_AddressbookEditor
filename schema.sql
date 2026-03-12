/**
 * Cloudflare D1 データベース初期化 SQL
 * 
 * 実行方法:
 * npx wrangler d1 execute <DATABASE_NAME> --file=./schema.sql
 */

DROP TABLE IF EXISTS dictionary;
CREATE TABLE dictionary (
  surface TEXT PRIMARY KEY, -- 漢字
  reading TEXT NOT NULL      -- フリガナ（全角または半角カタカナ）
);

-- インデックス作成（検索高速化のため）
CREATE INDEX idx_surface ON dictionary(surface);
