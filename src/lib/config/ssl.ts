// Disable SSL certificate verification in development
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export const sslConfig = {
  rejectUnauthorized: process.env.NODE_ENV !== 'development'
}; 