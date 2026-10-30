function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

// Express 5 forwards errors from async handlers here automatically.
function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError' || err.name === 'CastError')
    return res.status(400).json({ error: err.message });
  if (err.code === 11000)
    return res.status(409).json({ error: 'Duplicate record' });
  console.error(err);
  res.status(500).json({ error: 'Server error' });
}

module.exports = { notFound, errorHandler };
