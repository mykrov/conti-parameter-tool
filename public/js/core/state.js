/**
 * Estado global compartido de la aplicación.
 * Un único objeto `state` evita duplicar el estado entre secciones.
 */
export const state = {
  activeTable: 'pos_configuracion', // 'pos_configuracion' | 'parametro' | 'facturas'

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
  },

  // Estado facturas
  facturas: {
    data: [],
    searchTerm: '',
    sortMode: 'fecha_desc',
    expanded: new Set(), // Set<idfactura_cabecera> expandidas
    selectedDetalle: null // detalle abierto en el modal de registro completo
  }
};
