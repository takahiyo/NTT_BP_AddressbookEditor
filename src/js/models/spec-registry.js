/**
 * 機種レジストリ
 * 全機種仕様の登録・取得を管理
 * 新機種追加時はimport＋register()の1箇所で済む
 */

import { ZX2SM_SPEC } from './specs/zx2sm.js';
import { A1_SPEC } from './specs/a1.js';

/** 登録済み機種仕様のMap */
const specRegistry = new Map();

/**
 * 機種仕様を登録
 * @param {Object} spec - 機種仕様オブジェクト（id必須）
 */
function register(spec) {
  if (!spec || !spec.id) {
    console.error('[spec-registry] 無効な機種仕様:', spec);
    return;
  }
  specRegistry.set(spec.id, spec);
}

/* === 初期登録 === */
register(ZX2SM_SPEC);
register(A1_SPEC);
/* 新機種追加例:
 * import { TYPEL_SPEC } from './specs/typel.js';
 * register(TYPEL_SPEC);
 */

/**
 * IDで機種仕様を取得
 * @param {string} id - 機種ID
 * @returns {Object|undefined} 機種仕様、見つからなければundefined
 */
export function getSpec(id) {
  return specRegistry.get(id);
}

/**
 * 全登録済み機種仕様を配列で取得
 * @returns {Array} 機種仕様オブジェクトの配列
 */
export function getAllSpecs() {
  return [...specRegistry.values()];
}

/**
 * 機種IDの一覧を取得（セレクトボックス用）
 * @returns {Array<{id: string, name: string}>} IDと表示名のペア
 */
export function getSpecOptions() {
  return getAllSpecs().map(spec => ({
    id: spec.id,
    name: spec.name,
  }));
}
