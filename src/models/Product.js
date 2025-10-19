import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    unique: true,
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
  },
  quantity: {
    type: Number,
    required: [true, 'Please add a quantity'],
  },
  imageUrl: {
    type: String,
    required: [true, 'Please add an image URL'],
  },
  // You can add other fields like description here if you want
  // description: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// This line is crucial. It compiles the schema into a model and exports it as the default.
export default mongoose.model('Product', ProductSchema);
