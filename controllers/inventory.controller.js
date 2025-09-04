const connPool = require('../db');
const { parseRequestBody } = require('../utils/requestUtils');
const { generateResponse } = require('../utils/responseUtils');

// POST /api/inventory/add
exports.addInventoryItem = async (req, res, auth) => {
  try {
    const body = await parseRequestBody(req);
    const { item_type, item_subtype, quantity, unit, location_id } = body;

    if (!item_type || quantity == null || !location_id) {
      return generateResponse(400, 'Missing required fields', null, res);
    }

    const insertQuery = `
      INSERT INTO inventory (item_type, item_subtype, quantity, unit, location_id, merchant_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $6)
      RETURNING inventory_id, item_type, item_subtype, quantity
    `;
    const { rows } = await connPool.query(insertQuery, [
      item_type,
      item_subtype || null,
      quantity,
      unit || 'units',
      location_id,
      auth.user_id,
    ]);

    return generateResponse(201, 'Inventory item added', rows[0], res);
  } catch (err) {
    console.error('Add inventory error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};

exports.getMyInventory = async (req, res, auth) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const totalResult = await connPool.query('SELECT COUNT(*) FROM inventory WHERE merchant_id = $1', [auth.user_id]);
    const total = parseInt(totalResult.rows[0].count);

    const query = `
      SELECT i.*, c.description
      FROM inventory i
      LEFT JOIN item_catalog c ON i.item_type = c.item_type AND i.item_subtype = c.item_subtype
      WHERE i.merchant_id = $1
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await connPool.query(query, [auth.user_id, limit, offset]);

    return generateResponse(200, 'Your inventory retrieved', {
      data: rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error('Get my inventory error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};


// PUT /api/inventory/:inventory_id
exports.updateInventoryItem = async (req, res, inventory_id, auth) => {
  try {
    const body = await parseRequestBody(req);
    const { quantity, unit } = body;

    const updateQuery = `
      UPDATE inventory
      SET quantity = COALESCE($1, quantity),
          unit = COALESCE($2, unit),
          updated_by = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE inventory_id = $4 AND merchant_id = $3
      RETURNING inventory_id, quantity, unit
    `;
    const result = await connPool.query(updateQuery, [
      quantity,
      unit,
      auth.user_id,
      inventory_id,
    ]);

    if (result.rowCount === 0) {
      return generateResponse(403, 'Item not found or permission denied', null, res);
    }

    return generateResponse(200, 'Inventory item updated', result.rows[0], res);
  } catch (err) {
    console.error('Update inventory error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};

// DELETE /api/inventory/:inventory_id
exports.deleteInventoryItem = async (req, res, inventory_id, auth) => {
  try {
    const deleteQuery = `
      DELETE FROM inventory
      WHERE inventory_id = $1 AND merchant_id = $2
    `;
    const result = await connPool.query(deleteQuery, [inventory_id, auth.user_id]);

    if (result.rowCount === 0) {
      return generateResponse(403, 'Item not found or permission denied', null, res);
    }

    return generateResponse(200, 'Inventory item deleted', null, res);
  } catch (err) {
    console.error('Delete inventory error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};

// GET /api/inventory/public/:prs_id
exports.getInventoryNearby = async (req, res, prs_id, query) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const totalResult = await connPool.query(`
      SELECT COUNT(*) FROM inventory i
      JOIN users u ON u.user_id = i.merchant_id
      WHERE u.prs_id != $1
    `, [prs_id]);
    const total = parseInt(totalResult.rows[0].count);

    const sql = `
      SELECT i.item_type, i.item_subtype, i.quantity, i.unit, l.address, l.city
      FROM inventory i
      JOIN locations l ON l.location_id = i.location_id
      JOIN users u ON u.user_id = i.merchant_id
      WHERE u.prs_id != $1
      LIMIT $2 OFFSET $3
    `;
    const { rows } = await connPool.query(sql, [prs_id, limit, offset]);

    return generateResponse(200, 'Nearby inventory retrieved', {
      data: rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error('Get nearby inventory error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};


// GET /api/inventory/all
exports.getAllInventory = async (req, res, query, auth) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const totalResult = await connPool.query('SELECT COUNT(*) FROM inventory');
    const total = parseInt(totalResult.rows[0].count);

    const sql = `
      SELECT i.inventory_id, i.item_type, i.item_subtype, i.quantity, i.unit,
             u.full_name AS merchant_name, l.address AS store_location
      FROM inventory i
      JOIN users u ON u.user_id = i.merchant_id
      LEFT JOIN locations l ON l.location_id = i.location_id
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await connPool.query(sql, [limit, offset]);

    return generateResponse(200, 'All inventory retrieved', {
      data: rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error('Get all inventory error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};
