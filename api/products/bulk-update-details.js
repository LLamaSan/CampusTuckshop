import connectDB from '../../src/config/db';
import { bulkUpdateDetails } from '../../src/controllers/productController';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).end('Method Not Allowed');
  }
  await connectDB();
  return bulkUpdateDetails(req, res);
}
