import connectDB from '../../src/config/db';
import { verifyToken } from '../../src/controllers/authController';
import authenticateToken from '../../src/middleware/authenticateToken';

// Helper function to run middleware in Vercel
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  
  try {
    await connectDB();
    // First, run the authentication middleware
    await runMiddleware(req, res, authenticateToken);
    // If middleware is successful, run the controller function
    await verifyToken(req, res);
  } catch (error) {
    console.error('API Error in /api/auth/verify-token:', error);
    // If the error is from the middleware, it might already have sent a response.
    if (!res.headersSent) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
  }
}
