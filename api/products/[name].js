import connectDB from '../../src/config/db';
import { deleteProductByName } from '../../src/controllers/productController';

export default async function handler(req, res) {
  // This endpoint is only for deleting a product
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await connectDB();

    // Vercel puts the dynamic part of the URL (the product name) in req.query.
    // Our existing controller function expects it in req.params.
    // This line makes them compatible without changing the controller.
    req.params = { name: req.query.name };

    // Now, call the existing controller function which will handle the rest.
    await deleteProductByName(req, res);
  } catch (error) {
    console.error(`API Error in /api/products/[name] for ${req.query.name}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}

