/**
 * Comparación de integridad entre dos facturas (cabecera + detalle).
 * Módulo puro: sin DOM ni estado global (solo utils), testeable en Node.
 */

// Campos autogenerados / de sincronización que NO se comparan en cabecera
export const CAB_EXCLUIR = new Set([
  // Identidad y documentos propios de cada sistema
  'idfactura_cabecera', 'id_integracion', 'secuencia', 'idCliente',
  'numero_documento', 'documento', 'descripcion', 'autorizacion',
  'token', 'codigo_unico',
  // Fechas (cambian por registro)
  'fecha_emision', 'fecha_creacion', 'ultimo_cambio',
  'fecha_vencimiento', 'ultima_sincronizacion',
  // Ruido de sincronización entre sistemas
  'subio', 'subioTemp', 'subio_documento', 'tipo_sincro',
  'msg_error', 'cod_error',
  // Claves de enriquecimiento / calculados del frontend
  'terminal_nombre', 'detalles', 'pagos', 'total_items', 'total_pagos',
  'impuestos', 'total_impuestos'
]);

// Campos que NO se comparan en factura_detalle
export const DET_EXCLUIR = new Set([
  // PKs / FKs y enriquecimiento
  'idfactura_detalle', 'idfactura_cabecera', 'producto_nombre',
  'promocion_integracionId',
  // Fechas (cambian por registro)
  'fecha_creacion', 'ultimo_cambio', 'fecha_creacion_pedido'
]);

// Campos que NO se comparan en forma_pagos
export const PAGO_EXCLUIR = new Set([
  'idforma_pagos', 'id_cabecera',           // PK / FK propios de cada sistema
  'id_integracion', 'token', 'id_transaccion_giftcard', // tokens externos
  'fecha_creacion', 'fecha_cheque'           // fechas
]);

// Campos que NO se comparan en impuestosdocumento
export const IMP_EXCLUIR = new Set([
  'idFacturaCabecera' // FK propia de cada sistema
]);
// Tolerancia para montos: diferencias de 0.01 deben detectarse,
// por eso se exige |a-b| < 0.005 para considerar igualdad.
export const MONTO_TOLERANCIA = 0.005;

function esVacio(v) {
  return v === null || v === undefined || v === '';
}

function esNumerico(v) {
  if (esVacio(v)) return false;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') {
    const t = v.trim();
    return t !== '' && Number.isFinite(Number(t));
  }
  return false;
}

/** Compara dos valores: numéricos con tolerancia, resto estricto (null≈''). */
export function valoresIguales(a, b) {
  const aVacio = esVacio(a);
  const bVacio = esVacio(b);
  if (aVacio && bVacio) return true;
  if (aVacio || bVacio) return false;
  if (esNumerico(a) && esNumerico(b)) {
    return Math.abs(Number(a) - Number(b)) < MONTO_TOLERANCIA;
  }
  return String(a) === String(b);
}

export function diferenciaNumerica(a, b) {
  if (esNumerico(a) && esNumerico(b)) return Number(a) - Number(b);
  return null;
}

/** Compara dos objetos campo a campo, omitiendo `excluir`. */
export function compararObjetos(a, b, excluir) {
  const campos = [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])]
    .filter(c => !excluir.has(c))
    .sort();
  return campos.map(campo => {
    const va = a ? a[campo] : undefined;
    const vb = b ? b[campo] : undefined;
    const igual = valoresIguales(va, vb);
    return { campo, a: va ?? null, b: vb ?? null, igual, diff: igual ? null : diferenciaNumerica(va, vb) };
  });
}

/**
 * Empareja registros A con B por una clave (colas en orden).
 * Retorna { pares: [{a, b}], soloA: [], soloB: [] }.
 */
