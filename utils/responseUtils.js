exports.generateResponse = (code = 200, msg = "", data = null, res) => {
  if (code === 500) {
    console.error('Server Error:', msg);
  } else if ([400, 401, 403, 404].includes(code)) {
    console.warn('Warning:', msg);
  }

  const response = {
    status: code,
    message: msg
  };

  if (data !== null) {
    response.body = data.body ? { ...data } : data;
  }

  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(response));
};
