module.exports = async function userRoutes(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const path = parsedUrl.pathname;
  const method = req.method;

  if (method === 'GET' && path === '/api/profile') return getProfile(req, res);
  if (method === 'PUT' && path === '/api/profile') return updateProfile(req, res);
  if (method === 'POST' && path === '/api/profile/identifiers') return updateIdentifiers(req, res);
  if (method === 'GET' && path === '/api/profile/identifiers') return getIdentifiers(req, res);
  if (method === 'DELETE' && path === '/api/profile') return deleteUserAccount(req, res);

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('User route not found');
};
 