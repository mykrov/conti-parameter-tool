const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Pool de conexiones MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'pos_contifico',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Endpoint: Estado y Ping de la base de datos
app.get('/api/status', async (req, res) => {
  const start = Date.now();
  try {
    const [rows] = await pool.query('SELECT VERSION() AS version, NOW() AS server_time, DATABASE() AS current_db');
    const latencyMs = Date.now() - start;

    const [tableInfo] = await pool.query(`
      SELECT COUNT(*) AS total_tables 
      FROM information_schema.tables 
      WHERE table_schema = ?
    `, [process.env.DB_NAME || 'pos_contifico']);

    res.json({
      status: 'connected',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      database: rows[0].current_db,
      version: rows[0].version,
      serverTime: rows[0].server_time,
      latencyMs,
      totalTables: tableInfo[0]?.total_tables || 0
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      code: error.code
    });
  }
});

// Endpoint: Obtener todos los parámetros de pos_configuracion y sus metadatos
app.get('/api/configuraciones', async (req, res) => {
  try {
    // Obtener metadatos de las columnas de pos_configuracion
    const [columns] = await pool.query(`
      SELECT 
        COLUMN_NAME AS name, 
        DATA_TYPE AS dataType, 
        COLUMN_TYPE AS fullType, 
        IS_NULLABLE AS isNullable, 
        COLUMN_DEFAULT AS defaultValue, 
        COLUMN_COMMENT AS comment
      FROM information_schema.columns 
      WHERE table_schema = ? AND table_name = 'pos_configuracion'
      ORDER BY ORDINAL_POSITION ASC
    `, [process.env.DB_NAME || 'pos_contifico']);

    // Consulta de configuraciones con información del terminal
    const [configs] = await pool.query(`
      SELECT 
        c.*,
        t.ruc AS terminal_ruc,
        t.razon_social AS terminal_razon_social,
        t.nombre_comercial AS terminal_nombre_comercial,
        t.nombre_maquina AS terminal_nombre_maquina,
        t.pos_version AS terminal_pos_version,
        t.matriz AS terminal_matriz,
        t.pos_abierto AS terminal_pos_abierto
      FROM pos_configuracion c
      LEFT JOIN pos_terminal t ON c.terminal_id = t.id
      ORDER BY c.id ASC
    `);

    res.json({
      success: true,
      total: configs.length,
      columns,
      data: configs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al consultar pos_configuracion: ' + error.message
    });
  }
});

