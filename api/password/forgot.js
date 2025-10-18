import connectDB from '../../src/config/db';
import { forgotPassword } from '../../src/controllers/passwordController';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await connectDB();
    await forgotPassword(req, res);
  } catch (error) {
    console.error('API Error in /api/password/forgot:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}