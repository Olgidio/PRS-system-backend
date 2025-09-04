const connPool = require('../db');
const { parseRequestBody } = require('../utils/requestUtils');
const { generateResponse } = require('../utils/responseUtils');

// POST /api/orders
exports.createOrder = async (req, res, auth) => {
  try {
    const body = await parseRequestBody(req);
    const { merchant_id, item_type, item_subtype, quantity } = body;

    if (!merchant_id || !item_type || !quantity) {
      return generateResponse(400, 'Missing required fields', null, res);
    }

    const insertQuery = `
      INSERT INTO orders (requester_id, merchant_id, item_type, item_subtype, quantity)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await connPool.query(insertQuery, [
      auth.user_id,
      merchant_id,
      item_type,
      item_subtype || null,
      quantity
    ]);

    return generateResponse(201, 'Order placed', result.rows[0], res);
  } catch (err) {
    console.error('Create order error:', err);
    return generateResponse(500, 'Failed to place order', null, res);
  }
};

// GET /api/orders/my
exports.getMyOrders = async (req, res, auth) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const countRes = await connPool.query(`SELECT COUNT(*) FROM orders WHERE requester_id = $1`, [auth.user_id]);
    const total = parseInt(countRes.rows[0].count);

    const result = await connPool.query(
      `SELECT * FROM orders WHERE requester_id = $1 ORDER BY requested_at DESC LIMIT $2 OFFSET $3`,
      [auth.user_id, limit, offset]
    );

    return generateResponse(200, 'Your orders retrieved', {
      data: result.rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error('Get my orders error:', err);
    return generateResponse(500, 'Failed to fetch orders', null, res);
  }
};

// GET /api/orders/received
exports.getReceivedOrders = async (req, res, auth) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const countRes = await connPool.query(`SELECT COUNT(*) FROM orders WHERE merchant_id = $1`, [auth.user_id]);
    const total = parseInt(countRes.rows[0].count);

    const result = await connPool.query(
      `SELECT * FROM orders WHERE merchant_id = $1 ORDER BY requested_at DESC LIMIT $2 OFFSET $3`,
      [auth.user_id, limit, offset]
    );

    return generateResponse(200, 'Received orders retrieved', {
      data: result.rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error('Get received orders error:', err);
    return generateResponse(500, 'Failed to fetch received orders', null, res);
  }
};

// DELETE /api/orders/:id
exports.cancelOrder = async (req, res, order_id, auth) => {
  try {
    const result = await connPool.query(
      `DELETE FROM orders
       WHERE order_id = $1 AND requester_id = $2 AND status = 'pending'
       RETURNING *`,
      [order_id, auth.user_id]
    );

    if (result.rowCount === 0) {
      return generateResponse(403, 'Cannot cancel: not found, unauthorized, or already processed', null, res);
    }

    return generateResponse(200, 'Order cancelled successfully', result.rows[0], res);
  } catch (err) {
    console.error('Cancel order error:', err);
    return generateResponse(500, 'Failed to cancel order', null, res);
  }
};

// PUT /api/orders/:id/status
exports.updateOrderStatus = async (req, res, order_id, auth) => {
  try {
    const body = await parseRequestBody(req);
    const { status } = body;

    if (!['approved', 'rejected', 'fulfilled'].includes(status)) {
      return generateResponse(400, 'Invalid status', null, res);
    }

    if (status === 'fulfilled') {
      const orderResult = await connPool.query(
        `SELECT * FROM orders WHERE order_id = $1 AND merchant_id = $2`,
        [order_id, auth.user_id]
      );

      const order = orderResult.rows[0];
      if (!order) {
        return generateResponse(404, 'Order not found', null, res);
      }

      const updateInventory = await connPool.query(
        `UPDATE inventory
         SET quantity = quantity - $1,
             updated_by = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE merchant_id = $2 AND item_type = $3 AND item_subtype IS NOT DISTINCT FROM $4
           AND quantity >= $1`,
        [order.quantity, auth.user_id, order.item_type, order.item_subtype]
      );

      if (updateInventory.rowCount === 0) {
        return generateResponse(400, 'Insufficient stock or inventory mismatch', null, res);
      }

      await connPool.query(
        `UPDATE orders
         SET status = 'fulfilled', fulfilled_at = CURRENT_TIMESTAMP
         WHERE order_id = $1`,
        [order_id]
      );

      return generateResponse(200, 'Order fulfilled and inventory deducted', null, res);
    } 
    else {
      await connPool.query(
        `UPDATE orders
         SET status = $1
         WHERE order_id = $2 AND merchant_id = $3`,
        [status, order_id, auth.user_id]
      );

      return generateResponse(200, `Order marked as ${status}`, null, res);
    }
    } catch (err) {
        console.error('Update order status error:', err);
        return generateResponse(500, 'Failed to update order status', null, res);
    }
};
