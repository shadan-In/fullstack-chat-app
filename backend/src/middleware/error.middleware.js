/**
 * Custom error handling middleware
 * This middleware catches errors that occur during request processing
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Check for path-to-regexp errors
  if (err.message && err.message.includes('Missing parameter name')) {
    return res.status(400).json({
      error: 'Invalid URL format',
      message: 'The URL contains invalid characters or format'
    });
  }
  
  // Handle other types of errors
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

/**
 * 404 Not Found middleware
 * This middleware handles requests to routes that don't exist
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
