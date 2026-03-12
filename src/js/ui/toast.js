/**
 * トースト通知
 * 操作結果の一時的なフィードバック表示
 */

import { APP_CONFIG } from '../constants/app-config.js';

/**
 * トーストを表示
 * @param {string} message - 表示メッセージ
 * @param {'success'|'error'|'info'} type - トースト種別
 * @param {number} [duration] - 表示時間（ms）、省略時はAPP_CONFIG.TOAST_DURATION_MS
 */
export function showToast(message, type = 'info', duration) {
  const displayDuration = duration || APP_CONFIG.TOAST_DURATION_MS;

  /* トーストコンテナを取得または作成 */
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  /* トースト要素 */
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  /* アイコン */
  const icons = { success: '✓', error: '✗', info: 'ℹ' };
  toast.textContent = `${icons[type] || ''} ${message}`;

  container.appendChild(toast);

  /* 自動消去 */
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, displayDuration);
}

/**
 * UIテキストのプレースホルダーを置換
 * @param {string} template - テンプレート文字列（{key}形式）
 * @param {Object} values - 置換値
 * @returns {string} 置換後文字列
 */
export function formatText(template, values = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    values[key] !== undefined ? String(values[key]) : `{${key}}`
  );
}
