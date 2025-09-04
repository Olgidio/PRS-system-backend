const { parseRequestBody } = require('../utils/requestUtils');
const { generateResponse } = require('../utils/responseUtils');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const connPool = require('../db');
const crypto = require('crypto');

// Email regex for basic format check
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mock gov validation function, should be replaced with actual gov API.
async function validateMerchantViaGov(vat_number) {
  // Simulate a real gov response for known VAT
  if (vat_number === 'GB123456789') {
    return {
      business_name: 'Boots UK Ltd',
      company_number: '01234567',
      status: 'active'
    };
  }

  throw new Error('Invalid or unregistered VAT number');
}

exports.registerUser = async (req, res) => {


  try {
    const body = await parseRequestBody(req);
    console.log("Registration body:", body);
    const {
      first_name,
      middle_name,
      last_name,
      email,
      password,
      mobile_phone,
      home_address,
      desired_role,
      vat_number,
      store_name,
      address,
      region,
      gov_otp
    } = body;
    console.log("registerUser triggered:", body);
    if (!first_name || !last_name || !email || !password) {
      return generateResponse(400, 'Missing required fields', null, res);
    }

    if (!emailRegex.test(email)) {
      return generateResponse(400, 'Invalid email format', null, res);
    }

    if (password.length < 8) {
      return generateResponse(400, 'Password must be at least 8 characters long', null, res);
    }

    
    let finalRoleId = 3; // default: public member

    let merchantData = null;

    if (desired_role === 'Merchant') {
      if (!vat_number || !store_name || !address) {
        return generateResponse(400, 'Missing required fields for merchant registration', null, res);
      }

      try {
        merchantData = await validateMerchantViaGov(vat_number);
        finalRoleId = 2;
      } catch (err) {
        return generateResponse(403, err.message, null, res);
      }
    }

    if (desired_role === 'Government Official') {
      if (gov_otp !== process.env.GOV_INVITE_CODE) {
        return generateResponse(403, 'Invalid government verification code', null, res);
      }
      finalRoleId = 1;
    }

  
    const hashedPassword = await bcrypt.hash(password, 10);
    const prs_id = crypto.randomUUID();
    console.log("🧪 Attempting to insert user with values:");
    console.log({
      prs_id,
      first_name,
      middle_name,
      last_name,
      email,
      password: '[HIDDEN]',
      mobile_phone,
      home_address,
      role_id: finalRoleId
    });

    const userInsert = `
      INSERT INTO users (
        prs_id, first_name, middle_name, last_name,
        email, password_hash, role_id, mobile_phone, home_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING user_id, email, first_name, last_name;
    `;

    const userValues = [
      prs_id,
      first_name,
      middle_name || null,
      last_name,
      email,
      hashedPassword,
      finalRoleId,
      mobile_phone,
      home_address
    ];

    const result = await connPool.query(userInsert, userValues);
    const user_id = result.rows[0].user_id;

    
    if (finalRoleId === 2 && merchantData) {
      const merchantInsert = `
        INSERT INTO merchants (
          user_id, store_name, business_vat, address, region,
          business_name, company_number, verified
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      `;
      await connPool.query(merchantInsert, [
        user_id,
        store_name,
        vat_number,
        address,
        region || null,
        merchantData.business_name,
        merchantData.company_number
      ]);
    }

    return generateResponse(201, 'User registered successfully', result.rows[0], res);
  } catch (err) {
    console.error('Registration error:', err);
    return generateResponse(500, 'Registration failed', null, res);
  }
};

exports.loginUser = async (req, res) => {
  try {
    const body = await parseRequestBody(req);
    console.log("Parsed login body:", body);

    const { email, password } = body;

    if (!email || !password) {
      return generateResponse(400, "Missing credentials", null, res); // Fixed: added null and res
    }

    const result = await connPool.query(
      `SELECT user_id, email, password_hash, prs_id, role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.role_id 
       WHERE u.email = $1`,
      [email]
    );

    if (result.rowCount === 0) {
      return generateResponse(401, "Invalid credentials", null, res); 
    }

    const user = result.rows[0];
    console.log("Fetched user:", user);

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return generateResponse(401, "Invalid credentials", null, res); 
    }

    const token = jwt.sign({
      user_id: user.user_id,
      prs_id: user.prs_id,
      email: user.email,
      role_name: user.role_name
    }, process.env.JWT_SECRET, { expiresIn: '1h' });


    return generateResponse(200, "Login successful", {
      token,
      role: user.role_name
    }, res);
  } 
  catch (err) {
    console.error("🔥 Login crash:", err.stack || err.message || err);
    return generateResponse(500, "Login failed", null, res); 
  }
};