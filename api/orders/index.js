import connectDB from '../../src/config/db';
import { getAllOrders } from '../../src/controllers/orderController';
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
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await connectDB();
    // Run authentication middleware
    await runMiddleware(req, res, authenticateToken);
    // If middleware passes, get the orders
    await getAllOrders(req, res);
  } catch (error) {
    console.error('API Error in /api/orders (GET):', error);
    if (!res.headersSent) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
  }
}