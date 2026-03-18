/**
 * 外字サービス
 * 使用不可文字（外字）の管理を行う
 */

import { createLogger } from '../utils/logger.js';

const log = createLogger('gaiji-service');

const STORAGE_KEYS = {
  MAPPINGS_PREFIX: 'gaiji_mappings_'
};

class GaijiService {
  constructor() {
    this.mappings = [];
    this.currentSpecId = null;
  }

  /**
   * 指定された機種IDに基づきデータを初期化
   * @param {string} specId - 機種ID
   */
  init(specId) {
    this.currentSpecId = specId || 'default';
    this.mappings = this._loadMappings();
    
    // 旧形式データからの移行チェック
    this._migrateOldData();
  }

  /**
   * マッピングデータをストレージから読み込む
   */
  _loadMappings() {
    try {
      const key = `${STORAGE_KEYS.MAPPINGS_PREFIX}${this.currentSpecId}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      log.error('Failed to load gaiji mappings', e);
      return [];
    }
  }

  /**
   * 旧形式（単純な文字列）からのデータ移行
   */
  _migrateOldData() {
    const oldKey = `gaiji_${this.currentSpecId}`;
    const oldData = localStorage.getItem(oldKey);

    if (oldData && this.mappings.length === 0) {
      log.info('Migrating old gaiji data to new format', { specId: this.currentSpecId });
      
      const lines = oldData.split(/\r?\n/).filter(line => line.trim() && !line.startsWith('#'));
      const newMappings = lines.map(char => ({
        char: char.trim(),
        description: '移行データ',
        enabled: true
      }));

      if (newMappings.length > 0) {
        this.saveMappings(newMappings);
        // 移行後は旧データを削除（またはリネームして退避）しても良いが、安全のため残しておくか検討
        // ここでは一旦そのまま
      }
    }
  }

  /**
   * 全マッピングを取得
   */
  getMappings() {
    return this.mappings;
  }

  /**
   * バリデーション用の外字セットを取得（有効なもののみ）
   * @returns {Set<string>}
   */
  getGaijiChars() {
    return new Set(
      this.mappings
        .filter(m => m.enabled)
        .map(m => m.char)
    );
  }

  /**
   * マッピングを保存
   */
  saveMappings(mappings) {
    this.mappings = mappings;
    const key = `${STORAGE_KEYS.MAPPINGS_PREFIX}${this.currentSpecId}`;
    localStorage.setItem(key, JSON.stringify(this.mappings));
  }

  /**
   * エントリの追加・更新
   */
  upsertEntry(char, description, enabled = true) {
    const index = this.mappings.findIndex(m => m.char === char);
    if (index >= 0) {
      this.mappings[index] = { char, description, enabled };
    } else {
      this.mappings.push({ char, description, enabled });
    }
    this.saveMappings(this.mappings);
  }

  /**
   * エントリの削除
   */
  removeEntry(char) {
    this.mappings = this.mappings.filter(m => m.char !== char);
    this.saveMappings(this.mappings);
  }
}

// シングルトンとしてエクスポート
export const gaijiService = new GaijiService();
