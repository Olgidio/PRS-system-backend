require('dotenv').config();
const http = require('http');
const url = require('url');

const connPool = require('./db');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const documentRoutes = require('./routes/document.routes');
const vaccinationRoutes = require('./routes/vaccination.routes');
const merchantRoutes = require('./routes/merchant.routes');
const handleItemCatalogRoutes = require('./routes/item-catalog.routes.js');
const encryptionRoutes = require('./routes/encryption.routes.js');
const govRoutes = require('./routes/gov.routes');
const auditRoutes = require('./routes/audit.routes');
const orderRoutes = require('./routes/orders.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const testRoutes = require('./routes/test.routes');

const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'https://www.pandemic-rs.org',
  'https://prs-frontend-gamma.vercel.app'
];

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const pathname = parsedUrl.pathname;
  const origin = req.headers.origin;


  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }


  if (await testRoutes(req, res)) return;
  if (await handleItemCatalogRoutes(req, res)) return;
  if (pathname.startsWith('/api/encryption')) return encryptionRoutes(req, res);
  if (pathname.startsWith('/api/profile')) return userRoutes(req, res);
  if (pathname.startsWith('/api/auth')) return authRoutes(req, res);
  if (pathname.startsWith('/api/documents')) return documentRoutes(req, res);
  if (pathname.startsWith('/api/merchants')) return merchantRoutes(req, res);
  if (pathname.startsWith('/api/vaccinations')) return vaccinationRoutes(req, res);
  if (pathname.startsWith('/api/inventory')) return inventoryRoutes(req, res);
  if (pathname.startsWith('/api/gov')) return govRoutes(req, res);
  if (pathname.startsWith('/api/audit')) return auditRoutes(req, res);
  if (pathname.startsWith('/api/orders')) return orderRoutes(req, res);

  if (pathname === '/' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('PRS backend is live on EC2');
    return;
  }

  // fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Route not found');
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
