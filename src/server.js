require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

// --- Global Error Handlers (Keep these at the top) ---
process.on('uncaughtException', (err, origin) => {
  console.error('\n\nFATAL: Uncaught Exception:', err, 'Origin:', origin);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n\nFATAL: Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// --- Connect to Database ---
connectDB();

const app = express();

// --- Core Middleware (Order is important!) ---
// 1. CORS
// Defines which frontend URLs are allowed to make requests to this API.
const frontendUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
app.use(cors({ origin: [frontendUrl, 'http://localhost:3000'] }));

// 2. JSON Parser
// Allows the server to understand JSON data sent in request bodies.
app.use(express.json());

// 3. Static Files
// Serves the HTML, CSS, and JS files from the 'public' folder.
const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));
// --- End Core Middleware ---


// --- API Routes ---
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const passwordRoutes = require('./routes/password');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/password', passwordRoutes);

// --- Health Check Route ---
// A simple endpoint for the hosting platform (like Railway) to check if the app is alive.
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// --- Catch-all for Frontend Routing ---
// This ensures that if a user refreshes on a frontend route (e.g., /about),
// the server still sends the main index.html file to let the frontend handle the routing.
app.get('*', (req, res) => {
  res.sendFile(path.resolve(publicDir, 'index.html'));
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on host 0.0.0.0 and port ${PORT}`);
});

// --- AM I ALIVE? LOG (FOR DIAGNOSTICS) ---
// This will print a message every 10 seconds to prove the server process is still running.
setInterval(() => {
    console.log('Server is alive and running...');
}, 10000); // Log every 10 seconds

