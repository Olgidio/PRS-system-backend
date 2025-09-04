const connPool = require('../db');
const { parseRequestBody } = require('../utils/requestUtils');
const { generateResponse } = require('../utils/responseUtils');

// helper to fetch key
async function getActiveKey(key_type) {
  const result = await connPool.query(
    `SELECT key_value FROM encryption_keys 
     WHERE key_type = $1 AND is_active = true 
     ORDER BY created_date DESC LIMIT 1`,
    [key_type]
  );

  if (result.rows.length === 0) throw new Error('No active key found');
  return result.rows[0].key_value;
}

exports.encryptData = async (req, res, auth) => {
  try {
    const body = await parseRequestBody(req);
    const { plain_text, key_type } = body;

    if (!plain_text || !key_type) {
      return generateResponse(400, 'Missing plain_text or key_type', null, res);
    }

    const key = await getActiveKey(key_type);

    const result = await connPool.query(
      `SELECT pgp_sym_encrypt($1, $2) AS encrypted`,
      [plain_text, key]
    );

    return generateResponse(200, 'Data encrypted', { encrypted: result.rows[0].encrypted }, res);
  } catch (err) {
    console.error('Encryption error:', err);
    return generateResponse(500, err.message || 'Internal server error', null, res);
  }
};

exports.decryptData = async (req, res, auth) => {
  try {
    const body = await parseRequestBody(req);
    const { encrypted, key_type } = body;

    if (!encrypted || !key_type) {
      return generateResponse(400, 'Missing encrypted or key_type', null, res);
    }

    const key = await getActiveKey(key_type);

    const result = await connPool.query(
      `SELECT pgp_sym_decrypt($1::bytea, $2) AS decrypted`,
      [encrypted, key]
    );

    return generateResponse(200, 'Data decrypted', { decrypted: result.rows[0].decrypted }, res);
  } catch (err) {
    console.error('Decryption error:', err);
    return generateResponse(500, err.message || 'Internal server error', null, res);
  }
};

exports.rotateKey = async (req, res, auth) => {
  try {
    const body = await parseRequestBody(req);
    const { key_type, new_key_value } = body;

    if (!key_type || !new_key_value) {
      return generateResponse(400, 'Missing key_type or new_key_value', null, res);
    }

    if (auth.role_name !== 'Government Official') {
      return generateResponse(403, 'Forbidden: Only government can rotate keys', null, res);
    }

    const client = await connPool.connect();
    try {
      await client.query('BEGIN');

      // Step 1: deactivate previous active keys
      await client.query(
        `UPDATE encryption_keys SET is_active = false 
         WHERE key_type = $1 AND is_active = true`,
        [key_type]
      );

      // Step 2: insert new key
      const insertQuery = `
        INSERT INTO encryption_keys (key_type, key_value, scope, is_active)
        VALUES ($1, $2, $3, true)
        RETURNING key_id, created_date
      `;
      const result = await client.query(insertQuery, [key_type, new_key_value, key_type]);

      await client.query('COMMIT');
      return generateResponse(201, 'Key rotated successfully', result.rows[0], res);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Key rotation error:', err);
    return generateResponse(500, err.message || 'Internal server error', null, res);
  }
};
