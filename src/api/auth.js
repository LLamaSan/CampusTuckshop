import connectDB from '../config/db.js';
import { login, signup, verifyToken } from '../controllers/authController.js';
import authenticateToken from '../middleware/authenticateToken.js';

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
  try {
    await connectDB();
    
    // Get the last part of the URL (e.g., 'login', 'signup', 'verify-token')
    const path = req.url.split('/').pop();

    switch (path) {
      case 'login':
        if (req.method === 'POST') return await login(req, res);
        break;
      case 'signup':
        if (req.method === 'POST') return await signup(req, res);
        break;
      case 'verify-token':
        if (req.method === 'POST') {
          await runMiddleware(req, res, authenticateToken);
          return await verifyToken(req, res);
        }
        break;
    }
    
    // If no route matches
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} or Path /${path} Not Allowed`);

  } catch (error) {
    console.error(`API Error in /api/auth for path ${path}:`, error);
    if (!res.headersSent) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
  }
}