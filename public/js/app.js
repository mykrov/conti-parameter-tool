/**
 * POS Config & Parámetros - Manager & Monitor Web
 * Soporte dual: pos_configuracion (30 parámetros) y parametro (275 parámetros con switches e inputs editables)
 */

// Metadatos para pos_configuracion
const PARAM_METADATA_CONFIG = {
  id: { label: 'ID de Configuración', desc: 'Clave primaria del registro.', category: 'secuencias' },
  terminal_id: { label: 'ID de Terminal', desc: 'Terminal POS asignado.', category: 'secuencias' },
  secuencia_doc: { label: 'Secuencia Documento', desc: 'Cadena completa de secuencia fiscal.', category: 'secuencias' },
  sec_actual: { label: 'Secuencia Actual', desc: 'Número actual en curso de emisión.', category: 'secuencias' },
  sec_inicio: { label: 'Secuencia Inicial', desc: 'Rango numérico inferior autorizado.', category: 'secuencias' },
  sec_final: { label: 'Secuencia Final', desc: 'Límite numérico superior autorizado.', category: 'secuencias' },
  tipo_doc: { label: 'Tipo de Documento', desc: 'Tipo de comprobante fiscal (F = Factura).', category: 'secuencias' },
  codigo_establecimiento: { label: 'Establecimiento', desc: 'Código de 3 dígitos del establecimiento.', category: 'secuencias' },
  pto_emision: { label: 'Punto de Emisión', desc: 'Código de 3 dígitos de la caja.', category: 'secuencias' },
  secuencial: { label: 'Prefijo Secuencial', desc: 'Formato base del secuencial.', category: 'secuencias' },
  autorizacion: { label: 'Número Autorización', desc: 'Clave de autorización del SRI.', category: 'autorizaciones' },
  autorizacion_fechavencimiento: { label: 'Fecha Vencimiento', desc: 'Límite de caducidad SRI.', category: 'autorizaciones' },
  porcentaje_iva: { label: 'Tarifa IVA (%)', desc: 'Porcentaje de IVA aplicado.', category: 'impuestos' },
  activar_iva_dna: { label: 'Activar IVA DNA', desc: 'Tratamiento especial de IVA DNA.', category: 'impuestos' },
  sec_actual_dna: { label: 'Secuencia Actual DNA', desc: 'Contador de transacciones DNA.', category: 'impuestos' },
  activa: { label: 'Configuración Activa', desc: 'Habilita emisión en el POS.', category: 'flags' },
  predeterminada: { label: 'Serie Predeterminada', desc: 'Configuración por defecto.', category: 'flags' },
  stock: { label: 'Validar Stock', desc: 'Verifica inventario antes de facturar.', category: 'flags' },
  sin_cobro: { label: 'Permitir Sin Cobro', desc: 'Despacho sin cobro previo.', category: 'flags' },
  servicio: { label: 'Servicio / Propina', desc: 'Cobro de porcentaje de servicio.', category: 'flags' },
  activar_secuencia: { label: 'Incremento Secuencia', desc: 'Autoincremento tras cada emisión.', category: 'flags' },
  secuencia_imprimir: { label: 'Imprimir Secuencia', desc: 'Incluye número en ticket.', category: 'flags' },
  secuencia_nota_credito: { label: 'Secuencia NC', desc: 'Serie para Notas de Crédito.', category: 'guias_notas' },
  sec_inicio_nota: { label: 'Secuencia Inicial NC', desc: 'Rango inicial de NC.', category: 'guias_notas' },
  sec_actual_nota: { label: 'Secuencia Actual NC', desc: 'Número actual de NC.', category: 'guias_notas' },
  sec_actual_codigo: { label: 'Secuencia Código', desc: 'Contador de código interno.', category: 'guias_notas' },
  codigo_guia_establecimiento: { label: 'Establecimiento Guía', desc: 'Establecimiento para Guías.', category: 'guias_notas' },
  pto_guia_emision: { label: 'Punto Emisión Guía', desc: 'Punto de emisión para Guías.', category: 'guias_notas' },
  sec_actual_guia: { label: 'Secuencia Actual Guía', desc: 'Contador de Guías de Remisión.', category: 'guias_notas' },
  secuencia_guia_remision: { label: 'Secuencia Guía Remisión', desc: 'Serie completa para Guías.', category: 'guias_notas' }
};

