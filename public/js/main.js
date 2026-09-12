/**
 * POS Config, Parámetros y Facturas - Entrypoint.
 * Orquesta navegación, estado de conexión y acciones globales.
 */
import { state } from './core/state.js';
import { dom } from './core/dom.js';
import { showToast, closeModal } from './core/ui.js';
import { setupEventListenersConfig, fetchPosConfig, exportConfigJson } from './sections/config.js';
import { setupEventListenersParam, fetchParametros, renderParametroView, exportParametrosJson } from './sections/parametro.js';
import { setupEventListenersFacturas, fetchFacturas, renderFacturasView, exportFacturasJson } from './sections/facturas.js';

// ==========================================
// 1. NAVEGACIÓN ENTRE TABLAS
// ==========================================
function setupNavigation() {
  dom.navTabPosConfig.addEventListener('click', () => switchTable('pos_configuracion'));
  dom.navTabParametro.addEventListener('click', () => switchTable('parametro'));
  dom.navTabFacturas.addEventListener('click', () => switchTable('facturas'));
}

function switchTable(tableName) {
  state.activeTable = tableName;

  const isPosConfig = tableName === 'pos_configuracion';
  const isParametro = tableName === 'parametro';
  const isFacturas = tableName === 'facturas';

  dom.navTabPosConfig.classList.toggle('active', isPosConfig);
  dom.navTabParametro.classList.toggle('active', isParametro);
  dom.navTabFacturas.classList.toggle('active', isFacturas);

  dom.sectionPosConfig.style.display = isPosConfig ? 'block' : 'none';
  dom.sectionParametro.style.display = isParametro ? 'block' : 'none';
  dom.sectionFacturas.style.display = isFacturas ? 'block' : 'none';

  if (isParametro) renderParametroView();
  if (isFacturas) renderFacturasView();
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
    } else if (state.activeTable === 'parametro') {
      fetchParametros();
    } else {
      fetchFacturas();
    }
  });

  dom.btnRetry.addEventListener('click', () => {
    checkDbStatus();
    fetchPosConfig();
    fetchParametros();
    fetchFacturas();
  });

  dom.btnExportJson.addEventListener('click', () => {
    if (state.activeTable === 'pos_configuracion') {
      exportConfigJson();
    } else if (state.activeTable === 'parametro') {
      exportParametrosJson();
    } else {
      exportFacturasJson();
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
// 3. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupEventListenersConfig();
  setupEventListenersParam();
  setupEventListenersFacturas();
  setupGlobalActions();

  // Carga inicial
  checkDbStatus();
  fetchPosConfig();
  fetchParametros();
  fetchFacturas();
});
