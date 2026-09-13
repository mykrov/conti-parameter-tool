/**
 * Sección facturas: últimas 20 facturas de factura_cabecera con su detalle
 * de factura_detalle y el nombre del producto desde inventario_producto.
 */
import { state } from '../core/state.js';
import { dom } from '../core/dom.js';
import { escapeHtml, formatDateTime, formatMoney, formatPercent, formatQty } from '../core/utils.js';
import { showToast, openJsonModal } from '../core/ui.js';
import { compararFacturas } from './compare.js';

export function setupEventListenersFacturas() {
  dom.facturasSearchInput.addEventListener('input', (e) => {
    state.facturas.searchTerm = e.target.value.toLowerCase().trim();
    dom.btnFacturasClearSearch.style.display = state.facturas.searchTerm ? 'inline-flex' : 'none';
    renderFacturasView();
  });

  dom.btnFacturasClearSearch.addEventListener('click', () => {
    dom.facturasSearchInput.value = '';
    state.facturas.searchTerm = '';
    dom.btnFacturasClearSearch.style.display = 'none';
    renderFacturasView();
  });

  dom.facturasSortFilter.addEventListener('change', (e) => {
    state.facturas.sortMode = e.target.value;
    renderFacturasView();
  });

  dom.btnFacturasExpandAll.addEventListener('click', () => {
    getFilteredFacturas().forEach(f => state.facturas.expanded.add(f.idfactura_cabecera));
    applyFacturasExpansion();
  });

  dom.btnFacturasCollapseAll.addEventListener('click', () => {
    state.facturas.expanded.clear();
    applyFacturasExpansion();
  });

  dom.btnFacturasCompare.addEventListener('click', openCompare);
  dom.btnCloseCompareModal.addEventListener('click', closeCompareModal);
  dom.compareModal.addEventListener('click', (e) => {
    if (e.target === dom.compareModal) closeCompareModal();
  });

  // Modal de registro completo (factura_detalle)
  dom.btnCloseRecordModal.addEventListener('click', closeRecordModal);
  dom.recordModal.addEventListener('click', (e) => {
    if (e.target === dom.recordModal) closeRecordModal();
  });

  dom.btnCopyRecordJson.addEventListener('click', () => {
    if (!state.facturas.selectedDetalle) return;
    const jsonStr = JSON.stringify(state.facturas.selectedDetalle, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      showToast('JSON del detalle copiado al portapapeles', 'success');
    }).catch(() => {
      showToast('Error al copiar JSON', 'error');
    });
  });
}

