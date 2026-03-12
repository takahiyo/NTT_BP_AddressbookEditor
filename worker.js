/**
 * Cloudflare Worker: Yahoo! ルビ振りAPI v2 プロキシ
 *
 * フロントエンドからの漢字名称を受け取り、
 * Yahoo! ルビ振りAPI を叩いてカタカナ読みを返す。
 * APIキーをフロントに露出させないためのプロキシとして機能する。
 */

const YAHOO_API_URL = "https://jlp.yahooapis.jp/FuriganaService/V2/furigana";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    // CORS: プリフライトリクエスト対応
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(origin),
      });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "POST のみ対応しています" }, 405, origin);
    }

    try {
      const { names } = await request.json(); // 例: ["中村", "佐藤", "株式会社テスト"]
      if (!Array.isArray(names) || names.length === 0) {
        return jsonResponse({ error: "names は空でない配列で指定してください" }, 400, origin);
      }

      // Yahoo! API キーは Cloudflare の環境変数（シークレット）から取得
      const appId = env.YAHOO_APP_ID;
      if (!appId) {
        return jsonResponse({ error: "YAHOO_APP_ID が設定されていません" }, 500, origin);
      }


      // 各名称を Yahoo! API に問い合わせ
      const readings = {};
      const tasks = names.map(async (name) => {
        try {
          const reading = await fetchYahooFurigana(name, appId);
          if (reading) {
            readings[name] = reading;
          }
        } catch (err) {
          // 個別のエラーは無視して続行（部分的な成功を許容）
          console.error(`Yahoo! API エラー: ${name}`, err.message);
        }
      });

      await Promise.all(tasks);

      return jsonResponse({ readings }, 200, origin);
    } catch (err) {
      return jsonResponse({ error: err.message }, 500, origin);
    }
  },
};

/**
 * Yahoo! ルビ振りAPI v2 を呼び出し、カタカナ読みを返す
 * @param {string} text - 変換対象の文字列
 * @param {string} appId - Yahoo! JAPAN アプリケーション ID
 * @returns {Promise<string>} カタカナ読み
 */
async function fetchYahooFurigana(text, appId) {
  const body = {
    id: "furigana-proxy",
    jsonrpc: "2.0",
    method: "jlp.furiganaservice.furigana",
    params: { q: text },
  };

  const resp = await fetch(YAHOO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Yahoo AppID: " + appId,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`Yahoo API HTTP ${resp.status}`);
  }

  const data = await resp.json();

  // エラーレスポンスのチェック
  if (data.error) {
    throw new Error(`Yahoo API: ${data.error.message}`);
  }

  // word 配列からカタカナ読みを組み立てる
  const words = data.result?.word || [];
  let katakana = "";
  for (const w of words) {
    if (w.furigana) {
      // ひらがな → カタカナ変換
      katakana += hiraganaToKatakana(w.furigana);
    } else {
      // ふりがなが無い場合（記号・カタカナ等）はそのまま
      katakana += w.surface || "";
    }
  }

  return katakana;
}

/** ひらがな → カタカナ変換 */
function hiraganaToKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

/** CORS ヘッダー */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

/** JSON レスポンスヘルパー */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

