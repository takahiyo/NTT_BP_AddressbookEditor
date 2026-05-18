// test_api.js
// Cloudflare Worker API の動作テスト

async function test() {
  try {
    console.log("API 呼び出し中...");
    const response = await fetch("https://furigana-api.taka-hiyo.workers.dev/api/furigana", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: ["山田", "佐藤", "鈴木太郎", "テスト"] })
    });
    console.log("ステータスコード:", response.status);
    const data = await response.json();
    console.log("レスポンスデータ:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("エラー発生:", err);
  }
}

test();
