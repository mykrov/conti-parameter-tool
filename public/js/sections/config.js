/**
 * Sección pos_configuracion: metadatos, KPIs, render de tarjetas/tabla y export.
 */
import { state } from '../core/state.js';
import { dom } from '../core/dom.js';
import { escapeHtml, escapeString, formatDate } from '../core/utils.js';
import { openJsonModal } from '../core/ui.js';

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

export function setupEventListenersConfig() {
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

export async function fetchPosConfig() {
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

export function exportConfigJson() {
  const conf = state.config.data[state.config.selectedIndex];
  if (!conf) return;
  openJsonModal(
    `Registro: pos_configuracion (ID: ${conf.id})`,
    `Terminal: #${conf.terminal_id} - ${conf.terminal_nombre_comercial || ''}`,
    conf
  );
}
