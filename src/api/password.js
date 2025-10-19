import connectDB from './config/db.js';
import { forgotPassword, verifyResetToken, resetPassword } from './controllers/passwordController.js';

export default async function handler(req, res) {
  try {
    await connectDB();
    
    const path = req.url.split('/').pop();

    if (req.method === 'POST') {
      switch (path) {
        case 'forgot':
          return await forgotPassword(req, res);
        case 'verify-token':
          return await verifyResetToken(req, res);
        case 'reset':
          return await resetPassword(req, res);
      }
    }

    // If no route matches
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} or Path /${path} Not Allowed`);

  } catch (error) {
    console.error(`API Error in /api/password for path ${path}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}