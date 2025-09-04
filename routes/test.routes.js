const { testDbReach } = require('../controllers/test.controller');

module.exports = async function testRoutes(req, res) {
  if (req.method === 'GET' && req.url === '/api/test-db') {
    await testDbReach(req, res);
    return true;
  }
  return false;
};
