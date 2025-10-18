// src/utils/helpers.js
function generateOrderId() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5);
    return `TSH${timestamp.slice(-6)}${random.toUpperCase()}`;
}

module.exports = { generateOrderId };