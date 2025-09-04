const jwt = require('jsonwebtoken');

function verifyToken(req) 
{
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) 
        {
        return {valid: false, error: "No token provided"};
        }
    const token = authHeader.split(" ")[1];
    try 
        {
            const decoded_tok = jwt.verify(token, process.env.JWT_SECRET);
            return {valid: true, decoded_tok}
        }
    catch(err)
        {
            return {valid: false, error: "Invalid token"};
        }
}

module.exports = {verifyToken};