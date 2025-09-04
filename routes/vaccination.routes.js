const { parse } = require('url');
const vaccinationController = require('../controllers/vaccination.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { parseRequestBody } = require('../utils/requestUtils');
const { generateResponse } = require('../utils/responseUtils');

module.exports = async function handleVaccinationRoutes(req, res) {
  const { pathname, query } = parse(req.url, true);
  const method = req.method;

  const auth = verifyToken(req);
  if (!auth.valid) return generateResponse(401, auth.error, null, res);

  // POST /api/vaccinations/upload
  if (method === 'POST' && pathname === '/api/vaccinations/upload') {
    return vaccinationController.uploadVaccinationData(req, res, auth);
  }

  // GET /api/vaccinations/:prs_id
  if (method === 'GET' && pathname.startsWith('/api/vaccinations/')) {
    const parts = pathname.split('/');
    if (parts.length === 4 && parts[2] !== 'compliance-report') {
      const prs_id = parts[3];
      return vaccinationController.getVaccinationsByPrsId(req, res, prs_id, auth);
    }
  }

  // GET /api/vaccinations
  if (method === 'GET' && pathname === '/api/vaccinations') {
    return vaccinationController.getAllVaccinations(req, res, query, auth);
  }

  // DELETE /api/vaccinations/:record_id
  if (method === 'DELETE' && pathname.startsWith('/api/vaccinations/')) {
    const record_id = pathname.split('/').pop();
    return vaccinationController.deleteVaccinationRecord(req, res, record_id, auth);
  }

  // PUT /api/vaccinations/:record_id
  if (method === 'PUT' && pathname.startsWith('/api/vaccinations/')) {
    const record_id = pathname.split('/').pop();
    return vaccinationController.updateVaccinationRecord(req, res, record_id, auth);
  }

  return false; // Not handled
};
