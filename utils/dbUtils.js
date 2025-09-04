// utils/dbUtils.js

const connPool = require('../db');

async function getPrsIdByUserId(user_id) {
  const pgQuery = 'SELECT prs_id FROM users WHERE user_id = $1';
  const { rows } = await connPool.query(pgQuery, [user_id]);

  if (rows.length === 0) {
    throw new Error('User not found in PostgreSQL');
  }

  return rows[0].prs_id;
}

module.exports = {
  getPrsIdByUserId
};