export async function fetchFacturas() {
  try {
    const res = await fetch('/api/facturas');
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    state.facturas.data = result.data || [];
    state.facturas.expanded.clear();
    state.facturas.compare.clear();
    dom.badgeCountFacturas.textContent = state.facturas.data.length;

    updateFacturasKpis();
    renderFacturasView();
    updateCompareButton();
  } catch (err) {
    console.error('Error facturas:', err);
    dom.facturasView.innerHTML = `
      <div class="state-container state-error">
        <p>No se pudieron cargar las facturas: ${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

function updateFacturasKpis() {
  const facturas = state.facturas.data;
  const totalMonto = facturas.reduce((acc, f) => acc + Number(f.total || 0), 0);
  const totalItems = facturas.reduce((acc, f) => acc + (f.total_items || 0), 0);
  const promedio = facturas.length > 0 ? totalMonto / facturas.length : 0;

  dom.valFactTotal.textContent = facturas.length;
  dom.valFactMonto.textContent = formatMoney(totalMonto);
  dom.valFactItems.textContent = totalItems;
  dom.valFactPromedio.textContent = formatMoney(promedio);
}

function getFilteredFacturas() {
  const term = state.facturas.searchTerm;
  let list = state.facturas.data.filter(factura => {
    if (!term) return true;
    const haystack = [
      factura.documento,
      String(factura.numero_documento ?? ''),
      String(factura.idfactura_cabecera ?? ''),
      String(factura.idCliente ?? ''),
      factura.terminal_nombre,
      factura.descripcion,
      factura.autorizacion,
      ...(factura.detalles || []).map(d => `${d.id_producto ?? ''} ${d.producto_nombre ?? ''} ${d.descripcion ?? ''}`),
      ...(factura.pagos || []).map(p => `${p.forma_pago ?? ''} ${p.idforma_pagos ?? ''} ${p.numero_comprobante ?? ''} ${p.banco ?? ''}`),
      factura.msg_error, factura.cod_error, factura.id_integracion,
      getTipoLabel(factura.tipo)
    ].join(' ').toLowerCase();
    return haystack.includes(term);
  });

  const sortMode = state.facturas.sortMode;
  list = list.slice().sort((a, b) => {
    if (sortMode === 'fecha_asc') return new Date(a.fecha_creacion || a.fecha_emision || 0) - new Date(b.fecha_creacion || b.fecha_emision || 0);
    if (sortMode === 'total_desc') return Number(b.total || 0) - Number(a.total || 0);
    if (sortMode === 'total_asc') return Number(a.total || 0) - Number(b.total || 0);
    if (sortMode === 'documento_asc') return String(a.documento || '').localeCompare(String(b.documento || ''));
    // fecha_desc (por defecto)
    return new Date(b.fecha_creacion || b.fecha_emision || 0) - new Date(a.fecha_creacion || a.fecha_emision || 0);
  });

  return list;
}

export function renderFacturasView() {
  if (!dom.facturasView) return;

  const facturas = getFilteredFacturas();
  dom.facturasView.innerHTML = '';

  if (facturas.length === 0) {
    dom.facturasView.innerHTML = `
      <div class="state-container">
        <p>${state.facturas.data.length === 0
          ? 'No se encontraron facturas en factura_cabecera.'
          : 'No hay facturas que coincidan con los filtros aplicados.'}</p>
      </div>
    `;
    return;
  }

  facturas.forEach(factura => {
    dom.facturasView.appendChild(buildFacturaCard(factura));
  });

  applyFacturasExpansion();
  updateCompareButton();
}

// Estado de sincronización a la nube según campos de factura_cabecera:
// Subido = subio=1 + id_integracion poblado | Error = msg_error/cod_error con texto
// Guardado = sin id_integracion e imprimio=0 (nunca se intentó sincronizar)
function getSyncEstado(factura) {
  const subio = Number(factura.subio || 0) === 1;
  const integracion = String(factura.id_integracion || '').trim();
  const msgError = String(factura.msg_error || '').trim();
  const codError = String(factura.cod_error || '').trim();
  const imprimio = Number(factura.imprimio || 0) === 1;

  if (subio && integracion !== '') {
    return {
      clase: 'sync-subido',
      texto: 'Subido',
      tooltip: `Sincronizado en la nube • id_integracion: ${integracion}`,
      icono: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="16 16 12 12 8 16"></polyline>
        <line x1="12" y1="12" x2="12" y2="21"></line>
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path>
      </svg>`
    };
  }

  if (msgError !== '' || codError !== '') {
    const detalle = [codError !== '' ? `Código ${codError}` : '', msgError].filter(Boolean).join(' • ');
    return {
      clase: 'sync-error',
      texto: 'Error',
      tooltip: `Error de sincronización: ${detalle}`,
      icono: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>`
    };
  }

  return {
    clase: 'sync-guardado',
    texto: 'Guardado',
    tooltip: imprimio
      ? 'Solo guardado local • imprimio=1 pero sin sincronizar a la nube'
      : 'Solo guardado local • aún no se ha intentado sincronizar',
    icono: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>`
  };
}

// Letra de factura_cabecera.tipo -> significado (id_tipoDocumento equivalente)
const TIPO_LABELS = {
  F: 'Factura',
  N: 'Nota de Venta',
  D: 'DNA',
  P: 'Prefactura',
  C: 'Nota de Crédito'
};

const TIPO_DOC_IDS = { F: 1, N: 2, D: 3, P: 5, C: 4 };

function getTipoLabel(tipo) {
  const letra = String(tipo || '').trim().toUpperCase();
  return TIPO_LABELS[letra] || letra;
}

