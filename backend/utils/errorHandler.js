function sendSuccess(res, message, data = null, statusCode = 200) {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
}

function sendError(res, statusCode, message, data = null) {
  const payload = { success: false, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
}

function mapPrismaError(err) {
  const code = err.code || '';
  const message = err.message || '';

  if (code === 'P2025') {
    return { status: 404, message: 'Record not found' };
  }
  if (code === 'P2002') {
    const target = err.meta?.target || [];
    if (target.includes('email')) return { status: 409, message: 'A member with this email already exists' };
    if (target.includes('national_id')) return { status: 409, message: 'A member with this national ID already exists' };
    return { status: 409, message: 'Duplicate record detected' };
  }
  if (code === 'P2003') {
    return { status: 400, message: 'Invalid reference: related record does not exist' };
  }
  if (code === 'P2014') {
    return { status: 400, message: 'Operation failed due to related records' };
  }
  if (code === 'P2023') {
    return { status: 400, message: 'Invalid format for the provided value' };
  }

  if (message.includes('Foreign key constraint') || message.includes('violates foreign key')) {
    return { status: 400, message: 'Invalid reference to related record' };
  }
  if (message.includes('Unique constraint') || message.includes('already exists')) {
    return { status: 409, message: 'Duplicate record detected' };
  }
  if (message.includes('Check constraint')) {
    return { status: 400, message: 'Invalid data provided' };
  }

  return { status: 500, message: 'An unexpected error occurred. Please try again later.' };
}

function handlePrismaError(res, err, context = '') {
  if (context) console.error(`[${context}]`, err.message);
  else console.error(err.message);

  const mapped = mapPrismaError(err);
  return sendError(res, mapped.status, mapped.message);
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(err => {
      handlePrismaError(res, err);
    });
  };
}

module.exports = { sendSuccess, sendError, handlePrismaError, asyncHandler };
