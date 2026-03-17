/**
 * フリガナ・マッピング・サービス
 * カスタマイズされたフリガナ対応表（辞書）の管理を行う
 */

import { createLogger } from '../utils/logger.js';

const log = createLogger('furigana-mapping');

const STORAGE_KEYS = {
  MASTER_ENABLED: 'furigana_mapping_master_enabled',
  MAPPINGS: 'furigana_mappings'
};

class FuriganaMappingService {
  constructor() {
    this.mappings = this._loadMappings();
    this.masterEnabled = this._loadMasterEnabled();
  }

  /**
   * マッピングデータをストレージから読み込む
   */
  _loadMappings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MAPPINGS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      log.error('Failed to load furigana mappings', e);
      return [];
    }
  }

  /**
   * マスターの有効/無効設定を読み込む
   */
  _loadMasterEnabled() {
    const stored = localStorage.getItem(STORAGE_KEYS.MASTER_ENABLED);
    return stored === null ? true : stored === 'true';
  }

  /**
   * 全マッピングを取得
   */
  getMappings() {
    return this.mappings;
  }

  /**
   * マスターの有効/無効を取得
   */
  isMasterEnabled() {
    return this.masterEnabled;
  }

  /**
   * マスターの有効/無効を切り替え
   */
  setMasterEnabled(enabled) {
    this.masterEnabled = !!enabled;
    localStorage.setItem(STORAGE_KEYS.MASTER_ENABLED, this.masterEnabled.toString());
  }

  /**
   * マッピングを保存
   */
  saveMappings(mappings) {
    this.mappings = mappings;
    localStorage.setItem(STORAGE_KEYS.MAPPINGS, JSON.stringify(this.mappings));
  }

  /**
   * 特定の文字列に対するフリガナを取得（有効なもののみ）
   */
  getMatchedFurigana(text) {
    if (!this.masterEnabled) return null;

    const entry = this.mappings.find(m => m.text === text && m.enabled);
    return entry ? entry.furigana : null;
  }

  /**
   * エントリの追加・更新
   */
  upsertEntry(text, furigana, enabled = true) {
    const index = this.mappings.findIndex(m => m.text === text);
    if (index >= 0) {
      this.mappings[index] = { text, furigana, enabled };
    } else {
      this.mappings.push({ text, furigana, enabled });
    }
    this.saveMappings(this.mappings);
  }

  /**
   * エントリの削除
   */
  removeEntry(text) {
    this.mappings = this.mappings.filter(m => m.text !== text);
    this.saveMappings(this.mappings);
  }
}

// シングルトンとしてエクスポート
export const furiganaMappingService = new FuriganaMappingService();