const CATEGORIES_CONFIG = {
  secuencias: { title: 'Secuencias y Facturación', icon: '📝' },
  autorizaciones: { title: 'Autorizaciones SRI', icon: '🛡️' },
  flags: { title: 'Flags y Comportamiento', icon: '⚙️' },
  impuestos: { title: 'Impuestos y Tarifas', icon: '💰' },
  guias_notas: { title: 'Guías de Remisión y Notas de Crédito', icon: '📦' }
};

// ==========================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================
const state = {
  activeTable: 'pos_configuracion', // 'pos_configuracion' | 'parametro'

  // Estado pos_configuracion
  config: {
    columns: [],
    data: [],
    selectedIndex: 0,
    currentView: 'cards',
    searchTerm: '',
    selectedCategory: 'all'
  },

  // Estado parametro
  parametro: {
    data: [],
    stats: {},
    currentView: 'cards',
    searchTerm: '',
    selectedSort: 'nombre_asc',
    selectedType: 'all', // 'all' | 'booleano' | 'texto' | 'modificados'
    modifiedMap: new Map() // Map<recordKey, { type: 'boolean'|'string'|'int', val: any, terminal_id: any }>
  }
};

// Elementos DOM
const dom = {
  // Tabs navegación superior
  navTabPosConfig: document.getElementById('navTabPosConfig'),
  navTabParametro: document.getElementById('navTabParametro'),
  badgeCountConfig: document.getElementById('badgeCountConfig'),
  badgeCountParam: document.getElementById('badgeCountParam'),

  // Secciones
  sectionPosConfig: document.getElementById('sectionPosConfig'),
  sectionParametro: document.getElementById('sectionParametro'),

  // Header / Metas
  dbStatusPill: document.getElementById('dbStatusPill'),
  metaHost: document.getElementById('metaHost'),
  metaDb: document.getElementById('metaDb'),
  metaVersion: document.getElementById('metaVersion'),
  metaLatency: document.getElementById('metaLatency'),
  metaTables: document.getElementById('metaTables'),
  btnRefresh: document.getElementById('btnRefresh'),
  btnExportJson: document.getElementById('btnExportJson'),

  // Estados de carga / error
  loadingState: document.getElementById('loadingState'),
  loadingMessage: document.getElementById('loadingMessage'),
  errorState: document.getElementById('errorState'),
  errorTitle: document.getElementById('errorTitle'),
  errorMessage: document.getElementById('errorMessage'),
  btnRetry: document.getElementById('btnRetry'),

  // Controles pos_configuracion
  valTerminalName: document.getElementById('valTerminalName'),
  valTerminalSub: document.getElementById('valTerminalSub'),
  valSecuenciaDoc: document.getElementById('valSecuenciaDoc'),
  valSecuenciaRango: document.getElementById('valSecuenciaRango'),
  valAutorizacion: document.getElementById('valAutorizacion'),
  valVencimiento: document.getElementById('valVencimiento'),
  valIva: document.getElementById('valIva'),
  valPuntoEmision: document.getElementById('valPuntoEmision'),
  searchInput: document.getElementById('searchInput'),
  btnClearSearch: document.getElementById('btnClearSearch'),
  categoryFilter: document.getElementById('categoryFilter'),
  btnViewCards: document.getElementById('btnViewCards'),
  btnViewTable: document.getElementById('btnViewTable'),
  cardsView: document.getElementById('cardsView'),
  tableView: document.getElementById('tableView'),
  paramsTableBody: document.getElementById('paramsTableBody'),
  recordSelectorContainer: document.getElementById('recordSelectorContainer'),
  recordTabs: document.getElementById('recordTabs'),

  // Controles parametro
  valParamTotal: document.getElementById('valParamTotal'),
  valParamActivos: document.getElementById('valParamActivos'),
  valParamInactivos: document.getElementById('valParamInactivos'),
  valParamTextos: document.getElementById('valParamTextos'),
  paramSearchInput: document.getElementById('paramSearchInput'),
  btnParamClearSearch: document.getElementById('btnParamClearSearch'),
  paramSortFilter: document.getElementById('paramSortFilter'),
  paramTypeFilter: document.getElementById('paramTypeFilter'),
  btnParamViewCards: document.getElementById('btnParamViewCards'),
  btnParamViewTable: document.getElementById('btnParamViewTable'),
  paramCardsView: document.getElementById('paramCardsView'),
  paramTableView: document.getElementById('paramTableView'),
  paramTableBody: document.getElementById('paramTableBody'),

  // Barra de cambios pendientes
  pendingChangesBar: document.getElementById('pendingChangesBar'),
  pendingChangesCount: document.getElementById('pendingChangesCount'),
  btnDiscardAll: document.getElementById('btnDiscardAll'),
  btnSaveAll: document.getElementById('btnSaveAll'),

  // Modal & Toast
  detailModal: document.getElementById('detailModal'),
  modalTitle: document.getElementById('modalTitle'),
  modalSubtitle: document.getElementById('modalSubtitle'),
  modalJsonContent: document.getElementById('modalJsonContent'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  btnCopyJson: document.getElementById('btnCopyJson'),
  toastContainer: document.getElementById('toastContainer')
};

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupEventListenersConfig();
  setupEventListenersParam();
  setupGlobalActions();

  // Carga inicial
  checkDbStatus();
  fetchPosConfig();
  fetchParametros();
});

