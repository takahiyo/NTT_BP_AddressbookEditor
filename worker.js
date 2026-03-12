/**
 * Cloudflare Worker: GitHub-D1 連携フリガナAPI
 * 
 * 1. GET /sync : GitHub から辞書を取得して D1 に同期
 * 2. POST /api/furigana : 名称を受け取り D1 を検索してフリガナを返却
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- 1. 同期エンドポイント (GitHub -> D1) ---
    if (url.pathname === "/sync") {
      try {
        // GitHub の Raw URL（適宜書き換えてください）
        const GITHUB_DICT_URL = "https://raw.githubusercontent.com/ユーザー名/リポジトリ名/main/master_dict.json";
        
        const resp = await fetch(GITHUB_DICT_URL);
        if (!resp.ok) throw new Error("GitHub からの取得に失敗しました");
        
        const dict = await resp.json();
        
        // D1 へデータを投入 (UPSERT)
        const statements = Object.entries(dict).map(([surface, reading]) => {
          return env.DB.prepare("INSERT INTO dictionary (surface, reading) VALUES (?, ?) ON CONFLICT(surface) DO UPDATE SET reading = EXCLUDED.reading")
            .bind(surface, reading);
        });

        await env.DB.batch(statements);
        
        return new Response(JSON.stringify({ success: true, count: Object.keys(dict).length }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // --- 2. フリガナ検索 API ---
    if (url.pathname === "/api/furigana" && request.method === "POST") {
      try {
        const { names } = await request.json(); // ['中村', '佐藤', ...] の配列を期待
        if (!Array.isArray(names)) throw new Error("names must be an array");

        const results = {};
        
        // 並列で D1 を検索
        const tasks = names.map(async (name) => {
          // 最長一致や分解マッチングは Worker 側でやると効率的
          // ここでは単純な完全一致検索の例
          const row = await env.DB.prepare("SELECT reading FROM dictionary WHERE surface = ?")
            .bind(name).first();
          if (row) {
            results[name] = row.reading;
          }
        });

        await Promise.all(tasks);

        return new Response(JSON.stringify({ readings: results }), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" // CORS許可
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
