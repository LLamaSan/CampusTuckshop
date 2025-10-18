// src/server.js
require('dotenv').config(); // Load env vars early
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db'); // Import DB connection function

// --- Global Error Handlers (Keep these at the top) ---
process.on('uncaughtException', (err, origin) => {
  console.error(`\n\nFATAL: Uncaught Exception:`);
  console.error(err);
  console.error(`Exception origin: ${origin}`);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error(`\n\nFATAL: Unhandled Rejection at:`);
  console.error(promise);
  console.error(`Reason: ${reason}`);
  process.exit(1);
});
// --- End Global Error Handlers ---

// --- Connect to Database ---
connectDB();
// --- End Database Connection ---

const app = express();

// --- Core Middleware ---
app.use(express.json()); // For parsing application/json

// Configure CORS - Use the Railway public domain for production
const allowedOrigins = [
    'http://localhost:3000', // Your local dev frontend (if different port)
    // Add other origins if needed
];
if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    allowedOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
} else if (process.env.FRONTEND_URL) { // Fallback if Railway var isn't set yet
    allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true // If you need cookies/sessions
}));

// Serve static files from 'public' directory (resolve path correctly)
const publicPathDirectory = path.resolve(__dirname, '..', 'public'); // Go up one level from src/
console.log(`Serving static files from: ${publicPathDirectory}`);
app.use(express.static(publicPathDirectory));
// --- End Core Middleware ---

// --- API Routes ---
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const passwordRoutes = require('./routes/password');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/password', passwordRoutes); // Use a distinct path like /api/password

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
// --- End API Routes ---

// --- Catch-all for SPA routing (if needed, otherwise static serves index.html) ---
// If your frontend uses client-side routing, uncomment this:
/*
app.get('*', (req, res) => {
  res.sendFile(path.resolve(publicPathDirectory, 'index.html'));
});
*/
// --- End Catch-all ---


// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on host 0.0.0.0 and port ${PORT}`);
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        console.log(`App live at: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
    } else {
        console.log(`Access local dev at: http://localhost:${PORT}`);
    }
});
// --- End Start Server ---

// Optional: Graceful shutdown
process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    } catch (err) {
        console.error('Error closing MongoDB connection:', err);
    } finally {
        process.exit(0);
    }
});