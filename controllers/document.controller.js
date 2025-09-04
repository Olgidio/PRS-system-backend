const AWS = require('aws-sdk');
const { parse } = require('url');
const { parseRequestBody } = require('../utils/requestUtils');
const { generateResponse } = require('../utils/responseUtils');
const { verifyToken } = require('../middleware/auth.middleware');
const connPool = require('../db');
const crypto = require('crypto');

// Configure AWS S3
const s3 = new AWS.S3({
  region: process.env.AWS_REGION
});
const bucketName = process.env.S3_BUCKET_NAME;

// POST /api/documents/upload
exports.uploadDocument = async (req, res) => {
  const auth = verifyToken(req);
  if (!auth.valid) return generateResponse(401, auth.error, null, res);

  try {
    const body = await parseRequestBody(req); // assumes base64 or binary string
    const { file_name, file_data } = body;

    if (!file_name || !file_data) {
      return generateResponse(400, 'file_name and file_data are required', null, res);
    }

    const buffer = Buffer.from(file_data, 'base64');
    const s3Key = `${auth.decoded_tok.prs_id}/${crypto.randomUUID()}-${file_name}`;

    await s3.putObject({
      Bucket: bucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: 'application/octet-stream'
    }).promise();

    await connPool.query(
      `INSERT INTO documents (user_id, file_name, s3_key) VALUES ($1, $2, $3)`,
      [auth.decoded_tok.user_id, file_name, s3Key]
    );

    return generateResponse(201, 'File uploaded successfully', { s3_key: s3Key }, res);
  } catch (err) {
    console.error(err);
    return generateResponse(500, 'Failed to upload file', null, res);
  }
};

// GET /api/documents
exports.getDocumentsByUser = async (req, res) => {
  const auth = verifyToken(req);
  if (!auth.valid) return generateResponse(401, auth.error, null, res);

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    const totalResult = await connPool.query(
      `SELECT COUNT(*) FROM documents WHERE user_id = $1`,
      [auth.decoded_tok.user_id]
    );
    const total = parseInt(totalResult.rows[0].count);

    const result = await connPool.query(
      `SELECT document_id, file_name, s3_key, uploaded_at
       FROM documents
       WHERE user_id = $1
       ORDER BY uploaded_at DESC
       LIMIT $2 OFFSET $3`,
      [auth.decoded_tok.user_id, limit, offset]
    );

    return generateResponse(200, 'Documents retrieved', {
      data: result.rows,
      page,
      totalPages: Math.ceil(total / limit),
      total
    }, res);
  } catch (err) {
    console.error(err);
    return generateResponse(500, 'Failed to fetch documents', null, res);
  }
};


// DELETE /api/documents/:document_id
exports.deleteDocument = async (req, res) => {
  const auth = verifyToken(req);
  if (!auth.valid) return generateResponse(401, auth.error, null, res);

  const docId = parse(req.url, true).pathname.split('/').pop();

  try {
    const result = await connPool.query(
      `SELECT s3_key FROM documents WHERE document_id = $1 AND user_id = $2`,
      [docId, auth.decoded_tok.user_id]
    );

    if (result.rows.length === 0) {
      return generateResponse(404, 'Document not found or access denied', null, res);
    }

    const { s3_key } = result.rows[0];

    await s3.deleteObject({
      Bucket: bucketName,
      Key: s3_key
    }).promise();

    await connPool.query(
      `DELETE FROM documents WHERE document_id = $1 AND user_id = $2`,
      [docId, auth.decoded_tok.user_id]
    );

    return generateResponse(200, 'Document deleted', null, res);
  } 
    catch (err) {
    console.error(err);
    return generateResponse(500, 'Failed to delete document', null, res);
  }
};
