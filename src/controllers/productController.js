const Product = require('../models/Product');

// GET /api/products - Get all products
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ category: 1, name: 1 });
        res.json({ success: true, products });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, message: 'Error fetching products' });
    }
};

// POST /api/products - Add a new product
exports.addProduct = async (req, res) => {
    try {
        const { name, price, quantity, imageUrl, category } = req.body;
        
        if (!name || !price || quantity == null || !imageUrl) {
            return res.status(400).json({ 
                success: false, 
                message: 'All product fields are required (name, price, quantity, imageUrl)' 
            });
        }

        const product = new Product({ 
            name, 
            price, 
            quantity, 
            imageUrl, 
            category: category || 'Snacks' 
        });
        
        await product.save();
        console.log(`✅ Product added: ${name} - Quantity: ${quantity}`);
        
        res.status(201).json({ 
            success: true, 
            message: 'Product added successfully',
            product 
        });
    } catch (error) {
        console.error('Error adding product:', error);
        if (error.code === 11000) {
            res.status(400).json({ success: false, message: 'Product name already exists' });
        } else {
            res.status(500).json({ success: false, message: 'Error adding product' });
        }
    }
};

// PUT /api/products/update-quantity - Update a single product's quantity
exports.updateQuantity = async (req, res) => {
    try {
        const { name, quantity } = req.body;

        if (!name || quantity == null) {
            return res.status(400).json({ success: false, message: 'Name and quantity are required' });
        }

        const product = await Product.findOneAndUpdate(
            { name },
            { quantity },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, message: 'Quantity updated', product });

    } catch (error) {
        console.error('Update quantity error:', error);
        res.status(500).json({ success: false, message: 'Server error during quantity update' });
    }
};

// PUT /api/products/update-price - Update a single product's price
exports.updatePrice = async (req, res) => {
    try {
        const { name, price } = req.body;

        if (!name || price == null) {
            return res.status(400).json({ success: false, message: 'Name and price are required' });
        }

        const product = await Product.findOneAndUpdate(
            { name },
            { price },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, message: 'Price updated', product });

    } catch (error) {
        console.error('Update price error:', error);
        res.status(500).json({ success: false, message: 'Server error during price update' });
    }
};

// PUT /api/products/bulk-update-details - Bulk update multiple products
exports.bulkUpdateDetails = async (req, res) => {
    try {
        const { updates } = req.body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Updates array is required' });
        }

        const results = [];
        const errors = [];

        for (const { name, category, quantity, price } of updates) {
            if (!name) {
                errors.push('Missing name in update');
                continue;
            }

            const query = { name };
            if (category) query.category = category;

            const updateFields = {};
            if (quantity != null) updateFields.quantity = quantity;
            if (price != null) updateFields.price = price;

            if (Object.keys(updateFields).length === 0) {
                errors.push(`No valid fields to update for product: ${name}`);
                continue;
            }

            const updated = await Product.findOneAndUpdate(query, updateFields, { new: true });

            if (!updated) {
                errors.push(`Product not found: ${name} ${category ? `(Category: ${category})` : ''}`);
            } else {
                results.push({ name, updated });
                console.log(`🔄 Updated ${name}:`, updateFields);
            }
        }

        res.json({
            success: errors.length === 0,
            updatedCount: results.length,
            errors,
            results
        });

    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({ success: false, message: 'Server error during bulk update' });
    }
};

// POST /api/products/bulk-add - Bulk add new products
exports.bulkAddProducts = async (req, res) => {
    try {
        const { products } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ success: false, message: 'Products array is required' });
        }

        const created = [];
        const errors = [];

        for (const productData of products) {
            const { name, price, quantity, imageUrl, category } = productData;

            if (!name || price == null || quantity == null || !imageUrl) {
                errors.push({ product: name || '(unknown)', message: 'Missing required fields' });
                continue;
            }

            try {
                const newProduct = new Product({
                    name,
                    price,
                    quantity,
                    imageUrl,
                    category: category || 'Snacks'
                });

                await newProduct.save();
                created.push(newProduct);
                console.log(`✅ Bulk added: ${name}`);
            } catch (err) {
                errors.push({ product: name, message: err.message });
            }
        }

        res.status(201).json({
            success: errors.length === 0,
            createdCount: created.length,
            errors,
            created
        });

    } catch (error) {
        console.error('Bulk add error:', error);
        res.status(500).json({ success: false, message: 'Server error during bulk add' });
    }
};