// Endpoint: Obtener un registro por ID
app.get('/api/configuraciones/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.*,
        t.ruc AS terminal_ruc,
        t.razon_social AS terminal_razon_social,
        t.nombre_comercial AS terminal_nombre_comercial,
        t.nombre_maquina AS terminal_nombre_maquina,
        t.pos_version AS terminal_pos_version
      FROM pos_configuracion c
      LEFT JOIN pos_terminal t ON c.terminal_id = t.id
      WHERE c.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Configuración no encontrada' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// ENDPOINTS PARA LA TABLA 'parametro'
// ==========================================

// Endpoint: Obtener todos los parámetros con su grupo asociado y terminal
app.get('/api/parametros', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id,
        p.terminal_id,
        COALESCE(t.nombre_comercial, t.razon_social, CONCAT('Terminal ', p.terminal_id)) AS terminal_nombre,
        t.nombre_maquina AS terminal_maquina,
        p.nombre,
        p.valorEntero,
        p.valorString,
        p.grupo_id,
        COALESCE(g.nombre, 'Sin Grupo') AS grupo_nombre,
        p.version,
        CASE 
          WHEN (p.valorString IS NULL OR p.valorString = '') AND p.valorEntero IN (0, 1) THEN 1 
          ELSE 0 
        END AS esBooleano
      FROM parametro p
      LEFT JOIN parametro_grupo g ON p.grupo_id = g.id
      LEFT JOIN pos_terminal t ON p.terminal_id = t.id
      ORDER BY p.id ASC
    `);

    // Resumen de conteos
    const total = rows.length;
    const booleanos = rows.filter(r => r.esBooleano === 1);
    const activos = booleanos.filter(r => r.valorEntero === 1).length;
    const inactivos = booleanos.filter(r => r.valorEntero === 0).length;
    const textos = total - booleanos.length;

    res.json({
      success: true,
      total,
      stats: {
        total,
        booleanos: booleanos.length,
        activos,
        inactivos,
        textos
      },
      data: rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al consultar tabla parametro: ' + error.message });
  }
});

// Endpoint: Obtener lista de grupos
app.get('/api/parametro-grupos', async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT id, nombre FROM parametro_grupo ORDER BY id ASC`);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint: Actualizar un parámetro individual garantizando id y terminal_id
app.put('/api/parametros/:id', async (req, res) => {
  const { id } = req.params;
  const { valorEntero, valorString, terminal_id } = req.body;

  if (terminal_id === undefined || terminal_id === null) {
    return res.status(400).json({ success: false, message: 'terminal_id es obligatorio para actualizar el parámetro' });
  }

  if (valorEntero === undefined && valorString === undefined) {
    return res.status(400).json({ success: false, message: 'No se envió ningún valor para actualizar' });
  }

  try {
    const setClauses = [];
    const params = [];

    if (valorEntero !== undefined) {
      setClauses.push('valorEntero = ?');
      params.push(valorEntero);
    }

    if (valorString !== undefined) {
      setClauses.push('valorString = ?');
      params.push(valorString);
    }

    params.push(id, terminal_id);

    const [updateResult] = await pool.query(
      `UPDATE parametro SET ${setClauses.join(', ')} WHERE id = ? AND terminal_id = ?`,
      params
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el parámetro para el terminal_id indicado'
      });
    }

    const [updated] = await pool.query(`
      SELECT p.*, COALESCE(t.nombre_comercial, t.razon_social, CONCAT('Terminal ', p.terminal_id)) AS terminal_nombre
      FROM parametro p
      LEFT JOIN pos_terminal t ON p.terminal_id = t.id
      WHERE p.id = ? AND p.terminal_id = ?
    `, [id, terminal_id]);

    res.json({
      success: true,
      message: 'Parámetro actualizado correctamente en la base de datos',
      data: updated[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar parametro: ' + error.message });
  }
});

// Endpoint: Actualización en lote garantizando id y terminal_id
app.post('/api/parametros/guardar-lote', async (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ success: false, message: 'No se enviaron modificaciones para guardar' });
  }

  const hasInvalidUpdate = updates.some(item => (
    !item ||
    item.id === undefined ||
    item.id === null ||
    item.terminal_id === undefined ||
    item.terminal_id === null ||
    (item.valorEntero === undefined && item.valorString === undefined)
  ));

  if (hasInvalidUpdate) {
    return res.status(400).json({
      success: false,
      message: 'Cada modificación debe incluir id, terminal_id y un valor para actualizar'
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const item of updates) {
      const setClauses = [];
      const params = [];

      if (item.valorEntero !== undefined) {
        setClauses.push('valorEntero = ?');
        params.push(item.valorEntero);
      }

      if (item.valorString !== undefined) {
        setClauses.push('valorString = ?');
        params.push(item.valorString);
      }

      params.push(item.id, item.terminal_id);

      const [updateResult] = await connection.query(
        `UPDATE parametro SET ${setClauses.join(', ')} WHERE id = ? AND terminal_id = ?`,
        params
      );

      if (updateResult.affectedRows !== 1) {
        throw new Error(`No se encontró el parámetro ${item.id} para el terminal_id ${item.terminal_id}`);
      }
    }

    await connection.commit();
    res.json({
      success: true,
      message: `${updates.length} parámetros actualizados exitosamente en MySQL`,
      updatedCount: updates.length
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: 'Error en transacción de actualización: ' + error.message });
  } finally {
    connection.release();
  }
});

