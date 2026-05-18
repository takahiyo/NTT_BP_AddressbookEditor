// test_api.js
// CSV ファイルの内容を読み込んで出力する

import fs from 'fs';
import path from 'path';

function readCSV(filename) {
  const filePath = path.resolve(filename);
  if (!fs.existsSync(filePath)) {
    console.log(`${filename} が存在しません`);
    return;
  }
  
  console.log(`=== ${filename} の内容 ===`);
  const buffer = fs.readFileSync(filePath);
  // 文字コードが Shift_JIS か UTF-8 かわからないので、両方の可能性で出力してみる
  console.log("--- UTF-8 としてみた場合 ---");
  console.log(buffer.toString('utf8').substring(0, 1000));
  console.log("----------------------------");
}

readCSV('test_addressbook.csv');
readCSV('電話帳テスト_ZX2SM.csv');
readCSV('電話帳テスト_ZXH.csv');