export function emparejarPorClave(listA, listB, claveFn) {
  const colasB = new Map();
  for (const d of listB || []) {
    const k = claveFn(d);
    if (!colasB.has(k)) colasB.set(k, []);
    colasB.get(k).push(d);
  }
  const pares = [];
  const soloA = [];
  for (const d of listA || []) {
    const cola = colasB.get(claveFn(d));
    if (cola && cola.length > 0) {
      pares.push({ a: d, b: cola.shift() });
    } else {
      soloA.push(d);
    }
  }
  const soloB = [];
  for (const cola of colasB.values()) soloB.push(...cola);
  return { pares, soloA, soloB };
}

/**
 * Empareja líneas de detalle A con B por id_producto (en orden).
 */
export function emparejarDetalles(detA, detB) {
  return emparejarPorClave(detA, detB, d => d.id_producto ?? '__sin_producto__');
}

/** Comparación integral de dos facturas (cabecera + detalle + pagos + impuestos). */
export function compararFacturas(facA, facB) {
  const cabecera = compararObjetos(facA, facB, CAB_EXCLUIR);
  const { pares, soloA, soloB } = emparejarDetalles(facA.detalles, facB.detalles);
  const detallePares = pares.map(({ a, b }) => ({
    idProducto: a.id_producto ?? b.id_producto ?? null,
    campos: compararObjetos(a, b, DET_EXCLUIR)
  }));

  // Pagos (forma_pagos): se emparejan por código de forma de pago
  const pagosMatch = emparejarPorClave(
    facA.pagos, facB.pagos, p => String(p.forma_pago || '').trim().toUpperCase() || '__sin_forma__');
  const pagosPares = pagosMatch.pares.map(({ a, b }) => ({
    clave: a.forma_pago || b.forma_pago || '-',
    campos: compararObjetos(a, b, PAGO_EXCLUIR)
  }));

  // Impuestos (impuestosdocumento): se emparejan por porcentajeIVA
  const impMatch = emparejarPorClave(
    facA.impuestos, facB.impuestos, i => String(i.porcentajeIVA ?? ''));
  const impuestosPares = impMatch.pares.map(({ a, b }) => ({
    clave: `IVA ${a.porcentajeIVA ?? b.porcentajeIVA ?? '-'}%`,
    campos: compararObjetos(a, b, IMP_EXCLUIR)
  }));

  const igualesCab = cabecera.filter(c => c.igual).length;
  const difCab = cabecera.filter(c => !c.igual);
  const difDet = detallePares.filter(p => p.campos.some(c => !c.igual));
  const difPagos = pagosPares.filter(p => p.campos.some(c => !c.igual));
  const difImp = impuestosPares.filter(p => p.campos.some(c => !c.igual));
  return {
    cabecera,
    resumenCab: { total: cabecera.length, iguales: igualesCab, diferentes: difCab.length },
    detallePares,
    soloA,
    soloB,
    resumenDet: {
      lineasA: (facA.detalles || []).length,
      lineasB: (facB.detalles || []).length,
      pares: pares.length,
      paresConDiferencia: difDet.length,
      soloA: soloA.length,
      soloB: soloB.length
    },
    pagosPares,
    resumenPagos: {
      pagosA: (facA.pagos || []).length,
      pagosB: (facB.pagos || []).length,
      pares: pagosMatch.pares.length,
      paresConDiferencia: difPagos.length,
      soloA: pagosMatch.soloA.length,
      soloB: pagosMatch.soloB.length
    },
    pagosSoloA: pagosMatch.soloA,
    pagosSoloB: pagosMatch.soloB,
    impuestosPares,
    resumenImp: {
      impA: (facA.impuestos || []).length,
      impB: (facB.impuestos || []).length,
      pares: impMatch.pares.length,
      paresConDiferencia: difImp.length,
      soloA: impMatch.soloA.length,
      soloB: impMatch.soloB.length
    },
    impSoloA: impMatch.soloA,
    impSoloB: impMatch.soloB,
    integra: difCab.length === 0 && difDet.length === 0 && soloA.length === 0 && soloB.length === 0 &&
      difPagos.length === 0 && pagosMatch.soloA.length === 0 && pagosMatch.soloB.length === 0 &&
      difImp.length === 0 && impMatch.soloA.length === 0 && impMatch.soloB.length === 0
  };
}
