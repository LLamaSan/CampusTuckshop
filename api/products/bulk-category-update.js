import connectDB from '../../src/config/db';
import { bulkCategoryUpdate } from '../../src/controllers/productController';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).end('Method Not Allowed');
  }
  await connectDB();
  return bulkCategoryUpdate(req, res);
}