function buildFacturaCard(factura) {
  const id = factura.idfactura_cabecera;
  const card = document.createElement('div');
  card.className = 'factura-card' + (state.facturas.compare.has(id) ? ' is-compare-selected' : '');
  card.id = `factura_card_${id}`;

  const estado = String(factura.estado || '').trim();
  const estadoClase = estado ? `estado-${estado.toLowerCase().charAt(0)}` : 'estado-otro';
  const fecha = formatDateTime(factura.fecha_emision || factura.fecha_creacion);
  const nPagos = factura.total_pagos ?? (factura.pagos || []).length;
  const pagoClase = nPagos > 0 ? 'pago-ok' : 'pago-none';
  const pagoTexto = nPagos > 0 ? `${nPagos} pago${nPagos === 1 ? '' : 's'}` : 'Sin pago';

  // Estado de sincronización a la nube (campos de factura_cabecera)
  const sync = getSyncEstado(factura);

  card.innerHTML = `
    <div class="factura-card-header" onclick="toggleFacturaDetalle(${id})">
      <input type="checkbox" class="factura-check" title="Seleccionar para comparar integridad"
             ${state.facturas.compare.has(id) ? 'checked' : ''}
             onclick="event.stopPropagation(); toggleFacturaCompare(${id}, this)">
      <div class="factura-doc-block">
        <span class="factura-doc">${escapeHtml(factura.documento || `#${id}`)}</span>
        ${factura.tipo ? `<span class="factura-tipo-badge" title="Tipo '${escapeHtml(factura.tipo)}' • id_tipoDocumento ${TIPO_DOC_IDS[String(factura.tipo).trim().toUpperCase()] ?? factura.id_tipoDocumento ?? '-'}">${escapeHtml(getTipoLabel(factura.tipo))}</span>` : ''}
        ${estado ? `<span class="factura-estado-badge ${estadoClase}">${escapeHtml(estado)}</span>` : ''}
      </div>

      <div class="factura-header-meta">
        <span class="factura-meta-item" title="Terminal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="13" rx="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          ${escapeHtml(factura.terminal_nombre || `Terminal ${factura.terminal_id ?? 'N/A'}`)}
        </span>
        <span class="factura-meta-item" title="Cliente">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Cliente: ${escapeHtml(factura.idCliente ?? 'N/A')}
        </span>
        <span class="factura-meta-item" title="Fecha de emisión">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          ${escapeHtml(fecha)}
        </span>
        <span class="factura-meta-item" title="Líneas de detalle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
          </svg>
          ${factura.total_items || 0} ítem${(factura.total_items || 0) === 1 ? '' : 's'}
        </span>
        <span class="factura-meta-item factura-pago-meta ${pagoClase}" title="Registros en forma_pagos (id_cabecera)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
          ${escapeHtml(pagoTexto)}
        </span>
        <span class="factura-meta-item factura-sync-meta ${sync.clase}" title="${escapeHtml(sync.tooltip)}">
          ${sync.icono}
          ${escapeHtml(sync.texto)}
        </span>
      </div>

      <div class="factura-header-total">
        <span class="factura-total-label">Total</span>
        <span class="factura-total-value">${formatMoney(factura.total)}</span>
      </div>

      <div class="factura-header-actions">
        <button class="btn-icon-action" title="Inspeccionar cabecera (JSON)"
                onclick="event.stopPropagation(); inspectFactura(${id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </button>
        <button class="btn-expand" title="Ver / ocultar detalle" onclick="event.stopPropagation(); toggleFacturaDetalle(${id})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <div class="factura-detalle-wrapper">
      ${buildFacturaDetalleHtml(factura)}
    </div>
  `;

  return card;
}

function buildFacturaDetalleHtml(factura) {
  const detalles = factura.detalles || [];
  const pagos = factura.pagos || [];

  const detalleHtml = detalles.length === 0
    ? `<div class="factura-detalle-empty">Esta factura no tiene registros relacionados en factura_detalle.</div>`
    : buildDetalleTableHtml(factura, detalles);

  return `${detalleHtml}${buildPagosHtml(factura)}`;
}

// Columnas de monto en forma_pagos que suman al pago (se excluye
// monto_recibido_efectivo porque es el efectivo entregado, no un cargo extra).
const PAGO_MONTO_COLS = [
  ['monto_efectivo', 'Efectivo'],
  ['monto_tarjeta', 'Tarjeta'],
  ['monto_transferencia', 'Transferencia'],
  ['monto_cheque', 'Cheque'],
  ['monto_retencion', 'Retención'],
  ['monto_giftcard', 'Giftcard'],
  ['monto_nota', 'Nota'],
  ['monto_domicilioya', 'DomicilioYa'],
  ['monto_glovo', 'Glovo'],
  ['monto_super_easy', 'SuperEasy'],
  ['monto_uber', 'Uber'],
  ['monto_rappi', 'Rappi'],
  ['monto_picker', 'Picker'],
  ['monto_otros_domicilios', 'Otros domicilios'],
  ['monto_fidelizacion', 'Fidelización'],
  ['monto_propina', 'Propina']
];

function pagoRowTotal(pago) {
  return PAGO_MONTO_COLS.reduce((acc, [col]) => acc + Number(pago[col] || 0), 0);
}

function buildPagosHtml(factura) {
  const pagos = factura.pagos || [];
  const totalPagado = pagos.reduce((acc, p) => acc + pagoRowTotal(p), 0);

  if (pagos.length === 0) {
    return `
      <div class="factura-pagos-block">
        <div class="factura-pagos-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
          Pagos registrados (0)
        </div>
        <div class="factura-detalle-empty">Sin registros en forma_pagos para este id_cabecera.</div>
      </div>
    `;
  }

  const filas = pagos.map((pago) => {
    const chips = PAGO_MONTO_COLS
      .filter(([col]) => Number(pago[col] || 0) > 0)
      .map(([col, label]) => `<span class="pago-chip">${escapeHtml(label)} ${formatMoney(pago[col])}</span>`)
      .join('');
    return `
      <tr>
        <td class="font-mono" style="color: var(--text-muted);">#${escapeHtml(pago.idforma_pagos ?? '-')}</td>
        <td><span class="factura-tipo-badge">${escapeHtml(pago.forma_pago || '-')}</span></td>
        <td><div class="pago-chips">${chips || '<span class="record-value-empty">(montos en cero)</span>'}</div></td>
        <td class="text-right font-mono" style="font-weight: 700; color: #34d399;">${formatMoney(pagoRowTotal(pago))}</td>
        <td class="font-mono" style="color: var(--text-secondary);">${escapeHtml(formatDateTime(pago.fecha_creacion))}</td>
        <td style="text-align: center;">
          <button class="btn-icon-action" title="Ver registro completo de forma_pagos"
                  onclick="event.stopPropagation(); inspectPago(${factura.idfactura_cabecera}, ${pago.idforma_pagos})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="factura-pagos-block">
      <div class="factura-pagos-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
        Pagos registrados (${pagos.length})
        <span class="factura-pagos-total">Total pagado: ${formatMoney(totalPagado)}</span>
      </div>
      <table class="data-table factura-detalle-table">
        <thead>
          <tr>
            <th style="width: 70px;">ID pago</th>
            <th style="width: 90px;">Forma</th>
            <th>Montos</th>
            <th style="width: 110px; text-align: right;">Total</th>
            <th style="width: 150px;">Fecha</th>
            <th style="width: 60px; text-align: center;">Cols.</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
}

