const { parse } = require('url');
const encryptionController = require('../controllers/encryption.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { generateResponse } = require('../utils/responseUtils');

module.exports = async function handleEncryptionRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  const auth = verifyToken(req);
  if (!auth.valid) return generateResponse(401, auth.error, null, res);

  // POST /api/encryption/encrypt
  if (method === 'POST' && pathname === '/api/encryption/encrypt') {
    return encryptionController.encryptData(req, res, auth);
  }

  // POST /api/encryption/decrypt
  if (method === 'POST' && pathname === '/api/encryption/decrypt') {
    return encryptionController.decryptData(req, res, auth);
  }
  if (method === 'POST' && pathname === '/api/encryption/rotate') {
  return encryptionController.rotateKey(req, res, auth);
}

  return false;
};
