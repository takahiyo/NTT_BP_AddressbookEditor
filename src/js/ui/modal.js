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
      title: UI_TEXT.MODAL.CONFIRM_TITLE,
      content: `<p>${message}</p>`,
      buttons: [
        {
          label: UI_TEXT.MODAL.BTN_CANCEL,
          style: 'secondary',
          onClick: () => { close(); resolve(false); },
        },
        {
          label: UI_TEXT.MODAL.BTN_OK,
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
    desc.textContent = UI_TEXT.MODAL.CITY_CODE_DESC;
    desc.style.marginBottom = '12px';
    desc.style.color = 'var(--color-text-secondary)';
    container.appendChild(desc);
    container.appendChild(input);

    const { close } = showModal({
      title: UI_TEXT.MODAL.CITY_CODE_TITLE,
      content: container,
      buttons: [
        {
          label: UI_TEXT.MODAL.BTN_CANCEL,
          style: 'secondary',
          onClick: () => { close(); resolve(null); },
        },
        {
          label: UI_TEXT.MODAL.BTN_EXECUTE_CONVERT,
          style: 'primary',
          onClick: () => { close(); resolve(input.value); },
        },
      ],
    });

    /* 自動フォーカス */
    setTimeout(() => input.focus(), 100);
  });
}

/**
 * フリガナ生成の確認・選択モーダルを表示
 * @param {Array<Object>} results - processAllFuriganaの結果
 * @returns {Promise<Array<Object>|null>} 反映対象のデータの配列、キャンセル時はnull
 */
