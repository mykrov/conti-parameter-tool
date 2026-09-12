/**
 * Sección parametro: render unificado (tarjetas/tabla), switches editables,
 * cambios pendientes y guardado individual/en lote.
 */
import { state } from '../core/state.js';
import { dom } from '../core/dom.js';
import { escapeHtml } from '../core/utils.js';
import { showToast, openJsonModal } from '../core/ui.js';

export function setupEventListenersParam() {
  // Búsqueda
  dom.paramSearchInput.addEventListener('input', (e) => {
    state.parametro.searchTerm = e.target.value.toLowerCase().trim();
    dom.btnParamClearSearch.style.display = state.parametro.searchTerm ? 'inline-flex' : 'none';
    renderParametroView();
  });

  dom.btnParamClearSearch.addEventListener('click', () => {
    dom.paramSearchInput.value = '';
    state.parametro.searchTerm = '';
    dom.btnParamClearSearch.style.display = 'none';
    renderParametroView();
  });

  // Ordenar
  dom.paramSortFilter.addEventListener('change', (e) => {
    state.parametro.selectedSort = e.target.value;
    renderParametroView();
  });

  // Filtro de Tipo
  dom.paramTypeFilter.addEventListener('change', (e) => {
    state.parametro.selectedType = e.target.value;
    renderParametroView();
  });

  // Switch de Vistas
  dom.btnParamViewCards.addEventListener('click', () => {
    state.parametro.currentView = 'cards';
    dom.btnParamViewCards.classList.add('active');
    dom.btnParamViewTable.classList.remove('active');
    dom.paramCardsView.style.display = 'flex';
    dom.paramTableView.style.display = 'none';
  });

  dom.btnParamViewTable.addEventListener('click', () => {
    state.parametro.currentView = 'table';
    dom.btnParamViewTable.classList.add('active');
    dom.btnParamViewCards.classList.remove('active');
    dom.paramCardsView.style.display = 'none';
    dom.paramTableView.style.display = 'block';
  });

  // Barra de Cambios Pendientes
  dom.btnDiscardAll.addEventListener('click', discardAllParamChanges);
  dom.btnSaveAll.addEventListener('click', saveAllParamChanges);
}

export async function fetchParametros() {
  try {
    const res = await fetch('/api/parametros');
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    state.parametro.data = result.data || [];
    state.parametro.stats = result.stats || {};
    state.parametro.modifiedMap.clear();
    dom.badgeCountParam.textContent = state.parametro.data.length;

    // Actualizar KPIs de parametro
    dom.valParamTotal.textContent = state.parametro.stats.total || state.parametro.data.length;
    dom.valParamActivos.textContent = state.parametro.stats.activos || 0;
    dom.valParamInactivos.textContent = state.parametro.stats.inactivos || 0;
    dom.valParamTextos.textContent = state.parametro.stats.textos || 0;

    updatePendingChangesBar();
    renderParametroView();
  } catch (err) {
    console.error('Error parametro:', err);
  }
}

function getParamRecordKey(param) {
  return `${param.id}:${param.terminal_id ?? ''}`;
}

function findParametro(id, terminalId) {
  return state.parametro.data.find(param => (
    param.id === id && (terminalId === undefined || param.terminal_id === terminalId)
  ));
}

function getParamCardId(param) {
  return `card_param_${param.id}_${param.terminal_id ?? 'unknown'}`;
}

// Renderizado unificado de todos los parámetros juntos
export function renderParametroView() {
  let filtered = state.parametro.data.filter(param => {
    const isModified = state.parametro.modifiedMap.has(getParamRecordKey(param));

    // Filtro por tipo
    if (state.parametro.selectedType === 'booleano' && param.esBooleano !== 1) return false;
    if (state.parametro.selectedType === 'texto' && param.esBooleano === 1) return false;
    if (state.parametro.selectedType === 'modificados' && !isModified) return false;

    // Filtro por búsqueda
    if (state.parametro.searchTerm) {
      const matchName = param.nombre.toLowerCase().includes(state.parametro.searchTerm);
      const matchStr = (param.valorString || '').toLowerCase().includes(state.parametro.searchTerm);
      const matchGroup = (param.grupo_nombre || '').toLowerCase().includes(state.parametro.searchTerm);
      const matchId = String(param.id).includes(state.parametro.searchTerm);
      return matchName || matchStr || matchGroup || matchId;
    }

    return true;
  });

  // Ordenar
  const sortMode = state.parametro.selectedSort || 'nombre_asc';
  filtered.sort((a, b) => {
    if (sortMode === 'nombre_asc') return a.nombre.localeCompare(b.nombre);
    if (sortMode === 'nombre_desc') return b.nombre.localeCompare(a.nombre);
    if (sortMode === 'id_asc') return a.id - b.id;
    if (sortMode === 'id_desc') return b.id - a.id;
    return 0;
  });

  renderParametroCardsUnified(filtered);
  renderParametroTableUnified(filtered);
}

