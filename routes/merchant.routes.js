const { parse } = require('url');
const { parseRequestBody } = require('../utils/requestUtils');
const { generateResponse } = require('../utils/responseUtils');
const merchantController = require('../controllers/merchant.controller');
const { verifyToken } = require('../middleware/auth.middleware');

module.exports = async function handleMerchantRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
  const method = req.method;

  const auth = verifyToken(req);
  if (!auth.valid) return generateResponse(401, auth.error, null, res);


  // GET /api/merchants/profile/:prs_id
  if (method === 'GET' && pathname.startsWith('/api/merchants/profile/')) {
    const prs_id = pathname.split('/').pop();
    return merchantController.getMerchantByPrsId(req, res, prs_id, auth);
  }

  // GET /api/merchants/all
  if (method === 'GET' && pathname === '/api/merchants/all') {
    return merchantController.getAllMerchants(req, res, auth);
  }

  // POST /api/merchants/locations
  if (method === 'POST' && pathname === '/api/merchants/locations') {
    return merchantController.addLocation(req, res, auth);
  }

  // GET /api/merchants/locations
  if (method === 'GET' && pathname === '/api/merchants/locations') {
    return merchantController.getMyLocations(req, res, auth);
  }

  // PUT /api/merchants/locations/:location_id
  if (method === 'PUT' && pathname.startsWith('/api/merchants/locations/')) {
    const location_id = pathname.split('/').pop();
    return merchantController.updateLocation(req, res, location_id, auth);
  }

  // DELETE /api/merchants/locations/:location_id
  if (method === 'DELETE' && pathname.startsWith('/api/merchants/locations/')) {
    const location_id = pathname.split('/').pop();
    return merchantController.deleteLocation(req, res, location_id, auth);
  }

  // GET /api/merchants/compliance-report
  if (method === 'GET' && pathname === '/api/merchants/compliance-report') {
    return merchantController.getComplianceReport(req, res, auth);
  }

  return false; // Not matched
};