export function showFuriganaReviewModal(results) {
  return new Promise(resolve => {
    // 選択状態の初期化 (同一行はデフォルトで uncheck、変更ありは checked)
    results.forEach(item => {
      if (item.checked === undefined) {
        item.checked = !item.isSame;
      }
    });

    const container = document.createElement('div');
    container.className = 'furigana-review';

    const desc = document.createElement('p');
    desc.textContent = UI_TEXT.MODAL.FURIGANA_REVIEW_DESC;
    desc.style.marginBottom = '12px';
    desc.style.color = 'var(--color-text-secondary)';
    container.appendChild(desc);

    // --- 高機能フィルタパネルの作成 ---
    const filterPanel = document.createElement('div');
    filterPanel.style.display = 'flex';
    filterPanel.style.flexWrap = 'wrap';
    filterPanel.style.gap = '12px';
    filterPanel.style.marginBottom = '12px';
    filterPanel.style.padding = '10px';
    filterPanel.style.background = 'var(--color-bg-secondary)';
    filterPanel.style.borderRadius = '6px';
    filterPanel.style.border = '1px solid var(--color-border)';

    // 1. 文字列検索
    const searchDiv = document.createElement('div');
    searchDiv.style.flex = '1';
    searchDiv.style.minWidth = '160px';
    searchDiv.innerHTML = `
      <label style="display: block; font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">文字列検索</label>
      <input type="text" id="furigana-search-input" class="gaiji-editor" style="height: 32px; width: 100%; font-size: 13px; padding: 4px 8px; border-radius: 4px;" placeholder="名前やフリガナで検索">
    `;
    filterPanel.appendChild(searchDiv);

    // 2. メモリ番号範囲
    const memDiv = document.createElement('div');
    memDiv.style.display = 'flex';
    memDiv.style.gap = '6px';
    memDiv.style.alignItems = 'center';
    memDiv.style.minWidth = '200px';
    memDiv.innerHTML = `
      <div>
        <label style="display: block; font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">開始 No.</label>
        <input type="text" id="furigana-mem-start" class="gaiji-editor" style="height: 32px; width: 75px; font-size: 13px; text-align: center; padding: 4px; border-radius: 4px;" placeholder="000">
      </div>
      <span style="margin-top: 18px; color: var(--color-text-secondary);">〜</span>
      <div>
        <label style="display: block; font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">終了 No.</label>
        <input type="text" id="furigana-mem-end" class="gaiji-editor" style="height: 32px; width: 75px; font-size: 13px; text-align: center; padding: 4px; border-radius: 4px;" placeholder="999">
      </div>
    `;
    filterPanel.appendChild(memDiv);

    // 3. 表示条件 (状態フィルタ)
    const statusDiv = document.createElement('div');
    statusDiv.style.minWidth = '220px';
    statusDiv.innerHTML = `
      <label style="display: block; font-size: 11px; color: var(--color-text-secondary); margin-bottom: 4px;">表示条件</label>
      <div style="display: flex; gap: 10px; margin-top: 6px;">
        <label style="display: flex; align-items: center; gap: 4px; font-size: 12px; cursor: pointer; color: var(--color-text);">
          <input type="radio" name="furigana-status" value="changes" checked> 変更あり
        </label>
        <label style="display: flex; align-items: center; gap: 4px; font-size: 12px; cursor: pointer; color: var(--color-text);">
          <input type="radio" name="furigana-status" value="sames"> 同一のみ
        </label>
        <label style="display: flex; align-items: center; gap: 4px; font-size: 12px; cursor: pointer; color: var(--color-text);">
          <input type="radio" name="furigana-status" value="all"> すべて
        </label>
      </div>
    `;
    filterPanel.appendChild(statusDiv);
    container.appendChild(filterPanel);

    // --- ページネーションパネルの作成 ---
    const paginationPanel = document.createElement('div');
    paginationPanel.style.display = 'flex';
    paginationPanel.style.justifyContent = 'space-between';
    paginationPanel.style.alignItems = 'center';
    paginationPanel.style.marginBottom = '8px';
    paginationPanel.style.fontSize = '12px';
    paginationPanel.innerHTML = `
      <span id="furigana-pagination-info" style="color: var(--color-text-secondary);">全 0 件中 0〜0 件を表示</span>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button id="furigana-page-prev" class="toolbar__btn" style="height: 28px; padding: 0 10px; font-size: 12px; border-radius: 4px; cursor: pointer;">前へ</button>
        <span id="furigana-page-indicator" style="font-weight: 500;">1 / 1 ページ</span>
        <button id="furigana-page-next" class="toolbar__btn" style="height: 28px; padding: 0 10px; font-size: 12px; border-radius: 4px; cursor: pointer;">次へ</button>
      </div>
    `;
    container.appendChild(paginationPanel);

    // --- テーブルの作成 ---
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'modal-table-wrapper';
    
    const table = document.createElement('table');
    table.className = 'modal-table';
    
    // ヘッダー
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th><input type="checkbox" id="furigana-check-all"></th>
        <th style="width: 80px;">メモリNo</th>
        <th>${UI_TEXT.MODAL.FURIGANA_COL_NAME}</th>
        <th>${UI_TEXT.MODAL.FURIGANA_COL_CURRENT}</th>
        <th>${UI_TEXT.MODAL.FURIGANA_COL_GENERATED}</th>
      </tr>
    `;
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    // --- レンダリング状態の変数定義 ---
    let currentPage = 1;
    const pageSize = 50;
    let filteredItems = [];

    // --- フィルタリング & レンダリングロジック ---
    const renderTable = () => {
      const searchQuery = container.querySelector('#furigana-search-input').value.trim().toLowerCase();
      const memStart = container.querySelector('#furigana-mem-start').value.trim();
      const memEnd = container.querySelector('#furigana-mem-end').value.trim();
      const statusFilter = container.querySelector('input[name="furigana-status"]:checked').value;

      // 1. 各種フィルタを適用
      filteredItems = results.filter(item => {
        // 文字列検索 (名前、現在フリガナ、生成フリガナ)
        if (searchQuery) {
          const nameMatch = item.name && item.name.toLowerCase().includes(searchQuery);
          const currentMatch = item.current && item.current.toLowerCase().includes(searchQuery);
          const genMatch = item.generated && item.generated.toLowerCase().includes(searchQuery);
          if (!nameMatch && !currentMatch && !genMatch) return false;
        }

        // メモリ範囲指定
        if (item.memoryNo) {
          const num = parseInt(item.memoryNo, 10);
          if (!isNaN(num)) {
            if (memStart !== '') {
              const startNum = parseInt(memStart, 10);
              if (!isNaN(startNum) && num < startNum) return false;
            }
            if (memEnd !== '') {
              const endNum = parseInt(memEnd, 10);
              if (!isNaN(endNum) && num > endNum) return false;
            }
          }
        }

        // 状態フィルタ (changes: 変更ありのみ、sames: 同一のみ、all: すべて)
        if (statusFilter === 'changes') {
          return !item.isSame;
        } else if (statusFilter === 'sames') {
          return item.isSame;
        }

        return true; // すべて
      });

      // 2. ページネーションの計算
      const totalCount = filteredItems.length;
      const totalPages = Math.ceil(totalCount / pageSize) || 1;
      
      if (currentPage > totalPages) {
        currentPage = totalPages;
      }
      if (currentPage < 1) {
        currentPage = 1;
      }

      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = Math.min(startIdx + pageSize, totalCount);
      const pageItems = filteredItems.slice(startIdx, endIdx);

      // 3. ページネーションコントロールの更新
      container.querySelector('#furigana-pagination-info').textContent = 
        `全 ${totalCount} 件中 ${totalCount > 0 ? startIdx + 1 : 0}〜${endIdx} 件を表示`;
      container.querySelector('#furigana-page-indicator').textContent = 
        `${currentPage} / ${totalPages} ページ`;
      
      container.querySelector('#furigana-page-prev').disabled = (currentPage === 1);
      container.querySelector('#furigana-page-next').disabled = (currentPage === totalPages);

      // 4. 全選択チェックボックスの同期
      const checkAll = container.querySelector('#furigana-check-all');
      if (pageItems.length > 0) {
        checkAll.checked = pageItems.every(item => item.checked);
      } else {
        checkAll.checked = false;
      }

      // 5. テーブル行のレンダリング
      tbody.innerHTML = '';
      if (pageItems.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="5" style="text-align: center; color: var(--color-text-secondary); padding: 24px;">該当するデータはありません</td>`;
        tbody.appendChild(tr);
        return;
      }

      pageItems.forEach(item => {
        const tr = document.createElement('tr');
        
        // 同一フリガナ行のスタイル装飾 (グレーアウト風)
        if (item.isSame) {
          tr.style.color = 'var(--color-text-secondary)';
          tr.style.opacity = '0.7';
          tr.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
        }

        const currentVal = item.current || '<空>';
        const isSameBadge = item.isSame ? '<span style="display: inline-block; padding: 1px 5px; font-size: 10px; background: var(--color-border); border-radius: 4px; margin-left: 6px; color: var(--color-text-secondary);">同一</span>' : '';

        tr.innerHTML = `
          <td><input type="checkbox" class="furigana-row-check" data-index="${item.index}" ${item.checked ? 'checked' : ''}></td>
          <td style="text-align: center; font-family: monospace;">${item.memoryNo || '-'}</td>
          <td class="cell-name">${item.name}${isSameBadge}</td>
          <td class="cell-current">${currentVal}</td>
          <td class="cell-generated" style="font-weight: ${item.isSame ? 'normal' : 'bold'}; color: ${item.isSame ? 'inherit' : 'var(--color-primary)'};">${item.generated}</td>
        `;

        // 個別のチェック操作イベント
        const cb = tr.querySelector('.furigana-row-check');
        cb.addEventListener('change', () => {
          item.checked = cb.checked;
          
          // 再度ヘッダーの全選択チェックボックス状態を確認
          const pageItemsNow = filteredItems.slice(startIdx, endIdx);
          checkAll.checked = pageItemsNow.every(p => p.checked);
        });

        tbody.appendChild(tr);
      });
    };

    // --- イベントリスナーの設定 ---

    // 検索入力時のリアルタイムフィルター
    container.querySelector('#furigana-search-input').addEventListener('input', () => {
      currentPage = 1;
      renderTable();
    });

    // メモリ範囲指定時のリアルタイムフィルター
    container.querySelector('#furigana-mem-start').addEventListener('input', () => {
      currentPage = 1;
      renderTable();
    });
    container.querySelector('#furigana-mem-end').addEventListener('input', () => {
      currentPage = 1;
      renderTable();
    });

    // 状態ラジオボタン変更時のフィルター
    container.querySelectorAll('input[name="furigana-status"]').forEach(radio => {
      radio.addEventListener('change', () => {
        currentPage = 1;
        renderTable();
      });
    });

    // ページネーション前へ・次へ
    container.querySelector('#furigana-page-prev').addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });
    container.querySelector('#furigana-page-next').addEventListener('click', () => {
      currentPage++;
      renderTable();
    });

    // ヘッダーの全選択・解除 (現在の表示フィルタに該当する全アイテムの状態を変更)
    const checkAll = container.querySelector('#furigana-check-all');
    checkAll.addEventListener('change', () => {
      const searchQuery = container.querySelector('#furigana-search-input').value.trim().toLowerCase();
      const memStart = container.querySelector('#furigana-mem-start').value.trim();
      const memEnd = container.querySelector('#furigana-mem-end').value.trim();
      const statusFilter = container.querySelector('input[name="furigana-status"]:checked').value;

      // 現在のフィルターに該当する全アイテムに対してチェック状態を適用
      filteredItems.forEach(item => {
        item.checked = checkAll.checked;
      });

      // 再描画
      renderTable();
    });

    // 初回テーブル描画
    renderTable();

    // モーダルの起動
    const { close } = showModal({
      title: UI_TEXT.MODAL.FURIGANA_REVIEW_TITLE,
      content: container,
      buttons: [
        {
          label: UI_TEXT.MODAL.BTN_CANCEL,
          style: 'secondary',
          onClick: () => { close(); resolve(null); },
        },
        {
          label: UI_TEXT.MODAL.BTN_APPLY,
          style: 'primary',
          onClick: () => {
            // checked フラグが立っているもののみをフィルタリングして反映する
            const selected = results.filter(item => item.checked);
            close();
            resolve(selected);
          },
        },
      ],
    });
  });
}