// Vista de Tarjetas: TODOS JUNTOS en una sola cuadrícula continua
function renderParametroCardsUnified(params) {
  dom.paramCardsView.innerHTML = '';
  if (params.length === 0) {
    dom.paramCardsView.innerHTML = `<div class="state-container"><p>No se encontraron parámetros con los filtros aplicados.</p></div>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'param-cards-grid';
  grid.id = 'paramAllGrid';
  dom.paramCardsView.appendChild(grid);

  params.forEach(param => {
    const isModified = state.parametro.modifiedMap.has(getParamRecordKey(param));
    const modEntry = isModified ? state.parametro.modifiedMap.get(getParamRecordKey(param)) : null;

    const card = document.createElement('div');
    card.className = `param-card ${isModified ? 'is-dirty' : ''}`;
    card.id = getParamCardId(param);

    let controlHtml = '';

    if (param.esBooleano === 1) {
      // Switch booleano
      const currentVal = isModified ? modEntry.val : param.valorEntero;
      const isTrue = Number(currentVal) === 1;
      controlHtml = `
        <div class="toggle-switch-wrapper">
          <div class="toggle-switch is-clickable ${isTrue ? 'switch-on' : 'switch-off'}" 
               onclick="toggleParamSwitch(${param.id}, ${param.terminal_id})"
               title="Haz clic para alternar Estado (Activo/Inactivo)">
            <span class="switch-handle"></span>
          </div>
          <span class="switch-label-tag ${isTrue ? 'tag-on' : 'tag-off'}" 
                onclick="toggleParamSwitch(${param.id}, ${param.terminal_id})" 
                style="cursor: pointer;">
            ${isTrue ? 'ACTIVO' : 'INACTIVO'}
          </span>
        </div>
      `;
    } else if (param.valorString !== null && param.valorString !== undefined) {
      // Parámetro de texto editable (ej. urlSincronizacion)
      const currentVal = isModified ? modEntry.val : (param.valorString || '');
      controlHtml = `
        <div style="width: 100%; display: flex; align-items: center; gap: 0.4rem;">
          <input type="text" 
                 class="field-text-input-editable ${isModified ? 'is-dirty' : ''}" 
                 id="input_param_${param.id}"
                 value="${escapeHtml(currentVal)}" 
                 placeholder="(Texto vacío)"
                 title="Modificar valor de ${param.nombre}"
                 oninput="handleParamTextInput(${param.id}, ${param.terminal_id}, this.value)"
                 onkeydown="if(event.key==='Enter') saveSingleParam(${param.id}, ${param.terminal_id})">
        </div>
      `;
    } else {
      // Parámetro numérico entero editable (ej. decimales, listadoProductos)
      const currentVal = isModified ? modEntry.val : param.valorEntero;
      controlHtml = `
        <div style="width: 100%; display: flex; align-items: center; gap: 0.4rem;">
          <input type="number" 
                 class="field-text-input-editable font-mono ${isModified ? 'is-dirty' : ''}" 
                 id="input_param_${param.id}"
                 value="${currentVal !== null ? currentVal : ''}" 
                 placeholder="0"
                 title="Modificar valor numérico de ${param.nombre}"
                 oninput="handleParamNumberInput(${param.id}, ${param.terminal_id}, this.value)"
                 onkeydown="if(event.key==='Enter') saveSingleParam(${param.id}, ${param.terminal_id})">
        </div>
      `;
    }

    card.innerHTML = `
      <div class="param-card-top">
        <div>
          <span class="param-field-name">${param.nombre}</span>
          <div class="param-card-meta">
            <span>ID: ${param.id}</span>
            ${param.grupo_nombre && param.grupo_nombre !== 'Sin Grupo' ? `<span class="param-group-tag">${param.grupo_nombre}</span>` : ''}
          </div>
        </div>
        <div class="param-card-badges">
          ${isModified ? '<span class="tag-modified">Modificado</span>' : ''}
          <span class="param-terminal-badge" title="Terminal ${escapeHtml(param.terminal_id ?? 'N/A')}${param.terminal_nombre ? ` - ${escapeHtml(param.terminal_nombre)}` : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="4" width="20" height="13" rx="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <span>Terminal: ${escapeHtml(param.terminal_id ?? 'N/A')}</span>
          </span>
        </div>
      </div>

      <div class="param-value-container">
        <div class="param-value-box-wrapper">${controlHtml}</div>
        <div class="param-actions">
          ${isModified ? `
            <button class="btn-save-inline" onclick="saveSingleParam(${param.id}, ${param.terminal_id})" title="Guardar este cambio en MySQL">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Guardar</span>
            </button>
          ` : ''}
          <button class="btn-icon-action" title="Copiar nombre" onclick="copyValue('${param.nombre}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="btn-icon-action" title="Inspeccionar" onclick="inspectParametro(${param.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Vista de Tabla: TODOS JUNTOS en una sola tabla continua
function renderParametroTableUnified(params) {
  dom.paramTableBody.innerHTML = '';
  params.forEach(param => {
    const isModified = state.parametro.modifiedMap.has(getParamRecordKey(param));
    const modEntry = isModified ? state.parametro.modifiedMap.get(getParamRecordKey(param)) : null;

    let controlHtml = '';
    if (param.esBooleano === 1) {
      const currentVal = isModified ? modEntry.val : param.valorEntero;
      const isTrue = Number(currentVal) === 1;
      controlHtml = `
        <div class="toggle-switch-wrapper">
          <div class="toggle-switch is-clickable ${isTrue ? 'switch-on' : 'switch-off'}" 
               onclick="toggleParamSwitch(${param.id}, ${param.terminal_id})"
               title="Haz clic para alternar Estado">
            <span class="switch-handle"></span>
          </div>
          <span class="switch-label-tag ${isTrue ? 'tag-on' : 'tag-off'}" 
                onclick="toggleParamSwitch(${param.id}, ${param.terminal_id})" 
                style="cursor: pointer;">
            ${isTrue ? 'ACTIVO' : 'INACTIVO'}
          </span>
          ${isModified ? '<span class="tag-modified" style="margin-left: 0.35rem;">Modificado</span>' : ''}
        </div>
      `;
    } else if (param.valorString !== null && param.valorString !== undefined) {
      const currentVal = isModified ? modEntry.val : (param.valorString || '');
      controlHtml = `
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <input type="text" 
                 class="field-text-input-editable ${isModified ? 'is-dirty' : ''}" 
                 value="${escapeHtml(currentVal)}" 
                 placeholder="(Texto vacío)"
                 oninput="handleParamTextInput(${param.id}, ${param.terminal_id}, this.value)"
                 onkeydown="if(event.key==='Enter') saveSingleParam(${param.id}, ${param.terminal_id})">
          ${isModified ? '<span class="tag-modified">Modificado</span>' : ''}
        </div>
      `;
    } else {
      const currentVal = isModified ? modEntry.val : param.valorEntero;
      controlHtml = `
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <input type="number" 
                 class="field-text-input-editable font-mono ${isModified ? 'is-dirty' : ''}" 
                 style="max-width: 130px;"
                 value="${currentVal !== null ? currentVal : ''}" 
                 oninput="handleParamNumberInput(${param.id}, ${param.terminal_id}, this.value)"
                 onkeydown="if(event.key==='Enter') saveSingleParam(${param.id}, ${param.terminal_id})">
          ${isModified ? '<span class="tag-modified">Modificado</span>' : ''}
        </div>
      `;
    }

    const tr = document.createElement('tr');
    tr.className = isModified ? 'is-dirty' : '';
    tr.innerHTML = `
      <td style="color: var(--text-muted); font-family: var(--font-mono);">${param.id}</td>
      <td>
        <div class="col-field-name">${param.nombre}</div>
      </td>
      <td style="color: var(--text-secondary); font-size: 0.75rem;">
        ${param.grupo_nombre && param.grupo_nombre !== 'Sin Grupo' ? `<span class="param-group-tag">${param.grupo_nombre}</span>` : '<span style="color: var(--text-muted);">-</span>'}
      </td>
      <td>${controlHtml}</td>
      <td style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.72rem;">v${param.version || '1.0'}</td>
      <td style="text-align: center;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.35rem;">
          ${isModified ? `
            <button class="btn-save-inline" onclick="saveSingleParam(${param.id}, ${param.terminal_id})" title="Guardar en MySQL">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Guardar</span>
            </button>
          ` : ''}
          <button class="btn-icon-action" title="Inspeccionar" onclick="inspectParametro(${param.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </button>
        </div>
      </td>
    `;
    dom.paramTableBody.appendChild(tr);
  });
}

// Switch Booleano (expuesto global para los onclick inline)
window.toggleParamSwitch = function(id, terminalId) {
  const param = findParametro(id, terminalId);
  if (!param) return;

  const recordKey = getParamRecordKey(param);
  const originalVal = param.valorEntero;
  const currentVal = state.parametro.modifiedMap.has(recordKey)
    ? state.parametro.modifiedMap.get(recordKey).val
    : originalVal;

  const newVal = currentVal === 1 ? 0 : 1;

  if (newVal === originalVal) {
    state.parametro.modifiedMap.delete(recordKey);
  } else {
    state.parametro.modifiedMap.set(recordKey, {
      id: param.id,
      terminal_id: param.terminal_id,
      type: 'boolean',
      val: newVal
    });
  }

  updatePendingChangesBar();
  renderParametroView();
};

// Input de Texto (ej. urlSincronizacion)
window.handleParamTextInput = function(id, terminalId, newVal) {
  const param = findParametro(id, terminalId);
  if (!param) return;

  const recordKey = getParamRecordKey(param);
  const originalVal = param.valorString || '';
  if (newVal === originalVal) {
    state.parametro.modifiedMap.delete(recordKey);
  } else {
    state.parametro.modifiedMap.set(recordKey, {
      id: param.id,
      terminal_id: param.terminal_id,
      type: 'string',
      val: newVal
    });
  }

  updatePendingChangesBar();
  updateCardOrRowState(id, terminalId);
};

// Input Numérico
window.handleParamNumberInput = function(id, terminalId, newVal) {
  const param = findParametro(id, terminalId);
  if (!param) return;

  const recordKey = getParamRecordKey(param);
  const parsed = newVal === '' ? null : parseInt(newVal, 10);
  if (parsed === param.valorEntero) {
    state.parametro.modifiedMap.delete(recordKey);
  } else {
    state.parametro.modifiedMap.set(recordKey, {
      id: param.id,
      terminal_id: param.terminal_id,
      type: 'int',
      val: parsed
    });
  }

  updatePendingChangesBar();
  updateCardOrRowState(id, terminalId);
};

function updateCardOrRowState(id, terminalId) {
  const param = findParametro(id, terminalId);
  if (!param) return;

  const recordKey = getParamRecordKey(param);
  const card = document.getElementById(getParamCardId(param));
  const isModified = state.parametro.modifiedMap.has(recordKey);
  if (card) {
    if (isModified) card.classList.add('is-dirty');
    else card.classList.remove('is-dirty');

    // Actualizar botón guardar en la tarjeta
    const actions = card.querySelector('.param-actions');
    const existingBtn = actions.querySelector('.btn-save-inline');
    if (isModified && !existingBtn) {
      const btn = document.createElement('button');
      btn.className = 'btn-save-inline';
      btn.onclick = () => saveSingleParam(param.id, param.terminal_id);
      btn.title = 'Guardar este cambio en MySQL';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Guardar</span>
      `;
      actions.insertBefore(btn, actions.firstChild);
    } else if (!isModified && existingBtn) {
      existingBtn.remove();
    }
  }
}

// Guardar un parámetro individual (sea booleano, texto o número)
window.saveSingleParam = async function(id, terminalId) {
  const param = findParametro(id, terminalId);
  const recordKey = param ? getParamRecordKey(param) : null;
  if (!param || !recordKey || !state.parametro.modifiedMap.has(recordKey)) return;

  const mod = state.parametro.modifiedMap.get(recordKey);
  const payload = { terminal_id: param.terminal_id };

  if (mod.type === 'string') {
    payload.valorString = mod.val;
  } else {
    payload.valorEntero = mod.val;
  }

  try {
    const res = await fetch(`/api/parametros/${param.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    // Actualizar valor original en memoria
    if (mod.type === 'string') {
      param.valorString = mod.val;
    } else {
      param.valorEntero = mod.val;
    }

    state.parametro.modifiedMap.delete(recordKey);
    recalculateStats();
    updatePendingChangesBar();
    renderParametroView();

    const displayVal = mod.type === 'boolean'
      ? (mod.val === 1 ? 'ACTIVO (1)' : 'INACTIVO (0)')
      : `"${mod.val}"`;

    showToast(`Parámetro "${param.nombre}" guardado como ${displayVal} en MySQL`, 'success');
  } catch (err) {
    showToast(`Error al guardar parámetro: ${err.message}`, 'error');
  }
};

// Guardar todos los cambios pendientes en MySQL
async function saveAllParamChanges() {
  if (state.parametro.modifiedMap.size === 0) return;

  const updates = [];
  state.parametro.modifiedMap.forEach(mod => {
    const item = {
      id: mod.id,
      terminal_id: mod.terminal_id
    };
    if (mod.type === 'string') {
      item.valorString = mod.val;
    } else {
      item.valorEntero = mod.val;
    }
    updates.push(item);
  });

  try {
    const res = await fetch('/api/parametros/guardar-lote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    // Actualizar todos los valores originales en memoria
    updates.forEach(u => {
      const p = findParametro(u.id, u.terminal_id);
      if (p) {
        if (u.valorString !== undefined) p.valorString = u.valorString;
        if (u.valorEntero !== undefined) p.valorEntero = u.valorEntero;
      }
    });

    const count = updates.length;
    state.parametro.modifiedMap.clear();

    recalculateStats();
    updatePendingChangesBar();
    renderParametroView();

    showToast(`✓ ${count} parámetros guardados exitosamente en la base de datos`, 'success');
  } catch (err) {
    showToast(`Error al guardar cambios en lote: ${err.message}`, 'error');
  }
}

function discardAllParamChanges() {
  state.parametro.modifiedMap.clear();
  updatePendingChangesBar();
  renderParametroView();
  showToast('Modificaciones pendientes descartadas', 'info');
}

function updatePendingChangesBar() {
  const count = state.parametro.modifiedMap.size;
  if (count > 0) {
    dom.pendingChangesBar.style.display = 'flex';
    dom.pendingChangesCount.textContent = `${count} parámetro${count > 1 ? 's' : ''} modificado${count > 1 ? 's' : ''}`;
  } else {
    dom.pendingChangesBar.style.display = 'none';
  }
}

function recalculateStats() {
  const booleanos = state.parametro.data.filter(p => p.esBooleano === 1);
  const activos = booleanos.filter(p => p.valorEntero === 1).length;
  const inactivos = booleanos.filter(p => p.valorEntero === 0).length;
  const textos = state.parametro.data.length - booleanos.length;

  dom.valParamActivos.textContent = activos;
  dom.valParamInactivos.textContent = inactivos;
  dom.valParamTextos.textContent = textos;
}

window.inspectParametro = function(id) {
  const param = state.parametro.data.find(p => p.id === id);
  if (!param) return;

  const detailObj = {
    id: param.id,
    nombre: param.nombre,
    esBooleano: param.esBooleano === 1,
    valorEntero: param.valorEntero,
    valorString: param.valorString,
    grupo_id: param.grupo_id,
    grupo_nombre: param.grupo_nombre,
    terminal_id: param.terminal_id,
    version: param.version,
    modificado_pendiente: state.parametro.modifiedMap.has(getParamRecordKey(param))
  };

  openJsonModal(`Parámetro: ${param.nombre}`, `Tabla: parametro • ID: ${param.id}`, detailObj);
};

export function exportParametrosJson() {
  openJsonModal(
    `Tabla: parametro (${state.parametro.data.length} registros)`,
    'pos_contifico @ MySQL 5.7',
    state.parametro.data
  );
}
