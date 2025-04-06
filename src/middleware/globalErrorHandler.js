export const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const status = statusCode >= 500 ? 'error' : 'fail';
  
    res.status(statusCode).json({
      status,
      message: err.message || 'Something went wrong',
      code: statusCode,
      details: err.details || null,
      // stack only in dev
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  };