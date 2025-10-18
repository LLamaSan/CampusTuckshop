import connectDB from '../src/config/db';
import {
  getAllProducts,
  addProduct,
  deleteProductByName,
  renameProduct,
  bulkCategoryUpdate,
  bulkUpdateDetails,
  categoryByPattern
  // Import any other controllers you had, like updatePrice, updateQuantity, etc.
} from '../src/controllers/productController';

export default async function handler(req, res) {
  try {
    await connectDB();

    // Vercel puts all URL parts after 'products/' into req.query.slug
    // e.g., /api/products/rename -> req.query.slug = ['rename']
    // e.g., /api/products/some-product-name -> req.query.slug = ['some-product-name']
    // e.g., /api/products -> req.query.slug = undefined
    
    const slug = req.query.slug;
    let path;
    
    if (!slug) {
      // This is a request to /api/products
      if (req.method === 'GET') {
        return await getAllProducts(req, res);
      }
      if (req.method === 'POST') {
        return await addProduct(req, res);
      }
    } else {
      // This is a request to /api/products/...
      path = slug[0]; // Get the first part, e.g., 'rename' or 'some-product-name'
      
      // Handle specific PUT routes
      if (req.method === 'PUT') {
        switch (path) {
          case 'rename':
            return await renameProduct(req, res);
          case 'bulk-category-update':
            return await bulkCategoryUpdate(req, res);
          case 'bulk-update-details':
            return await bulkUpdateDetails(req, res);
          case 'category-by-pattern':
            return await categoryByPattern(req, res);
          // Add cases for 'update-price', 'update-quantity', etc.
        }
      }
      
      // Handle GET by category (assuming you have a file for this)
      if (req.method === 'GET') {
        // We assume if it's not a known path, it's a category request.
        // You might need to adjust this logic based on your controller.
        // req.params = { category: path };
        // return await getProductsByCategory(req, res);
      }

      // Handle DELETE by name. This is the catch-all for /api/products/[name]
      if (req.method === 'DELETE') {
        // This is /api/products/[name]
        // The old [name].js expected req.query.name.
        // req.query.slug will be ['product-name']
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