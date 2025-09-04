const { parse } = require('url');
const { verifyToken } = require('../middleware/auth.middleware');
const auditController = require('../controllers/audit.controller');

module.exports = async function handleAuditRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  const auth = verifyToken(req);
  if (!auth.valid) return generateResponse(401, auth.error, null, res);

  // GET /api/audit
  if (method === 'GET' && pathname === '/api/audit') {
    return auditController.getAuditLogs(req, res, auth);
  }

  // GET /api/audit/user/:user_id
  if (method === 'GET' && pathname.startsWith('/api/audit/user/')) {
    const user_id = pathname.split('/').pop();
    return auditController.getAuditLogsByUser(req, res, user_id, auth);
  }

  return false;
};
