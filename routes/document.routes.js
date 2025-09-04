const {
  uploadDocument,
  getDocumentsByUser,
  deleteDocument
} = require('../controllers/document.controller');

const url = require('url');

module.exports = async function documentRoutes(req, res) {
  const pathname = url.parse(req.url, true).pathname;
  const method = req.method;

  if (method === 'POST' && pathname === '/api/documents/upload') {
    return uploadDocument(req, res);
  }

  if (method === 'GET' && pathname === '/api/documents') {
    return getDocumentsByUser(req, res);
  }

  if (method === 'DELETE' && pathname.startsWith('/api/documents/')) {
    return deleteDocument(req, res);
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Route not found');

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Document route not found');
};