// ==========================================
// 1. NAVEGACIÓN ENTRE TABLAS
// ==========================================
function setupNavigation() {
  dom.navTabPosConfig.addEventListener('click', () => switchTable('pos_configuracion'));
  dom.navTabParametro.addEventListener('click', () => switchTable('parametro'));
}

function switchTable(tableName) {
  state.activeTable = tableName;
  if (tableName === 'pos_configuracion') {
    dom.navTabPosConfig.classList.add('active');
    dom.navTabParametro.classList.remove('active');
    dom.sectionPosConfig.style.display = 'block';
    dom.sectionParametro.style.display = 'none';
  } else {
    dom.navTabParametro.classList.add('active');
    dom.navTabPosConfig.classList.remove('active');
    dom.sectionPosConfig.style.display = 'none';
    dom.sectionParametro.style.display = 'block';
    renderParametroView();
  }
}

// ==========================================
// 2. ESTADO GENERAL Y CONEXIÓN
// ==========================================
async function checkDbStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.status === 'connected') {
      dom.dbStatusPill.className = 'status-pill status-online';
      dom.dbStatusPill.innerHTML = `
        <span class="status-dot"></span>
        <span class="status-text">MySQL Conectado (${data.latencyMs} ms)</span>
      `;
      dom.metaHost.textContent = `${data.host}:${data.port}`;
      dom.metaDb.textContent = data.database;
      dom.metaVersion.textContent = `MySQL ${data.version}`;
      dom.metaLatency.textContent = `${data.latencyMs} ms`;
      dom.metaTables.textContent = `${data.totalTables}`;
    } else {
      throw new Error(data.message || 'Error de conexión');
    }
  } catch (err) {
    dom.dbStatusPill.className = 'status-pill status-error';
    dom.dbStatusPill.innerHTML = `
      <span class="status-dot"></span>
      <span class="status-text">Error Conexión</span>
    `;
    dom.metaLatency.textContent = 'Desconectado';
  }
}

function setupGlobalActions() {
  dom.btnRefresh.addEventListener('click', () => {
    showToast('Actualizando datos desde MySQL...', 'info');
    checkDbStatus();
    if (state.activeTable === 'pos_configuracion') {
      fetchPosConfig();
    } else {
      fetchParametros();
    }
  });

  dom.btnRetry.addEventListener('click', () => {
    checkDbStatus();
    fetchPosConfig();
    fetchParametros();
  });

  dom.btnExportJson.addEventListener('click', () => {
    if (state.activeTable === 'pos_configuracion') {
      exportConfigJson();
    } else {
      exportParametrosJson();
    }
  });

  dom.btnCloseModal.addEventListener('click', closeModal);
  dom.detailModal.addEventListener('click', (e) => {
    if (e.target === dom.detailModal) closeModal();
  });

  dom.btnCopyJson.addEventListener('click', () => {
    const jsonStr = dom.modalJsonContent.textContent;
    navigator.clipboard.writeText(jsonStr).then(() => {
      showToast('JSON copiado al portapapeles', 'success');
    }).catch(() => {
      showToast('Error al copiar JSON', 'error');
    });
  });
}

