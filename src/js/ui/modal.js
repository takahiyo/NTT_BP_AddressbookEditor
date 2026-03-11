/**
 * モーダルダイアログ管理
 * 外字設定、確認ダイアログ等の表示制御
 */

import { UI_TEXT } from '../constants/ui-text.js';

/**
 * モーダルを表示
 * @param {Object} options - モーダル設定
 * @param {string} options.title - タイトル
 * @param {string|HTMLElement} options.content - 本文（HTML文字列またはDOM要素）
 * @param {Array<{label: string, style: string, onClick: Function}>} options.buttons - フッターボタン
 * @param {Function} [options.onClose] - 閉じた時のコールバック
 * @returns {{ close: Function }} モーダル制御オブジェクト
 */
export function showModal(options) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  /* ヘッダー */
  const header = document.createElement('div');
  header.className = 'modal__header';
  const title = document.createElement('h2');
  title.className = 'modal__title';
  title.textContent = options.title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal__close';
  closeBtn.textContent = UI_TEXT.MODAL.BTN_CLOSE;
  closeBtn.id = 'modal-close-btn';
  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  /* コンテンツ */
  const body = document.createElement('div');
  body.className = 'modal__body';
  if (typeof options.content === 'string') {
    body.innerHTML = options.content;
  } else {
    body.appendChild(options.content);
  }
  modal.appendChild(body);

  /* フッター */
  if (options.buttons && options.buttons.length > 0) {
    const footer = document.createElement('div');
    footer.className = 'modal__footer';
    options.buttons.forEach(btnDef => {
      const btn = document.createElement('button');
      btn.className = `toolbar__btn toolbar__btn--${btnDef.style || 'secondary'}`;
      btn.textContent = btnDef.label;
      btn.addEventListener('click', () => {
        if (btnDef.onClick) btnDef.onClick();
      });
      footer.appendChild(btn);
    });
    modal.appendChild(footer);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  /* 閉じる関数 */
  const close = () => {
    overlay.classList.remove('is-active');
    setTimeout(() => {
      overlay.remove();
      if (options.onClose) options.onClose();
    }, 250);
  };

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  /* 表示アニメーション */
  requestAnimationFrame(() => {
    overlay.classList.add('is-active');
  });

  return { close };
}

/**
 * 確認ダイアログを表示
 * @param {string} message - 確認メッセージ
 * @returns {Promise<boolean>} ユーザーの応答（OK=true, キャンセル=false）
 */
export function confirmDialog(message) {
  return new Promise(resolve => {
    const { close } = showModal({
      title: '確認',
      content: `<p>${message}</p>`,
      buttons: [
        {
          label: UI_TEXT.MODAL.BTN_CANCEL,
          style: 'secondary',
          onClick: () => { close(); resolve(false); },
        },
        {
          label: 'OK',
          style: 'primary',
          onClick: () => { close(); resolve(true); },
        },
      ],
    });
  });
}

/**
 * 外字設定モーダルを表示
 * @param {string} currentGaiji - 現在の外字設定テキスト
 * @returns {Promise<string|null>} 保存時は新しいテキスト、キャンセル時はnull
 */
export function showGaijiEditor(currentGaiji) {
  return new Promise(resolve => {
    const textarea = document.createElement('textarea');
    textarea.className = 'gaiji-editor';
    textarea.id = 'gaiji-textarea';
    textarea.value = currentGaiji || '';
    textarea.placeholder = '使用不可文字を1行1文字で入力\n例:\n①\n②\n☆';

    const container = document.createElement('div');
    const desc = document.createElement('p');
    desc.textContent = UI_TEXT.MODAL.GAIJI_DESCRIPTION;
    desc.style.marginBottom = '12px';
    desc.style.color = 'var(--color-text-secondary)';
    container.appendChild(desc);
    container.appendChild(textarea);

    const { close } = showModal({
      title: UI_TEXT.MODAL.GAIJI_TITLE,
      content: container,
      buttons: [
        {
          label: UI_TEXT.MODAL.BTN_CANCEL,
          style: 'secondary',
          onClick: () => { close(); resolve(null); },
        },
        {
          label: UI_TEXT.MODAL.BTN_SAVE,
          style: 'primary',
          onClick: () => { close(); resolve(textarea.value); },
        },
      ],
    });
  });
}

/**
 * 市外局番入力モーダルを表示
 * @returns {Promise<string|null>} 保存時は市外局番、キャンセル時はnull
 */
export function showCityCodeModal() {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'gaiji-editor'; // スタイル流用
    input.style.height = 'auto';
    input.placeholder = '例: 052';
    input.id = 'city-code-input';

    const container = document.createElement('div');
    const desc = document.createElement('p');
    desc.textContent = '市外局番を指定してください（AB-J変換用）';
    desc.style.marginBottom = '12px';
    desc.style.color = 'var(--color-text-secondary)';
    container.appendChild(desc);
    container.appendChild(input);

    const { close } = showModal({
      title: '市外局番設定',
      content: container,
      buttons: [
        {
          label: UI_TEXT.MODAL.BTN_CANCEL,
          style: 'secondary',
          onClick: () => { close(); resolve(null); },
        },
        {
          label: '変換実行',
          style: 'primary',
          onClick: () => { close(); resolve(input.value); },
        },
      ],
    });

    /* 自動フォーカス */
    setTimeout(() => input.focus(), 100);
  });
}
