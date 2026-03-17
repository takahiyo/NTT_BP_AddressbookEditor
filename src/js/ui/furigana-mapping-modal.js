/**
 * フリガナ・マッピング管理モーダル
 */

import { showModal, confirmDialog } from './modal.js';
import { furiganaMappingService } from '../services/furigana-mapping-service.js';

/**
 * フリガナ・マッピング管理画面を表示
 */
export function showFuriganaMappingEditor() {
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
    searchInput.placeholder = '登録名で検索...';
    searchInput.className = 'toolbar__btn'; // スタイル流用
    searchInput.style.flex = '1';
    searchInput.style.textAlign = 'left';
    searchInput.id = 'mapping-search';

    const addBtn = document.createElement('button');
    addBtn.className = 'toolbar__btn toolbar__btn--primary';
    addBtn.textContent = '新規追加';
    addBtn.id = 'mapping-add-btn';

    filterBar.appendChild(searchInput);
    filterBar.appendChild(addBtn);
    container.appendChild(filterBar);

    // リスト表示用テーブル
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'modal-table-wrapper';
    tableWrapper.style.maxHeight = '400px';
    
    const table = document.createElement('table');
    table.className = 'modal-table';
    table.id = 'mapping-table';
    
    const renderTable = (filter = '') => {
      const mappings = furiganaMappingService.getMappings();
      const filtered = mappings.filter(m => m.text.includes(filter));
      
      table.innerHTML = `
        <thead>
          <tr>
            <th style="width: 40px;">有効</th>
            <th>名称</th>
            <th>フリガナ</th>
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
            <input type="checkbox" class="mapping-toggle" ${item.enabled ? 'checked' : ''} data-text="${item.text}">
          </td>
          <td>${item.text}</td>
          <td>${item.furigana}</td>
          <td style="text-align:center;">
            <button class="mapping-edit-btn" data-text="${item.text}" style="background:none; border:none; cursor:pointer; color:var(--color-primary); margin-right:8px;">編集</button>
            <button class="mapping-delete-btn" data-text="${item.text}" style="background:none; border:none; cursor:pointer; color:var(--color-danger);">削除</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    };

    renderTable();
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    const { close } = showModal({
      title: 'フリガナ個別指定辞書',
      content: container,
      buttons: [
        {
          label: '閉じる',
          style: 'secondary',
          onClick: () => { close(); resolve(); },
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
      if (target.id === 'mapping-add-btn') {
        const name = prompt('登録する名称（漢字等）を入力してください');
        if (!name) return;
        const kana = prompt(`「${name}」に対するフリガナを入力してください`);
        if (!kana) return;
        
        furiganaMappingService.upsertEntry(name, kana);
        renderTable(searchInput.value);
      }
      
      // 編集
      if (target.className === 'mapping-edit-btn') {
        const text = target.dataset.text;
        const entry = furiganaMappingService.getMappings().find(m => m.text === text);
        if (!entry) return;
        
        const newKana = prompt(`「${text}」のフリガナを編集`, entry.furigana);
        if (newKana === null) return;
        
        furiganaMappingService.upsertEntry(text, newKana, entry.enabled);
        renderTable(searchInput.value);
      }
      
      // 削除
      if (target.className === 'mapping-delete-btn') {
        const text = target.dataset.text;
        if (await confirmDialog(`「${text}」を削除してもよろしいですか？`)) {
          furiganaMappingService.removeEntry(text);
          renderTable(searchInput.value);
        }
      }
    });

    // トグルイベント
    container.addEventListener('change', (e) => {
      if (e.target.className === 'mapping-toggle') {
        const text = e.target.dataset.text;
        const entry = furiganaMappingService.getMappings().find(m => m.text === text);
        if (entry) {
          furiganaMappingService.upsertEntry(text, entry.furigana, e.target.checked);
        }
      }
    });
  });
}
