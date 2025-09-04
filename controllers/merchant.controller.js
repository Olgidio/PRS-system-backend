const connPool = require('../db');
const { parseRequestBody } = require('../utils/requestUtils');
const { generateResponse } = require('../utils/responseUtils');
const { getPrsIdByUserId } = require('../utils/dbUtils');

// GET /api/merchants/profile/:prs_id
exports.getMerchantByPrsId = async (req, res, prs_id, auth) => {
  try {
    const query = `
      SELECT m.*, u.first_name, u.last_name
      FROM merchants m
      JOIN users u ON u.user_id = m.user_id
      WHERE u.prs_id = $1
    `;
    const { rows } = await connPool.query(query, [prs_id]);

    if (rows.length === 0) {
      return generateResponse(404, 'Merchant not found', null, res);
    }

    return generateResponse(200, 'Merchant retrieved', rows[0], res);
  } catch (err) {
    console.error('Get merchant by PRS ID error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};

// GET /api/merchants/all (with pagination)
exports.getAllMerchants = async (req, res, auth) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const totalResult = await connPool.query('SELECT COUNT(*) FROM merchants');
    const total = parseInt(totalResult.rows[0].count);

    const query = `
      SELECT m.user_id, m.business_name, m.business_vat, m.region, m.verified,
             u.full_name, u.email
      FROM merchants m
      JOIN users u ON u.user_id = m.user_id
      ORDER BY m.verified DESC, u.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await connPool.query(query, [limit, offset]);

    return generateResponse(200, 'All merchants retrieved', {
      data: rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error('Get all merchants error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};

// POST /api/merchants/locations
exports.addLocation = async (req, res, auth) => {
  try {
    const body = await parseRequestBody(req);
    const { address, city, postal_code } = body;

    if (!address || !city || !postal_code) {
      return generateResponse(400, 'Missing address, city or postal_code', null, res);
    }

    const getMerchantQuery = 'SELECT merchant_id FROM merchants WHERE user_id = $1';
    const merchantResult = await connPool.query(getMerchantQuery, [auth.user_id]);

    if (merchantResult.rows.length === 0) {
      return generateResponse(403, 'User is not a registered merchant', null, res);
    }

    const merchant_id = merchantResult.rows[0].merchant_id;

    const insertLocationQuery = `
      INSERT INTO merchant_locations (merchant_id, address, city, postal_code, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING location_id, address
    `;
    const { rows } = await connPool.query(insertLocationQuery, [merchant_id, address, city, postal_code]);

    return generateResponse(201, 'Location added', rows[0], res);
  } catch (err) {
    console.error('Add location error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};

// GET /api/merchants/locations
exports.getMyLocations = async (req, res, auth) => {
  try {
    const getMerchantQuery = 'SELECT merchant_id FROM merchants WHERE user_id = $1';
    const result = await connPool.query(getMerchantQuery, [auth.user_id]);

    if (result.rows.length === 0) {
      return generateResponse(403, 'User is not a registered merchant', null, res);
    }

    const merchant_id = result.rows[0].merchant_id;

    const locationsQuery = `
      SELECT location_id, address, city, postal_code
      FROM merchant_locations
      WHERE merchant_id = $1
    `;
    const { rows } = await connPool.query(locationsQuery, [merchant_id]);

    return generateResponse(200, 'Merchant locations retrieved', rows, res);
  } catch (err) {
    console.error('Get locations error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};

// PUT /api/merchants/locations/:location_id
exports.updateLocation = async (req, res, location_id, auth) => {
  try {
    const body = await parseRequestBody(req);
    const { address, city, postal_code } = body;

    const getMerchantQuery = 'SELECT merchant_id FROM merchants WHERE user_id = $1';
    const merchantResult = await connPool.query(getMerchantQuery, [auth.user_id]);

    if (merchantResult.rows.length === 0) {
      return generateResponse(403, 'User is not a registered merchant', null, res);
    }

    const merchant_id = merchantResult.rows[0].merchant_id;

    const updateQuery = `
      UPDATE merchant_locations
      SET address = $1, city = $2, postal_code = $3
      WHERE location_id = $4 AND merchant_id = $5
      RETURNING location_id
    `;
    const result = await connPool.query(updateQuery, [address, city, postal_code, location_id, merchant_id]);

    if (result.rowCount === 0) {
      return generateResponse(403, 'Location not found or access denied', null, res);
    }

    return generateResponse(200, 'Location updated', result.rows[0], res);
  } catch (err) {
    console.error('Update location error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};

// DELETE /api/merchants/locations/:location_id
exports.deleteLocation = async (req, res, location_id, auth) => {
  try {
    const getMerchantQuery = 'SELECT merchant_id FROM merchants WHERE user_id = $1';
    const merchantResult = await connPool.query(getMerchantQuery, [auth.user_id]);

    if (merchantResult.rows.length === 0) {
      return generateResponse(403, 'User is not a registered merchant', null, res);
    }

    const merchant_id = merchantResult.rows[0].merchant_id;

    const deleteQuery = `
      DELETE FROM merchant_locations
      WHERE location_id = $1 AND merchant_id = $2
    `;
    const result = await connPool.query(deleteQuery, [location_id, merchant_id]);

    if (result.rowCount === 0) {
      return generateResponse(403, 'Location not found or access denied', null, res);
    }

    return generateResponse(200, 'Location deleted', null, res);
  } catch (err) {
    console.error('Delete location error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};

// GET /api/merchants/compliance-report
exports.getComplianceReport = async (req, res, auth) => {
  try {
    // Placeholder: Replace with actual logic tied to audit/purchase log
    const fakeComplianceData = [
      { merchant: 'PharmaX', violations: 2 },
      { merchant: 'BioSupply', violations: 0 },
    ];
    return generateResponse(200, 'Compliance report (stub)', fakeComplianceData, res);
  } catch (err) {
    console.error('Compliance report error:', err);
    return generateResponse(500, 'Internal server error', null, res);
  }
};
