// encoding-japanese がグローバルにある前提だが、Node環境で試す場合は
// require('encoding-japanese') が必要。
// ただし、OSには入っていない可能性が高いので、
// 代わりに文字列表現で推測する。

const halfKanas = "ｱｲｳｴｵ";
console.log('Half-width kana string length:', halfKanas.length);
// JavaScript の Unicode 文字列では半角カナは1文字。
// Shift_JISに変換されたとき、1バイトになるべき。
