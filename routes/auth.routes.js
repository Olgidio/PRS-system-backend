const { loginUser, registerUser, logoutUser, refreshToken } = require('../controllers/auth.controller');


module.exports = async function authRoutes(req, res) {
  console.log("Hit /api/auth route:", req.method, req.url);
  const cleanUrl = req.url.split('?')[0].replace(/\/+$/, '');
  if (req.method === 'POST' && cleanUrl === '/api/auth/register') {
    console.log("Match register route");
    return registerUser(req, res);
  }

  if (req.method === 'POST' && req.url === '/api/auth/login') {
    return loginUser(req, res);
  }

  if (req.method === 'POST' && req.url === '/api/auth/logout') {
    return logoutUser(req, res);
  }

  if (req.method === 'POST' && req.url === '/api/auth/refresh-token') {
    return refreshToken(req, res);
  }

  // fallback if no match
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Auth route not found');
};
