const { parse } = require('url');
const { verifyToken } = require('../middleware/auth.middleware');
const orderController = require('../controllers/orders.controller');

module.exports = async function handleOrderRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  const auth = verifyToken(req);
  if (!auth.valid) return generateResponse(401, auth.error, null, res);

  // POST /api/orders
  if (method === 'POST' && pathname === '/api/orders') {
    return orderController.createOrder(req, res, auth);
  }

  // GET /api/orders/my
  if (method === 'GET' && pathname === '/api/orders/my') {
    return orderController.getMyOrders(req, res, auth);
  }

  // GET /api/orders/received
  if (method === 'GET' && pathname === '/api/orders/received') {
    return orderController.getReceivedOrders(req, res, auth);
  }

  // PUT /api/orders/:id/status
  if (method === 'PUT' && pathname.startsWith('/api/orders/') && pathname.endsWith('/status')) {
    const id = pathname.split('/')[3];
    return orderController.updateOrderStatus(req, res, id, auth);
  }
    if (method === 'DELETE' && pathname.startsWith('/api/orders/')) {
    const id = pathname.split('/').pop();
    return orderController.cancelOrder(req, res, id, auth);
  }
  return false;
};