// ==========================================
// ENDPOINTS PARA FACTURAS (cabecera + detalle)
// ==========================================

// Endpoint: Últimas 20 facturas creadas en factura_cabecera con su detalle relacionado
app.get('/api/facturas', async (req, res) => {
  try {
    // 1) Últimas 20 cabeceras ordenadas por fecha de creación (más recientes primero).
    // Se trae c.* completa para permitir la comparación de integridad campo a campo.
    const [cabeceras] = await pool.query(`
      SELECT
        c.*,
        COALESCE(t.nombre_comercial, t.razon_social, CONCAT('Terminal ', c.terminal_id)) AS terminal_nombre
      FROM factura_cabecera c
      LEFT JOIN pos_terminal t ON c.terminal_id = t.id
      ORDER BY c.fecha_creacion DESC, c.idfactura_cabecera DESC
      LIMIT 20
    `);

    if (cabeceras.length === 0) {
      return res.json({ success: true, total: 0, data: [] });
    }

    // 2) Detalle de todas las cabeceras obtenidas en una sola consulta
    const ids = cabeceras.map(c => c.idfactura_cabecera);
    const [detalles] = await pool.query(`
      SELECT
        d.*,
        ip.nombre AS producto_nombre
      FROM factura_detalle d
      LEFT JOIN inventario_producto ip ON ip.id = d.id_producto
      WHERE d.idfactura_cabecera IN (?)
      ORDER BY d.idfactura_cabecera ASC, d.idfactura_detalle ASC
    `, [ids]);

    // 3) Pagos de todas las cabeceras (tabla real: forma_pagos, FK id_cabecera)
    const [pagos] = await pool.query(`
      SELECT p.*
      FROM forma_pagos p
      WHERE p.id_cabecera IN (?)
      ORDER BY p.id_cabecera ASC, p.idforma_pagos ASC
    `, [ids]);

    // 4) Agrupar detalle y pagos por cabecera
    const detallePorFactura = new Map();
    for (const detalle of detalles) {
      if (!detallePorFactura.has(detalle.idfactura_cabecera)) {
        detallePorFactura.set(detalle.idfactura_cabecera, []);
      }
      detallePorFactura.get(detalle.idfactura_cabecera).push(detalle);
    }

    const pagosPorFactura = new Map();
    for (const pago of pagos) {
      if (!pagosPorFactura.has(pago.id_cabecera)) {
        pagosPorFactura.set(pago.id_cabecera, []);
      }
      pagosPorFactura.get(pago.id_cabecera).push(pago);
    }

    // 5) Impuestos usados por factura (tabla: impuestosdocumento, FK idFacturaCabecera)
    const [impuestos] = await pool.query(`
      SELECT i.*
      FROM impuestosdocumento i
      WHERE i.idFacturaCabecera IN (?)
      ORDER BY i.idFacturaCabecera ASC, i.porcentajeIVA ASC
    `, [ids]);

    const impuestosPorFactura = new Map();
    for (const imp of impuestos) {
      if (!impuestosPorFactura.has(imp.idFacturaCabecera)) {
        impuestosPorFactura.set(imp.idFacturaCabecera, []);
      }
      impuestosPorFactura.get(imp.idFacturaCabecera).push(imp);
    }

    const data = cabeceras.map(cabecera => {
      const items = detallePorFactura.get(cabecera.idfactura_cabecera) || [];
      const pagosFactura = pagosPorFactura.get(cabecera.idfactura_cabecera) || [];
      const impuestosFactura = impuestosPorFactura.get(cabecera.idfactura_cabecera) || [];
      return {
        ...cabecera,
        total_items: items.length,
        detalles: items,
        total_pagos: pagosFactura.length,
        pagos: pagosFactura,
        total_impuestos: impuestosFactura.length,
        impuestos: impuestosFactura
      };
    });

    res.json({ success: true, total: data.length, data });
  } catch (error) {
    console.error('Error al consultar facturas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al consultar facturas'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor POS Config Web iniciado en http://localhost:${PORT}`);
});

