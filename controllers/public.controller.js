const connPool = require('../db');
const { generateResponse } = require('../utils/responseUtils');

// GET /api/public/merchants
exports.getVerifiedMerchants = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const totalResult = await connPool.query(`SELECT COUNT(*) FROM merchants WHERE verified = true`);
    const total = parseInt(totalResult.rows[0].count);

    const dataResult = await connPool.query(`
      SELECT store_name, address, region, business_name
      FROM merchants
      WHERE verified = true
      ORDER BY region
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return generateResponse(200, 'Merchants retrieved', {
      data: dataResult.rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error('Get paginated merchants error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};


// GET /api/public/inventory/:region
exports.getInventoryByRegion = async (req, res, region) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const totalResult = await connPool.query(`
      SELECT COUNT(*) FROM inventory i
      JOIN merchants m ON m.user_id = i.merchant_id
      WHERE m.region = $1
    `, [region]);
    const total = parseInt(totalResult.rows[0].count);

    const result = await connPool.query(`
      SELECT i.item_type, i.item_subtype, i.quantity, i.unit, l.city, m.store_name
      FROM inventory i
      JOIN locations l ON l.location_id = i.location_id
      JOIN merchants m ON m.user_id = i.merchant_id
      WHERE m.region = $1
      LIMIT $2 OFFSET $3
    `, [region, limit, offset]);

    return generateResponse(200, `Inventory in ${region}`, {
      data: result.rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error('Get paginated inventory error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};

// GET /api/public/info/roles
exports.getAvailableRoles = async (req, res) => {
  try {
    const result = await connPool.query(`
      SELECT role_id, role_name
      FROM roles
      WHERE role_name IN ('Public Member', 'Merchant', 'Government Official')
      ORDER BY role_id
    `);
    return generateResponse(200, 'Available roles', result.rows, res);
  } catch (err) {
    console.error('Get roles error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};
