const connPool = require('../db');
const { generateResponse } = require('../utils/responseUtils');

exports.getItemCatalog = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const totalResult = await connPool.query('SELECT COUNT(*) FROM item_catalog');
    const total = parseInt(totalResult.rows[0].count);

    const result = await connPool.query(`
      SELECT item_type, item_subtype, description
      FROM item_catalog
      ORDER BY item_type, item_subtype
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return generateResponse(200, 'Item catalog retrieved', {
      data: result.rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error('Fetch item catalog error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};