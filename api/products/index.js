import connectDB from '../../src/config/db';
import { getAllProducts, addProduct } from '../../src/controllers/productController';

export default async function handler(req, res) {
  try {
    await connectDB();

    switch (req.method) {
      case 'GET':
        await getAllProducts(req, res);
        break;
      case 'POST':
        await addProduct(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`API Error in /api/products (${req.method}):`, error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}
