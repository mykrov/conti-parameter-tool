/**
 * Sección facturas: últimas 20 facturas de factura_cabecera con su detalle
 * de factura_detalle y el nombre del producto desde inventario_producto.
 */
import { state } from '../core/state.js';
import { dom } from '../core/dom.js';
import { escapeHtml, formatDateTime, formatMoney, formatPercent, formatQty } from '../core/utils.js';
import { showToast, openJsonModal } from '../core/ui.js';

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
    dom.badgeCountFacturas.textContent = state.facturas.data.length;

    updateFacturasKpis();
    renderFacturasView();
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
      ...(factura.detalles || []).map(d => `${d.id_producto ?? ''} ${d.producto_nombre ?? ''} ${d.descripcion ?? ''}`)
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
}

function buildFacturaCard(factura) {
  const id = factura.idfactura_cabecera;
  const card = document.createElement('div');
  card.className = 'factura-card';
  card.id = `factura_card_${id}`;

  const estado = String(factura.estado || '').trim();
  const estadoClase = estado ? `estado-${estado.toLowerCase().charAt(0)}` : 'estado-otro';
  const fecha = formatDateTime(factura.fecha_emision || factura.fecha_creacion);

  card.innerHTML = `
    <div class="factura-card-header" onclick="toggleFacturaDetalle(${id})">
      <div class="factura-doc-block">
        <span class="factura-doc">${escapeHtml(factura.documento || `#${id}`)}</span>
        ${factura.tipo ? `<span class="factura-tipo-badge">${escapeHtml(factura.tipo)}</span>` : ''}
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
  if (detalles.length === 0) {
    return `<div class="factura-detalle-empty">Esta factura no tiene registros relacionados en factura_detalle.</div>`;
  }

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
