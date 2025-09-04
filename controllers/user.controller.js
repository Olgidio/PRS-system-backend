const connPool = require('../db');
const jwt = require('jsonwebtoken');
const { parseRequestBody } = require('../utils/requestUtils');
const { generateResponse } = require('../utils/responseUtils');
const { encrypt } = require('../utils/encryptionUtils');
const { decrypt } = require('../utils/encryptionUtils');


// Extract and verify JWT from request
function getUserFromToken(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// GET /api/profile
exports.getProfile = async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return generateResponse(401, 'Unauthorized', null, res);

  try {
    const result = await connPool.query(
      `SELECT user_id, email, first_name, middle_name, last_name, home_address,
              mobile_phone, home_phone, work_phone, role_name          
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = $1`,
      [user.user_id]
    );

    if (result.rows.length === 0)
      return generateResponse(404, 'User not found', null, res);

    return generateResponse(200, 'User profile retrieved', { body: result.rows[0] }, res);
  } catch (err) {
    console.error(err);
    return generateResponse(500, 'Failed to retrieve profile', null, res);
  }
};

// PUT /api/profile
exports.updateProfile = async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return generateResponse(401, 'Unauthorized', null, res);

  try {
    const body = await parseRequestBody(req);
    const {
      first_name, middle_name, last_name,
      mobile_phone, home_phone, work_phone, home_address
    } = body;

    await connPool.query(
      `UPDATE users
       SET first_name = $1, middle_name = $2, last_name = $3,
           mobile_phone = $4, home_phone = $5, work_phone = $6,
           home_address = $7, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $8`,
      [first_name, middle_name, last_name, mobile_phone, home_phone, work_phone, home_address, user.user_id]
    );

    return getProfile(req, res);
  } catch (err) {
    console.error(err);
    return generateResponse(500, 'Failed to update profile', null, res);
  }
};

// POST /api/profile/identifiers
exports.updateIdentifiers = async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return generateResponse(401, 'Unauthorized', null, res);

  try {
    const body = await parseRequestBody(req);
    const {
      dob, passport_num, national_insurance_number,
      drivers_licence_number, nhs_number
    } = body;

    if (!dob) return generateResponse(400, 'Date of birth is required', null, res);

    const age = new Date().getFullYear() - new Date(dob).getFullYear();
    if (age >= 16 && !national_insurance_number)
      return generateResponse(400, 'NIN is required for users age 16+', null, res);

    const query = `
      INSERT INTO national_identifiers (
        user_id, prs_id, dob, passport_num, national_insurance_number,
        drivers_licence_number, nhs_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO UPDATE SET
        dob = EXCLUDED.dob,
        passport_num = EXCLUDED.passport_num,
        national_insurance_number = EXCLUDED.national_insurance_number,
        drivers_licence_number = EXCLUDED.drivers_licence_number,
        nhs_number = EXCLUDED.nhs_number,
        updated_at = CURRENT_TIMESTAMP
      RETURNING prs_id, dob, passport_num, national_insurance_number, drivers_licence_number, nhs_number;
    `;

    const values = [
      user.user_id,
      user.prs_id,
      encrypt(dob),
      passport_num ? encrypt(passport_num) : null,
      national_insurance_number ? encrypt(national_insurance_number.toString()) : null,
      drivers_licence_number ? encrypt(drivers_licence_number) : null,
      nhs_number ? encrypt(nhs_number.toString()) : null
    ];


    const result = await connPool.query(query, values);
    return generateResponse(200, 'Identifiers updated', { body: result.rows[0] }, res);
  } catch (err) {
    console.error(err);
    return generateResponse(500, 'Failed to update identifiers', null, res);
  }
};

// GET /api/profile/identifiers
exports.getIdentifiers = async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return generateResponse(401, 'Unauthorized', null, res);

  try {
    const result = await connPool.query(
      `SELECT dob, passport_num, national_insurance_number,
              drivers_licence_number, nhs_number
       FROM national_identifiers
       WHERE user_id = $1`,
      [user.user_id]
    );

    if (result.rows.length === 0)
      return generateResponse(404, 'No identifiers found', null, res);

    const raw = result.rows[0];

    const decrypted = {
      dob: raw.dob ? decrypt(raw.dob) : null,
      passport_num: raw.passport_num ? decrypt(raw.passport_num) : null,
      national_insurance_number: raw.national_insurance_number ? decrypt(raw.national_insurance_number) : null,
      drivers_licence_number: raw.drivers_licence_number ? decrypt(raw.drivers_licence_number) : null,
      nhs_number: raw.nhs_number ? decrypt(raw.nhs_number) : null
    };

    return generateResponse(200, 'Identifiers retrieved', { body: decrypted }, res);
  } 
    catch (err) {
    console.error(err);
    return generateResponse(500, 'Failed to retrieve identifiers', null, res);
  }
};

// DELETE /api/profile
exports.deleteUserAccount = async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return generateResponse(401, 'Unauthorized', null, res);

  try {
    await connPool.query('DELETE FROM users WHERE user_id = $1', [user.user_id]);
    return generateResponse(200, 'User account deleted', null, res);
  } catch (err) {
    console.error(err);
    return generateResponse(500, 'Failed to delete user account', null, res);
  }
};
