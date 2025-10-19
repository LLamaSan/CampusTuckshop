import connectDB from '../src/config/db.js';
import authenticateToken from '../src/middleware/authenticateToken.js';
import {
  getAllProducts,
  addProduct,
  deleteProductByName,
  renameProduct,
  bulkCategoryUpdate,
  bulkUpdateDetails,
  categoryByPattern,
  bulkAddProducts 
  // Import any other controllers you had...
} from '../src/controllers/productController.js';

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

    const slug = req.query.slug;
    let path;
    
    if (!slug) {
      // This is a request to /api/products
      if (req.method === 'GET') {
        return await getAllProducts(req, res);
      }
      if (req.method === 'POST') {
        // You should probably protect this route too
        // await runMiddleware(req, res, authenticateToken);
        return await addProduct(req, res);
      }
    } else {
      // This is a request to /api/products/...
      path = slug[0]; // Get the first part, e.g., 'rename' or 'bulk-add'
      
      // Handle specific POST routes
      if (req.method === 'POST') {
        if (path === 'bulk-add') {
          // Protect this admin-only route
          await runMiddleware(req, res, authenticateToken);
          return await bulkAddProducts(req, res);
        }
      }

      // Handle specific PUT routes
      if (req.method === 'PUT') {
        // You should protect these admin routes too
        // await runMiddleware(req, res, authenticateToken);
        switch (path) {
          case 'rename':
            return await renameProduct(req, res);
          case 'bulk-category-update':
            return await bulkCategoryUpdate(req, res);
          case 'bulk-update-details':
            return await bulkUpdateDetails(req, res);
          case 'category-by-pattern':
            return await categoryByPattern(req, res);
        }
      }

      // Handle DELETE by name.
      if (req.method === 'DELETE') {
        // Protect this admin-only route
        // await runMiddleware(req, res, authenticateToken);
        req.params = { name: path }; 
        return await deleteProductByName(req, res);
      }
    }
    
    // If no route matches
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} or Path /${path} Not Allowed`);

  } catch (error) {
    console.error(`API Error in /api/products for ${req.method} ${req.url}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  }
}