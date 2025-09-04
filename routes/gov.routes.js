const { parse } = require('url');
const govController = require('../controllers/gov.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generateResponse } = require('../utils/responseUtils');

module.exports = async function handleGovRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  const auth = verifyToken(req);
  if (!auth.valid) return generateResponse(401, auth.error, null, res);
  if (auth.role_name !== 'Government Official') {
    return generateResponse(403, 'Access denied: Admins only', null, res);
  }

  // GET /api/gov/users
  if (method === 'GET' && pathname === '/api/gov/users') {
    return govController.getAllUsers(req, res, auth);
  }

  // PUT /api/gov/users/:user_id/role
  if (method === 'PUT' && pathname.startsWith('/api/gov/users/') && pathname.endsWith('/role')) {
    const user_id = pathname.split('/')[4];
    return govController.updateUserRole(req, res, user_id, auth);
  }

  // GET /api/gov/merchants
  if (method === 'GET' && pathname === '/api/gov/merchants') {
    return govController.getAllMerchants(req, res, auth);
  }

  return false;
};
