import connectDB from '../../src/config/db';
import { verifyResetToken } from '../../src/controllers/passwordController';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await connectDB();
    await verifyResetToken(req, res);
  } catch (error) {
    console.error('API Error in /api/password/verify-token:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}