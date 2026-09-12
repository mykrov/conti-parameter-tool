/**
 * Referencias cache de los elementos del DOM.
 * Los módulos con `type="module"` se ejecutan tras el parseo del HTML,
 * por lo que `getElementById` ya encuentra todos los nodos.
 */
export const dom = {
  // Tabs navegación superior
  navTabPosConfig: document.getElementById('navTabPosConfig'),
  navTabParametro: document.getElementById('navTabParametro'),
  navTabFacturas: document.getElementById('navTabFacturas'),
  badgeCountConfig: document.getElementById('badgeCountConfig'),
  badgeCountParam: document.getElementById('badgeCountParam'),
  badgeCountFacturas: document.getElementById('badgeCountFacturas'),

  // Secciones
  sectionPosConfig: document.getElementById('sectionPosConfig'),
  sectionParametro: document.getElementById('sectionParametro'),
  sectionFacturas: document.getElementById('sectionFacturas'),

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

  // Controles facturas
  valFactTotal: document.getElementById('valFactTotal'),
  valFactMonto: document.getElementById('valFactMonto'),
  valFactItems: document.getElementById('valFactItems'),
  valFactPromedio: document.getElementById('valFactPromedio'),
  facturasSearchInput: document.getElementById('facturasSearchInput'),
  btnFacturasClearSearch: document.getElementById('btnFacturasClearSearch'),
  facturasSortFilter: document.getElementById('facturasSortFilter'),
  btnFacturasExpandAll: document.getElementById('btnFacturasExpandAll'),
  btnFacturasCollapseAll: document.getElementById('btnFacturasCollapseAll'),
  facturasView: document.getElementById('facturasView'),

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
  toastContainer: document.getElementById('toastContainer'),

  // Modal de registro completo (factura_detalle)
  recordModal: document.getElementById('recordModal'),
  recordModalTitle: document.getElementById('recordModalTitle'),
  recordModalSubtitle: document.getElementById('recordModalSubtitle'),
  recordModalBody: document.getElementById('recordModalBody'),
  btnCloseRecordModal: document.getElementById('btnCloseRecordModal'),
  btnCopyRecordJson: document.getElementById('btnCopyRecordJson')
};
