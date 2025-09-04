const { parse } = require('url');
const itemCatalogController = require('../controllers/itemCatalog.controller');
const { generateResponse } = require('../utils/responseUtils');

module.exports = async function handleItemCatalogRoutes(req, res) {
  const { pathname } = parse(req.url, true);
  const method = req.method;

  // GET /api/item-catalog
  if (method === 'GET' && pathname === '/api/item-catalog') {
    return itemCatalogController.getItemCatalog(req, res);
  }

  return false; // Not matched
};
