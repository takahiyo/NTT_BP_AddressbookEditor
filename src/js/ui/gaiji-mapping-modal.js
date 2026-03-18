/**
 * 外字マッピング管理モーダル
 */

import { showModal, confirmDialog } from './modal.js';
import { gaijiService } from '../services/gaiji-service.js';
import { UI_TEXT } from '../constants/ui-text.js';

/**
 * 外字マッピング管理画面を表示
 */
export function showGaijiMappingEditor() {
  return new Promise(resolve => {
    const container = document.createElement('div');
    container.className = 'mapping-editor';

    // 検索・フィルタツールバー
    const filterBar = document.createElement('div');
    filterBar.className = 'mapping-editor__filter';
    filterBar.style.display = 'flex';
    filterBar.style.gap = '8px';
    filterBar.style.marginBottom = '12px';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '文字または備考で検索...';
    searchInput.className = 'toolbar__btn'; // スタイル流用
    searchInput.style.flex = '1';
    searchInput.style.textAlign = 'left';
    searchInput.id = 'gaiji-mapping-search';

    const addBtn = document.createElement('button');
    addBtn.className = 'toolbar__btn toolbar__btn--primary';
    addBtn.textContent = '新規追加';
    addBtn.id = 'gaiji-mapping-add-btn';

    filterBar.appendChild(searchInput);
    filterBar.appendChild(addBtn);
    container.appendChild(filterBar);

    // 説明文
    const desc = document.createElement('p');
    desc.className = 'modal-description';
    desc.textContent = UI_TEXT.MODAL.GAIJI_DESCRIPTION;
    desc.style.marginBottom = '12px';
    desc.style.fontSize = '0.9rem';
    desc.style.color = 'var(--color-text-muted)';
    container.appendChild(desc);

    // リスト表示用テーブル
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'modal-table-wrapper';
    tableWrapper.style.maxHeight = '400px';
    
    const table = document.createElement('table');
    table.className = 'modal-table';
    table.id = 'gaiji-mapping-table';
    
    const renderTable = (filter = '') => {
      const mappings = gaijiService.getMappings();
      const filtered = mappings.filter(m => 
        m.char.includes(filter) || (m.description && m.description.includes(filter))
      );
      
      table.innerHTML = `
        <thead>
          <tr>
            <th style="width: 40px;">有効</th>
            <th style="width: 60px;">${UI_TEXT.MODAL.GAIJI_COL_CHAR}</th>
            <th>${UI_TEXT.MODAL.GAIJI_COL_DESC}</th>
            <th style="width: 100px;">操作</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length ? '' : '<tr><td colspan="4" style="text-align:center; padding: 20px;">データがありません</td></tr>'}
        </tbody>
      `;
      
      const tbody = table.querySelector('tbody');
      filtered.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="text-align:center;">
            <input type="checkbox" class="gaiji-toggle" ${item.enabled ? 'checked' : ''} data-char="${item.char}">
          </td>
          <td style="text-align:center; font-size: 1.2rem;">${item.char}</td>
          <td>${item.description || ''}</td>
          <td style="text-align:center;">
            <button class="gaiji-edit-btn" data-char="${item.char}" style="background:none; border:none; cursor:pointer; color:var(--color-primary); margin-right:8px;">編集</button>
            <button class="gaiji-delete-btn" data-char="${item.char}" style="background:none; border:none; cursor:pointer; color:var(--color-danger);">削除</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    };

    renderTable();
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    const { close } = showModal({
      title: UI_TEXT.MODAL.GAIJI_TITLE,
      content: container,
      buttons: [
        {
          label: '閉じる',
          style: 'secondary',
          onClick: () => { close(); resolve(true); }, // 変更があったかもしれないのでtrueを返す
        }
      ],
    });

    // 検索イベント
    searchInput.addEventListener('input', (e) => {
      renderTable(e.target.value);
    });

    // 追加・編集・削除・トグルイベントの委譲
    container.addEventListener('click', async (e) => {
      const target = e.target;
      
      // 新規追加
      if (target.id === 'gaiji-mapping-add-btn') {
        const char = prompt('登録する文字（外字）を1文字入力してください');
        if (!char || char.length !== 1) {
            if (char) alert('1文字のみ入力してください');
            return;
        }
        const desc = prompt(`「${char}」の備考を入力してください（任意）`);
        
        gaijiService.upsertEntry(char, desc);
        renderTable(searchInput.value);
      }
      
      // 編集
      if (target.classList.contains('gaiji-edit-btn')) {
        const char = target.dataset.char;
        const entry = gaijiService.getMappings().find(m => m.char === char);
        if (!entry) return;
        
        const newDesc = prompt(`「${char}」の備考を編集`, entry.description);
        if (newDesc === null) return;
        
        gaijiService.upsertEntry(char, newDesc, entry.enabled);
        renderTable(searchInput.value);
      }
      
      // 削除
      if (target.classList.contains('gaiji-delete-btn')) {
        const char = target.dataset.char;
        if (await confirmDialog(`「${char}」を削除してもよろしいですか？`)) {
          gaijiService.removeEntry(char);
          renderTable(searchInput.value);
        }
      }
    });

    // トグルイベント
    container.addEventListener('change', (e) => {
      if (e.target.classList.contains('gaiji-toggle')) {
        const char = e.target.dataset.char;
        const entry = gaijiService.getMappings().find(m => m.char === char);
        if (entry) {
          gaijiService.upsertEntry(char, entry.description, e.target.checked);
        }
      }
    });
  });
}
