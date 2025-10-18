import connectDB from '../src/config/db.js';
import { getAllOrders, placeOrder } from '../src/controllers/orderController.js';
import authenticateToken from '../src/middleware/authenticateToken.js';

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
    
    // All order routes are protected
    await runMiddleware(req, res, authenticateToken);

    // Get the last part of the URL (e.g., 'orders', 'place')
    const path = req.url.split('/').pop();
    
    if (path === 'orders' && req.method === 'GET') {
      return await getAllOrders(req, res);
    }
    
    if (path === 'place' && req.method === 'POST') {
      return await placeOrder(req, res);
    }

    // If no route matches
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} or Path /${path} Not Allowed`);

  } catch (error) {
    console.error(`API Error in /api/orders for ${req.method} ${req.url}:`, error);
    if (!res.headersSent) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
  }
}