// ==========================================
// 3. TABLA: pos_configuracion
// ==========================================
function setupEventListenersConfig() {
  dom.searchInput.addEventListener('input', (e) => {
    state.config.searchTerm = e.target.value.toLowerCase().trim();
    dom.btnClearSearch.style.display = state.config.searchTerm ? 'inline-flex' : 'none';
    renderConfigView();
  });

  dom.btnClearSearch.addEventListener('click', () => {
    dom.searchInput.value = '';
    state.config.searchTerm = '';
    dom.btnClearSearch.style.display = 'none';
    renderConfigView();
  });

  dom.categoryFilter.addEventListener('change', (e) => {
    state.config.selectedCategory = e.target.value;
    renderConfigView();
  });

  dom.btnViewCards.addEventListener('click', () => {
    state.config.currentView = 'cards';
    dom.btnViewCards.classList.add('active');
    dom.btnViewTable.classList.remove('active');
    dom.cardsView.style.display = 'flex';
    dom.tableView.style.display = 'none';
  });

  dom.btnViewTable.addEventListener('click', () => {
    state.config.currentView = 'table';
    dom.btnViewTable.classList.add('active');
    dom.btnViewCards.classList.remove('active');
    dom.cardsView.style.display = 'none';
    dom.tableView.style.display = 'block';
  });
}

async function fetchPosConfig() {
  try {
    const res = await fetch('/api/configuraciones');
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    state.config.columns = result.columns || [];
    state.config.data = result.data || [];
    state.config.selectedIndex = 0;
    dom.badgeCountConfig.textContent = state.config.columns.length;

    if (state.config.data.length > 0) {
      updateKpisConfig();
      renderConfigView();
    }
  } catch (err) {
    console.error('Error pos_configuracion:', err);
  }
}

function updateKpisConfig() {
  const conf = state.config.data[state.config.selectedIndex];
  if (!conf) return;

  const termName = conf.terminal_nombre_comercial || conf.terminal_razon_social || `Terminal #${conf.terminal_id}`;
  dom.valTerminalName.textContent = termName;
  dom.valTerminalSub.textContent = `ID: ${conf.terminal_id} | Maq: ${conf.terminal_nombre_maquina || 'N/A'}`;

  dom.valSecuenciaDoc.textContent = conf.secuencia_doc || `${conf.codigo_establecimiento}-${conf.pto_emision}`;
  dom.valSecuenciaRango.textContent = `Actual: ${conf.sec_actual} (Rango: ${conf.sec_inicio} - ${conf.sec_final})`;

  dom.valAutorizacion.textContent = conf.autorizacion || 'Sin Autorización';
  const fechaVenc = conf.autorizacion_fechavencimiento ? formatDate(conf.autorizacion_fechavencimiento) : 'No definida';
  dom.valVencimiento.textContent = `Vence: ${fechaVenc}`;

  dom.valIva.textContent = `${parseFloat(conf.porcentaje_iva || 0).toFixed(2)}%`;
  dom.valPuntoEmision.textContent = `Estb: ${conf.codigo_establecimiento} | Pto: ${conf.pto_emision}`;
}

function renderConfigView() {
  const conf = state.config.data[state.config.selectedIndex];
  if (!conf) return;

  const paramFields = state.config.columns.map(c => c.name);

  const filteredFields = paramFields.filter(field => {
    const meta = PARAM_METADATA_CONFIG[field] || { label: field, desc: '', category: 'otros' };
    const val = conf[field] !== null && conf[field] !== undefined ? String(conf[field]) : 'null';

    if (state.config.selectedCategory !== 'all' && meta.category !== state.config.selectedCategory) {
      return false;
    }

    if (state.config.searchTerm) {
      const matchName = field.toLowerCase().includes(state.config.searchTerm);
      const matchLabel = meta.label.toLowerCase().includes(state.config.searchTerm);
      const matchVal = val.toLowerCase().includes(state.config.searchTerm);
      return matchName || matchLabel || matchVal;
    }

    return true;
  });

  renderConfigCards(filteredFields, conf);
  renderConfigTable(filteredFields, conf);
}

