const connPool = require('../db');
const { generateResponse } = require('../utils/responseUtils');
const { parse } = require('url');

// GET /api/audit
exports.getAuditLogs = async (req, res, auth) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const totalResult = await connPool.query('SELECT COUNT(*) FROM audit_logs');
    const total = parseInt(totalResult.rows[0].count);

    const result = await connPool.query(`
      SELECT a.log_id, u.email, a.action, a.table_name, a.record_id, a.changes, a.created_at
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.user_id
      ORDER BY a.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return generateResponse(200, 'Audit logs retrieved', {
      data: result.rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error('Get audit logs error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};

// GET /api/audit/user/:user_id
exports.getAuditLogsByUser = async (req, res, user_id, auth) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const totalResult = await connPool.query('SELECT COUNT(*) FROM audit_logs WHERE user_id = $1', [user_id]);
    const total = parseInt(totalResult.rows[0].count);

    const result = await connPool.query(`
      SELECT log_id, action, table_name, record_id, changes, created_at
      FROM audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [user_id, limit, offset]);

    return generateResponse(200, 'User audit logs retrieved', {
      data: result.rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error('Get user audit logs error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};