function buildDetalleTableHtml(factura, detalles) {

  const filas = detalles.map((detalle, idx) => `
    <tr>
      <td style="color: var(--text-muted);">${idx + 1}</td>
      <td>
        <div class="col-field-name">${escapeHtml((detalle.producto_nombre || '').trim() || `Producto #${detalle.id_producto ?? '-'}`)}</div>
        <div class="col-field-desc">ID ${escapeHtml(detalle.id_producto ?? '-')}</div>
      </td>
      <td>${escapeHtml((detalle.descripcion || '').trim() || '-')}</td>
      <td class="text-right font-mono">${formatQty(detalle.cantidad)}</td>
      <td class="text-right font-mono">${formatMoney(detalle.precio)}</td>
      <td class="text-right font-mono">${formatMoney(detalle.valor_descuento)}</td>
      <td class="text-right font-mono">${formatPercent(detalle.porcentaje_iva)}</td>
      <td class="text-right font-mono">${formatMoney(detalle.total)}</td>
      <td style="text-align: center;">
        <button class="btn-icon-action" title="Ver todas las columnas de factura_detalle para este producto"
                onclick="event.stopPropagation(); inspectFacturaDetalle(${factura.idfactura_cabecera}, ${detalle.idfactura_detalle})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');

  const totalDetalle = detalles.reduce((acc, d) => acc + Number(d.total || 0), 0);

  return `
    <table class="data-table factura-detalle-table">
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th style="width: 210px;">Producto</th>
          <th>Descripción</th>
          <th style="width: 80px; text-align: right;">Cant.</th>
          <th style="width: 100px; text-align: right;">Precio</th>
          <th style="width: 100px; text-align: right;">Descuento</th>
          <th style="width: 80px; text-align: right;">IVA %</th>
          <th style="width: 110px; text-align: right;">Total</th>
          <th style="width: 60px; text-align: center;">Cols.</th>
        </tr>
      </thead>
      <tbody>
        ${filas}
        <tr>
          <td colspan="8" class="text-right" style="font-weight: 700; color: var(--text-secondary);">Subtotal detalle</td>
          <td class="text-right font-mono" style="font-weight: 700; color: #34d399;">${formatMoney(totalDetalle)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  `;
}

function applyFacturasExpansion() {
  document.querySelectorAll('.factura-card').forEach(card => {
    const id = Number(card.id.replace('factura_card_', ''));
    card.classList.toggle('expanded', state.facturas.expanded.has(id));
  });
}

window.toggleFacturaDetalle = function(id) {
  const card = document.getElementById(`factura_card_${id}`);
  if (!card) return;
  const isExpanded = card.classList.toggle('expanded');
  if (isExpanded) {
    state.facturas.expanded.add(id);
  } else {
    state.facturas.expanded.delete(id);
  }
};

window.inspectFactura = function(id) {
  const factura = state.facturas.data.find(f => f.idfactura_cabecera === id);
  if (!factura) return;

  openJsonModal(
    `Factura: ${factura.documento || `#${id}`}`,
    `Tabla: factura_cabecera • Detalle: ${factura.total_items || 0} líneas`,
    factura
  );
};

// Abre el modal con TODAS las columnas de factura_detalle para un producto
window.inspectFacturaDetalle = function(facturaId, detalleId) {
  const factura = state.facturas.data.find(f => f.idfactura_cabecera === facturaId);
  if (!factura) return;

  const detalle = (factura.detalles || []).find(d => d.idfactura_detalle === detalleId);
  if (!detalle) return;

  state.facturas.selectedDetalle = detalle;

  const producto = (detalle.producto_nombre || '').trim() || `Producto #${detalle.id_producto ?? '-'}`;
  dom.recordModalTitle.textContent = producto;
  dom.recordModalSubtitle.textContent =
    `factura_detalle • ID ${detalle.idfactura_detalle} • ${factura.documento || `Factura #${facturaId}`}`;

  dom.recordModalBody.innerHTML = Object.entries(detalle).map(([columna, valor]) => `
    <tr>
      <td>${escapeHtml(columna)}</td>
      <td><div class="record-value ${columna === 'producto_nombre' ? 'record-highlight' : ''}">${formatRecordValue(valor)}</div></td>
    </tr>
  `).join('');

  dom.recordModal.style.display = 'flex';
};

// Abre el modal con TODAS las columnas de forma_pagos para un pago
window.inspectPago = function(facturaId, pagoId) {
  const factura = state.facturas.data.find(f => f.idfactura_cabecera === facturaId);
  if (!factura) return;

  const pago = (factura.pagos || []).find(p => p.idforma_pagos === pagoId);
  if (!pago) return;

  openJsonModal(
    `Pago #${pagoId} • Forma ${pago.forma_pago || '-'}`,
    `Tabla: forma_pagos • id_cabecera ${facturaId} • ${factura.documento || `Factura #${facturaId}`}`,
    pago
  );
};

function closeRecordModal() {
  dom.recordModal.style.display = 'none';
  state.facturas.selectedDetalle = null;
}

function formatRecordValue(valor) {
  if (valor === null || valor === undefined) {
    return '<span class="record-value-empty">NULL</span>';
  }
  if (valor instanceof Date) {
    return escapeHtml(formatDateTime(valor));
  }
  const str = String(valor);
  if (str.trim() === '') {
    return '<span class="record-value-empty">(vacío)</span>';
  }
  const numericClass = /^-?\d+(\.\d+)?$/.test(str) ? 'record-value-number' : '';
  return `<span class="${numericClass}">${escapeHtml(str)}</span>`;
}

export function exportFacturasJson() {
  openJsonModal(
    `Tabla: facturas (${state.facturas.data.length} registros)`,
    'factura_cabecera + factura_detalle • pos_contifico @ MySQL 5.7',
    state.facturas.data
  );
}

// ==========================================
// Comparación de integridad entre 2 facturas
// ==========================================

window.toggleFacturaCompare = function(id, checkboxEl) {
  if (checkboxEl.checked) {
    if (state.facturas.compare.size >= 2) {
      checkboxEl.checked = false;
      showToast('Solo puedes seleccionar 2 facturas para comparar', 'error');
      return;
    }
    state.facturas.compare.add(id);
  } else {
    state.facturas.compare.delete(id);
  }
  document.getElementById(`factura_card_${id}`)?.classList.toggle('is-compare-selected', checkboxEl.checked);
  updateCompareButton();
};

function updateCompareButton() {
  const n = state.facturas.compare.size;
  if (!dom.btnFacturasCompare) return;
  dom.compareCount.textContent = `${n}/2`;
  dom.btnFacturasCompare.disabled = n !== 2;
}

function closeCompareModal() {
  dom.compareModal.style.display = 'none';
}

function formatCompareVal(v) {
  if (v === null || v === undefined) return '<span class="record-value-empty">NULL</span>';
  if (String(v).trim() === '') return '<span class="record-value-empty">(vacío)</span>';
  return escapeHtml(String(v));
}

function openCompare() {
  const ids = [...state.facturas.compare];
  if (ids.length !== 2) return;
  const facA = state.facturas.data.find(f => f.idfactura_cabecera === ids[0]);
  const facB = state.facturas.data.find(f => f.idfactura_cabecera === ids[1]);
  if (!facA || !facB) {
    showToast('Una factura seleccionada ya no está en el listado', 'error');
    return;
  }

  const resultado = compararFacturas(facA, facB);
  const tituloA = facA.documento || `#${facA.idfactura_cabecera}`;
  const tituloB = facB.documento || `#${facB.idfactura_cabecera}`;

  dom.compareModalTitle.textContent = `A: ${tituloA}  vs  B: ${tituloB}`;
  dom.compareModalSubtitle.textContent =
    `Cabecera: ${resultado.resumenCab.iguales}/${resultado.resumenCab.total} iguales • ` +
    `Detalle: ${resultado.resumenDet.lineasA} vs ${resultado.resumenDet.lineasB} • ` +
    `Pagos: ${resultado.resumenPagos.pagosA} vs ${resultado.resumenPagos.pagosB} • ` +
    `IVA: ${resultado.resumenImp.impA} vs ${resultado.resumenImp.impB}`;

  const veredicto = resultado.integra
    ? `<div class="compare-verdict compare-ok">Integridad verificada: sin diferencias</div>`
    : `<div class="compare-verdict compare-diff">Se detectaron diferencias</div>`;

  dom.compareModalBody.innerHTML = `
    ${veredicto}
    <div class="compare-section-title">Cabecera — diferencias (${resultado.resumenCab.diferentes})</div>
    ${buildCompareCabeceraHtml(resultado)}
    <div class="compare-section-title">Detalle — A: ${resultado.resumenDet.lineasA} líneas, B: ${resultado.resumenDet.lineasB} líneas, pares con diferencia: ${resultado.resumenDet.paresConDiferencia}</div>
    ${buildCompareDetalleHtml(resultado)}
    <div class="compare-section-title">Pagos (forma_pagos) — A: ${resultado.resumenPagos.pagosA}, B: ${resultado.resumenPagos.pagosB}, pares con diferencia: ${resultado.resumenPagos.paresConDiferencia}</div>
    ${buildCompareParesHtml(resultado.pagosPares, resultado.pagosSoloA, resultado.pagosSoloB, 'pago', 'Sin diferencias en pagos.')}
    <div class="compare-section-title">Impuestos (impuestosdocumento) — A: ${resultado.resumenImp.impA}, B: ${resultado.resumenImp.impB}, pares con diferencia: ${resultado.resumenImp.paresConDiferencia}</div>
    ${buildCompareParesHtml(resultado.impuestosPares, resultado.impSoloA, resultado.impSoloB, 'registro de IVA', 'Sin diferencias en impuestos.')}
  `;
  dom.compareModal.style.display = 'flex';
}

function buildCompareCabeceraHtml(resultado) {
  const difs = resultado.cabecera.filter(c => !c.igual);
  if (difs.length === 0) {
    return `<div class="compare-empty-ok">Los ${resultado.resumenCab.total} campos comparados de cabecera son idénticos.</div>`;
  }
  const filas = difs.map(d => `
    <tr class="row-diff">
      <td class="font-mono">${escapeHtml(d.campo)}</td>
      <td>${formatCompareVal(d.a)}</td>
      <td>${formatCompareVal(d.b)}</td>
      <td class="text-right font-mono compare-delta">${d.diff === null || d.diff === undefined ? '≠' : formatMoney(d.diff)}</td>
    </tr>
  `).join('');
  return `
    <table class="data-table compare-table">
      <thead><tr><th>Campo</th><th>Valor A</th><th>Valor B</th><th style="text-align:right;">Δ</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <details class="compare-details">
      <summary>Ver ${resultado.resumenCab.iguales} campos iguales de cabecera</summary>
      <table class="data-table compare-table">
        <thead><tr><th>Campo</th><th>Valor A</th><th>Valor B</th></tr></thead>
        <tbody>${resultado.cabecera.filter(c => c.igual).map(d => `
          <tr class="row-ok"><td class="font-mono">${escapeHtml(d.campo)}</td><td>${formatCompareVal(d.a)}</td><td>${formatCompareVal(d.b)}</td></tr>
        `).join('')}</tbody>
      </table>
    </details>
  `;
}

function buildCompareDetalleHtml(resultado) {
  let html = '';
  if (resultado.soloA.length > 0 || resultado.soloB.length > 0) {
    html += `<div class="compare-unpaired">Líneas sin pareja — solo en A: ${resultado.soloA.length}, solo en B: ${resultado.soloB.length}</div>`;
  }
  const conDif = resultado.detallePares.filter(p => p.campos.some(c => !c.igual));
  if (conDif.length === 0 && resultado.soloA.length === 0 && resultado.soloB.length === 0) {
    return html + `<div class="compare-empty-ok">Detalle idéntico en ambas facturas.</div>`;
  }
  for (const par of conDif) {
    const difs = par.campos.filter(c => !c.igual);
    html += `
      <div class="compare-pair-title">Producto ID ${escapeHtml(par.idProducto ?? '-')} — ${difs.length} diferencia${difs.length === 1 ? '' : 's'}</div>
      ${buildCompareDiffTable(difs)}
    `;
  }
  return html;
}

function buildCompareDiffTable(difs) {
  return `
    <table class="data-table compare-table">
      <thead><tr><th>Campo</th><th>Valor A</th><th>Valor B</th><th style="text-align:right;">Δ</th></tr></thead>
      <tbody>${difs.map(d => `
        <tr class="row-diff">
          <td class="font-mono">${escapeHtml(d.campo)}</td>
          <td>${formatCompareVal(d.a)}</td>
          <td>${formatCompareVal(d.b)}</td>
          <td class="text-right font-mono compare-delta">${d.diff === null || d.diff === undefined ? '≠' : formatMoney(d.diff)}</td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;
}

function buildCompareParesHtml(pares, soloA, soloB, etiqueta, emptyMsg) {
  let html = '';
  if (soloA.length > 0 || soloB.length > 0) {
    html += `<div class="compare-unpaired">Sin pareja — solo en A: ${soloA.length}, solo en B: ${soloB.length}</div>`;
  }
  const conDif = pares.filter(p => p.campos.some(c => !c.igual));
  if (conDif.length === 0 && soloA.length === 0 && soloB.length === 0) {
    return html + `<div class="compare-empty-ok">${escapeHtml(emptyMsg)}</div>`;
  }
  for (const par of conDif) {
    const difs = par.campos.filter(c => !c.igual);
    html += `
      <div class="compare-pair-title">${escapeHtml(String(par.clave))} — ${difs.length} diferencia${difs.length === 1 ? '' : 's'}</div>
      ${buildCompareDiffTable(difs)}
    `;
  }
  return html;
}
