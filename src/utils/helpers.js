// src/utils/helpers.js
// This function creates a simple, unique order ID.
// Example output: TSH-123456-ABC
export const generateOrderId = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5); // Use substr for compatibility
    return `TSH${timestamp.slice(-6)}${random.toUpperCase()}`;
};

