const connPool = require('../db');
const { parseRequestBody } = require('../utils/requestUtils');
const { generateResponse } = require('../utils/responseUtils');

// GET /api/gov/users
exports.getAllUsers = async (req, res, auth) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const totalResult = await connPool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(totalResult.rows[0].count);

    const result = await connPool.query(`
      SELECT u.user_id, u.email, u.prs_id, u.first_name, u.last_name, r.role_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return generateResponse(200, 'All users retrieved', {
      data: result.rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error('Get users error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};

// PUT /api/gov/users/:user_id/role
exports.updateUserRole = async (req, res, user_id, auth) => {
  try {
    const body = await parseRequestBody(req);
    const { new_role_id } = body;

    if (![1, 2, 3].includes(new_role_id)) {
      return generateResponse(400, 'Invalid role ID', null, res);
    }

    const update = await connPool.query(
      'UPDATE users SET role_id = $1 WHERE user_id = $2 RETURNING user_id',
      [new_role_id, user_id]
    );

    if (update.rowCount === 0) {
      return generateResponse(404, 'User not found', null, res);
    }

    return generateResponse(200, 'User role updated', update.rows[0], res);
  } catch (err) {
    console.error('Update role error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};

// GET /api/gov/merchants
exports.getAllMerchants = async (req, res, auth) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const totalResult = await connPool.query('SELECT COUNT(*) FROM merchants');
    const total = parseInt(totalResult.rows[0].count);

    const result = await connPool.query(`
      SELECT m.user_id, m.business_vat, m.business_name, m.company_number, m.verified,
             u.email, u.first_name, u.last_name
      FROM merchants m
      JOIN users u ON m.user_id = u.user_id
      ORDER BY m.verified DESC, u.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return generateResponse(200, 'All merchants retrieved', {
      data: result.rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error('Get merchants error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};
