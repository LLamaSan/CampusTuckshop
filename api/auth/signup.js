import connectDB from '../../src/config/db';
import { signup } from '../../src/controllers/authController';

export default async function handler(req, res) {
  await connectDB();
  return signup(req, res);
}
