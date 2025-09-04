const { parse } = require('url');
const { verifyToken } = require('../middleware/auth.middleware');
const inventoryController = require('../controllers/inventory.controller');
const { generateResponse } = require('../utils/responseUtils');

module.exports = async function handleInventoryRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
  const method = req.method;

  const auth = verifyToken(req);
  if (!auth.valid) return generateResponse(401, auth.error, null, res);

  // POST /api/inventory/add
  if (method === 'POST' && pathname === '/api/inventory/add') {
    return inventoryController.addInventoryItem(req, res, auth);
  }

  // GET /api/inventory/my
  if (method === 'GET' && pathname === '/api/inventory/my') {
    return inventoryController.getMyInventory(req, res, auth);
  }

  // PUT /api/inventory/:inventory_id
  if (method === 'PUT' && pathname.startsWith('/api/inventory/')) {
    const inventory_id = pathname.split('/').pop();
    return inventoryController.updateInventoryItem(req, res, inventory_id, auth);
  }

  // DELETE /api/inventory/:inventory_id
  if (method === 'DELETE' && pathname.startsWith('/api/inventory/')) {
    const inventory_id = pathname.split('/').pop();
    return inventoryController.deleteInventoryItem(req, res, inventory_id, auth);
  }

  // GET /api/inventory/public/:prs_id
  if (method === 'GET' && pathname.startsWith('/api/inventory/public/')) {
    const prs_id = pathname.split('/').pop();
    return inventoryController.getInventoryNearby(req, res, prs_id, query);
  }

  // GET /api/inventory/all
  if (method === 'GET' && pathname === '/api/inventory/all') {
    return inventoryController.getAllInventory(req, res, query, auth);
  }

  return false; // Route not matched
};