function renderConfigCards(fields, conf) {
  dom.cardsView.innerHTML = '';
  if (fields.length === 0) {
    dom.cardsView.innerHTML = `<div class="state-container"><p>No se encontraron parámetros que coincidan.</p></div>`;
    return;
  }

  const grouped = {};
  fields.forEach(field => {
    const meta = PARAM_METADATA_CONFIG[field] || { label: field, category: 'otros' };
    const catKey = meta.category || 'otros';
    if (!grouped[catKey]) grouped[catKey] = [];
    grouped[catKey].push(field);
  });

  Object.keys(grouped).forEach(catKey => {
    const catInfo = CATEGORIES_CONFIG[catKey] || { title: 'Otros Parámetros', icon: '📌' };
    const catBlock = document.createElement('div');
    catBlock.className = 'category-block';
    catBlock.innerHTML = `
      <div class="category-header">
        <div class="category-title">
          <span>${catInfo.icon}</span>
          <h3>${catInfo.title}</h3>
        </div>
        <span class="category-count">${grouped[catKey].length}</span>
      </div>
      <div class="param-cards-grid" id="grid_cfg_${catKey}"></div>
    `;

    dom.cardsView.appendChild(catBlock);
    const grid = catBlock.querySelector(`#grid_cfg_${catKey}`);

    grouped[catKey].forEach(field => {
      const colMeta = state.config.columns.find(c => c.name === field) || {};
      const meta = PARAM_METADATA_CONFIG[field] || { label: field };
      const rawVal = conf[field];
      const valHtml = formatValueDisplay(field, rawVal, colMeta.dataType);

      const card = document.createElement('div');
      card.className = 'param-card';
      card.innerHTML = `
        <div class="param-card-top">
          <div>
            <span class="param-field-name">${field}</span>
            <div class="param-desc">${meta.label}</div>
          </div>
          <span class="param-sql-type">${colMeta.fullType || colMeta.dataType || 'sql'}</span>
        </div>
        <div class="param-value-container">
          <div class="param-value-box-wrapper">${valHtml}</div>
          <div class="param-actions">
            <button class="btn-icon-action" title="Copiar valor" onclick="copyValue('${escapeString(rawVal)}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  });
}

function renderConfigTable(fields, conf) {
  dom.paramsTableBody.innerHTML = '';
  fields.forEach((field, idx) => {
    const colMeta = state.config.columns.find(c => c.name === field) || {};
    const meta = PARAM_METADATA_CONFIG[field] || { label: field };
    const rawVal = conf[field];
    const valHtml = formatValueDisplay(field, rawVal, colMeta.dataType);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color: var(--text-muted); font-family: var(--font-mono);">${idx + 1}</td>
      <td>
        <div class="col-field-name">${field}</div>
        <div class="col-field-desc">${meta.label}</div>
      </td>
      <td class="col-data-type">${colMeta.fullType || colMeta.dataType || 'text'}</td>
      <td>${valHtml}</td>
      <td>
        <span class="switch-label-tag ${colMeta.isNullable === 'YES' ? 'tag-on' : 'tag-off'}">
          ${colMeta.isNullable === 'YES' ? 'SÍ' : 'NO'}
        </span>
      </td>
      <td>
        <button class="btn-icon-action" title="Copiar valor" onclick="copyValue('${escapeString(rawVal)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </td>
    `;
    dom.paramsTableBody.appendChild(tr);
  });
}

// ==========================================
// 4. TABLA: parametro (UNIFICADO, SIN SEGMENTAR)
// ==========================================
function setupEventListenersParam() {
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

async function fetchParametros() {
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
function renderParametroView() {
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

// ==========================================
// 5. INTERACTIVIDAD Y GUARDADO (SWITCHES Y TEXTO)
// ==========================================

// Switch Booleano
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

  dom.modalTitle.textContent = `Parámetro: ${param.nombre}`;
  dom.modalSubtitle.textContent = `Tabla: parametro &bull; ID: ${param.id}`;

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

  dom.modalJsonContent.textContent = JSON.stringify(detailObj, null, 2);
  dom.detailModal.style.display = 'flex';
};

// ==========================================
// 6. FORMATEADORES VISUALES
// ==========================================
function formatValueDisplay(field, val, dataType) {
  if (val === null || val === undefined) {
    return `<span class="badge-null">NULL</span>`;
  }

  const isBoolField = [
    'activa', 'sin_cobro', 'stock', 'servicio',
    'activar_secuencia', 'activar_iva_dna', 'predeterminada', 'secuencia_imprimir'
  ].includes(field);

  if (isBoolField || (dataType === 'tinyint' && (val === 0 || val === 1 || val === '0' || val === '1'))) {
    const isTrue = Number(val) === 1;
    return `
      <div class="toggle-switch-wrapper">
        <div class="toggle-switch ${isTrue ? 'switch-on' : 'switch-off'}">
          <span class="switch-handle"></span>
        </div>
        <span class="switch-label-tag ${isTrue ? 'tag-on' : 'tag-off'}">
          ${isTrue ? 'ACTIVO' : 'INACTIVO'}
        </span>
      </div>
    `;
  }

  if (field.includes('fecha') && val) {
    return `
      <div class="field-date-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span>${formatDate(val)}</span>
      </div>
    `;
  }

  if (field === 'porcentaje_iva') {
    return `
      <div class="field-number-box" style="border-color: rgba(168, 85, 247, 0.3); color: #c084fc;">
        <span>${parseFloat(val).toFixed(2)}% IVA</span>
      </div>
    `;
  }

  const isTextField = [
    'secuencia_doc', 'autorizacion', 'tipo_doc', 'codigo_establecimiento',
    'pto_emision', 'secuencial', 'secuencia_nota_credito', 'codigo_guia_establecimiento',
    'pto_guia_emision', 'secuencia_guia_remision'
  ].includes(field) || dataType === 'char' || dataType === 'varchar';

  if (isTextField) {
    const textStr = String(val).trim();
    if (textStr === '') {
      return `<div class="field-text-box"><span class="field-text-placeholder">(vacío)</span></div>`;
    }
    return `
      <div class="field-text-box" title="Texto: ${escapeHtml(textStr)}">
        <span class="field-text-content">${escapeHtml(textStr)}</span>
      </div>
    `;
  }

  return `
    <div class="field-number-box">
      <span>${escapeHtml(String(val))}</span>
    </div>
  `;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split('T')[0];
}

function exportConfigJson() {
  const conf = state.config.data[state.config.selectedIndex];
  if (!conf) return;
  dom.modalTitle.textContent = `Registro: pos_configuracion (ID: ${conf.id})`;
  dom.modalSubtitle.textContent = `Terminal: #${conf.terminal_id} - ${conf.terminal_nombre_comercial || ''}`;
  dom.modalJsonContent.textContent = JSON.stringify(conf, null, 2);
  dom.detailModal.style.display = 'flex';
}

function exportParametrosJson() {
  dom.modalTitle.textContent = `Tabla: parametro (${state.parametro.data.length} registros)`;
  dom.modalSubtitle.textContent = `pos_contifico @ MySQL 5.7`;
  dom.modalJsonContent.textContent = JSON.stringify(state.parametro.data, null, 2);
  dom.detailModal.style.display = 'flex';
}

function closeModal() {
  dom.detailModal.style.display = 'none';
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ')}</span>
    <span>${escapeHtml(message)}</span>
  `;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeString(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

window.copyValue = function(val) {
  if (val === 'null' || val === 'undefined') val = '';
  navigator.clipboard.writeText(val).then(() => {
    showToast(`Copiado: "${val}"`, 'success');
  }).catch(() => {
    showToast('Error al copiar', 'error');
  });
};
