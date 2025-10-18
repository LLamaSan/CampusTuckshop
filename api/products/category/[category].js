import connectDB from '../../../src/config/db';
import { deleteProductsByCategory } from '../../../src/controllers/productController';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await connectDB();
  // Add the dynamic [category] value from req.query to req.params
  // so the existing controller function works without changes.
  req.params = { category: req.query.category };
  return deleteProductsByCategory(req, res);
}