// PUT /api/products/rename - Rename a product
exports.renameProduct = async (req, res) => {
    try {
        const { oldName, newName } = req.body;

        if (!oldName || !newName) {
            return res.status(400).json({ success: false, message: 'oldName and newName are required' });
        }

        const existing = await Product.findOne({ name: newName });
        if (existing) {
            return res.status(400).json({ success: false, message: 'A product with the new name already exists' });
        }

        const updated = await Product.findOneAndUpdate(
            { name: oldName },
            { name: newName },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Product with old name not found' });
        }

        res.json({ success: true, message: `Renamed ${oldName} to ${newName}`, product: updated });

    } catch (error) {
        console.error('Rename error:', error);
        res.status(500).json({ success: false, message: 'Server error during rename' });
    }
};

// PUT /api/products/bulk-category-update - Bulk update product categories
exports.bulkCategoryUpdate = async (req, res) => {
    try {
        const { updates } = req.body;
        
        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Updates array is required' });
        }

        const validCategories = ['Snacks', 'Stationery', 'Drinks'];
        const results = [];
        const errors = [];

        for (const update of updates) {
            try {
                const { name, category } = update;
                if (!name || !category) {
                    errors.push(`Missing name or category: ${JSON.stringify(update)}`);
                    continue;
                }
                if (!validCategories.includes(category)) {
                    errors.push(`Invalid category "${category}" for product "${name}"`);
                    continue;
                }
                const product = await Product.findOneAndUpdate({ name }, { category }, { new: true });
                if (!product) {
                    errors.push(`Product not found: ${name}`);
                } else {
                    results.push({ name: product.name, newCategory: product.category, success: true });
                    console.log(`📂 Category updated: ${name} → ${category}`);
                }
            } catch (updateError) {
                errors.push(`Error updating ${update.name}: ${updateError.message}`);
            }
        }

        res.json({
            success: errors.length === 0,
            message: `Updated ${results.length} products`,
            results,
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error) {
        console.error('Bulk category update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// PUT /api/products/category-by-pattern - Update categories by pattern
exports.categoryByPattern = async (req, res) => {
    try {
        const { pattern, newCategory, matchType = 'contains' } = req.body;
        
        if (!pattern || !newCategory) {
            return res.status(400).json({ success: false, message: 'Pattern and newCategory are required' });
        }

        const validCategories = ['Snacks', 'Stationery', 'Drinks'];
        if (!validCategories.includes(newCategory)) {
            return res.status(400).json({ success: false, message: 'Invalid category' });
        }

        let query;
        const escapedPattern = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        switch (matchType) {
            case 'startsWith': query = { name: { $regex: `^${escapedPattern}`, $options: 'i' } }; break;
            case 'endsWith': query = { name: { $regex: `${escapedPattern}$`, $options: 'i' } }; break;
            default: query = { name: { $regex: escapedPattern, $options: 'i' } }; break;
        }

        const result = await Product.updateMany(query, { category: newCategory });

        console.log(`📂 Bulk pattern update: ${result.modifiedCount} products updated to ${newCategory}`);
        res.json({ success: true, modifiedCount: result.modifiedCount });

    } catch (error) {
        console.error('Pattern-based category update error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// DELETE /api/products/:name - Delete a product by name
exports.deleteProductByName = async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.name);
        const deleted = await Product.findOneAndDelete({ name });
        
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        console.log(`🗑️ Product deleted: ${name}`);
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: 'Error deleting product' });
    }
};

// DELETE /api/products/category/:category - Delete all products in a category
exports.deleteProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const validCategories = ['Snacks', 'Stationery', 'Drinks'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ success: false, message: 'Invalid category' });
        }
        
        const result = await Product.deleteMany({ category });
        
        console.log(`🗑️ Deleted ${result.deletedCount} products from category: ${category}`);
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ success: false, message: 'Error deleting category' });
    }
};


