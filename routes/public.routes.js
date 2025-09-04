const { parse } = require('url');
const publicController = require('../controllers/public.controller');
const { generateResponse } = require('../utils/responseUtils');

module.exports = async function handlePublicRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // GET /api/public/merchants
  if (method === 'GET' && pathname === '/api/public/merchants') {
    return publicController.getVerifiedMerchants(req, res);
  }

  // GET /api/public/inventory/:region
  if (method === 'GET' && pathname.startsWith('/api/public/inventory/')) {
    const region = pathname.split('/').pop();
    return publicController.getInventoryByRegion(req, res, region);
  }

  // GET /api/public/info/roles
  if (method === 'GET' && pathname === '/api/public/info/roles') {
    return publicController.getAvailableRoles(req, res);
  }

  return false;
};
