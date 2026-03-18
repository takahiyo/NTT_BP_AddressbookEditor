import { defineSpec } from '../base-fields.js';

/**
 * Google連絡先 CSV機種仕様定義
 * インポート専用（エクスポートは非対応）
 */

const items = [
  { key: 'firstName', label: 'First Name', type: 'text' },
  { key: 'middleName', label: 'Middle Name', type: 'text' },
  { key: 'lastName', label: 'Last Name', type: 'text' },
  { key: 'phoneticFirstName', label: 'Phonetic First Name', type: 'text' },
  { key: 'phoneticMiddleName', label: 'Phonetic Middle Name', type: 'text' },
  { key: 'phoneticLastName', label: 'Phonetic Last Name', type: 'text' },
  { key: 'phone1Value', label: 'Phone 1 - Value', type: 'phone' },
  { key: 'phone1Type', label: 'Phone 1 - Type', type: 'text' },
  { key: 'phone2Value', label: 'Phone 2 - Value', type: 'phone' },
  { key: 'phone2Type', label: 'Phone 2 - Type', type: 'text' },
  { key: 'phone3Value', label: 'Phone 3 - Value', type: 'phone' },
  { key: 'phone3Type', label: 'Phone 3 - Type', type: 'text' },
  { key: 'phone4Value', label: 'Phone 4 - Value', type: 'phone' },
  { key: 'phone4Type', label: 'Phone 4 - Type', type: 'text' },
];

export const GOOGLE_SPEC = defineSpec({
  id: 'google',
  name: 'Google連絡先',
  family: 'google',
  encoding: 'UTF-8',
  inputEncodings: ['UTF-8', 'UTF-16'],
  phoneNumberSlots: 4,
  hasHeader: true,
  isImportOnly: true, // インポート専用フラグ
  headerSignature: 'First Name', // 判別用シグネチャ
  
  /* 日本語環境用の別名マッピング */
  headerAliases: {
    '名': 'firstName',
    '姓': 'lastName',
    '名（フリガナ）': 'phoneticFirstName',
    '姓（フリガナ）': 'phoneticLastName',
    '電話 1 - 値': 'phone1Value',
    '電話 1 - 種別': 'phone1Type',
    '電話 2 - 値': 'phone2Value',
    '電話 2 - 種別': 'phone2Type',
    '電話 3 - 値': 'phone3Value',
    '電話 3 - 種別': 'phone3Type',
    '電話 4 - 値': 'phone4Value',
    '電話 4 - 種別': 'phone4Type',
  }
}, items);
