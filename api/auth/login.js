import connectDB from '../../src/config/db'; // Adjust path if needed
import { login } from '../../src/controllers/authController'; // Adjust path

export default async function handler(req, res) {
  await connectDB();
  // Call the existing login function from your controller
  return login(req, res);
}

