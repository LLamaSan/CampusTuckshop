// Use modern ES Module syntax
import * as brevo from '@getbrevo/brevo';
import User from '../models/User.js';
import Product from '../models/Product.js'; // Import Product model to get image URLs

// --- Configuration ---
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'no-reply@yourdomain.com';
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'Campus Tuckshop';

let apiInstance;
if (BREVO_API_KEY) {
    apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
} else {
    console.error('⚠️ BREVO_API_KEY is not set. Emails will not be sent.');
}

const sender = {
    email: BREVO_FROM_EMAIL,
    name: BREVO_FROM_NAME
};
// --- Main Decorative Template Function (Redesigned) ---
const createHtmlTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #1a1a2e; font-family: 'Roboto', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 20px auto; border: 1px solid #2c2c54; border-radius: 10px; overflow: hidden; background-color: #16213e; color: #e0e0e0;">
    <div style="background-image: linear-gradient(to right, #4facfe 0%, #00f2fe 100%); color: white; padding: 25px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px;">${BREVO_FROM_NAME}</h1>
    </div>
    <div style="padding: 30px;">
        <h2 style="color: #4facfe; font-size: 22px; border-bottom: 2px solid #4facfe; padding-bottom: 10px;">${title}</h2>
        ${content}
        <p style="margin-top: 30px;">Thanks,</p>
        <p style="margin: 0;">The Campus Tuckshop Team</p>
    </div>
    <div style="background-color: #0f172a; text-align: center; padding: 15px; font-size: 12px; color: #a0a0a0;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} Campus Tuckshop. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// --- Order Confirmation Email (Heavily Updated) ---
export const sendOrderConfirmationEmail = async (userId, order) => {
    if (!apiInstance) return;

    try {
         const baseUrl = 'https://campus-tuckshop.vercel.app';

        // Fetch product details to get image URLs and prepend the base URL
        const detailedItems = await Promise.all(order.items.map(async (item) => {
            const product = await Product.findById(item.productId);
            // Construct the full, absolute URL for the image
            const absoluteImageUrl = product && product.imageUrl 
                ? `${baseUrl}${product.imageUrl}` 
                : 'https://placehold.co/60x60/16213e/e0e0e0?text=N/A';
            return {
                ...item.toObject(),
                imageUrl: absoluteImageUrl
            };
        }));

        const subject = `Your Order is Confirmed!`;

        // --- NEW: Generate HTML for the list of items with images ---
        const itemsHtml = detailedItems.map(item => 
            `<div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #2c2c54;">
                <img src="${item.imageUrl}" alt="${item.name}" style="width: 50px; height: 50px; border-radius: 8px; margin-right: 15px; object-fit: cover; border: 1px solid #2c2c54;">
                <div style="flex-grow: 1;">
                    <span style="font-weight: bold; color: #ffffff; font-size: 16px;">${item.name}</span>
                    <span style="color: #a0a0a0; font-size: 14px;"> (x${item.quantity})</span>
                </div>
                <div style="font-weight: bold; color: #4facfe; font-size: 16px;">₹${(item.price * item.quantity).toFixed(2)}</div>
            </div>`
        ).join('');

        // --- NEW: Generate HTML for the shipping address ---
        const addr = order.address;
        const addressHtml = `
            <h3 style="color: #ffffff; border-bottom: 1px solid #4facfe; padding-bottom: 5px; margin-top: 25px; font-size: 18px;">📍 Shipping To:</h3>
            <div style="padding: 15px; background-color: #0f172a; border-radius: 8px; margin-top: 10px; color: #e0e0e0;">
                <strong>${addr.fullName}</strong><br>
                ${addr.addressLine1}<br>
                ${addr.addressLine2 ? addr.addressLine2 + '<br>' : ''}
                ${addr.city}, ${addr.state} - ${addr.pincode}<br>
                Phone: ${addr.phoneNumber}
            </div>
        `;
        
        // --- Assemble the final email content ---
        const content = `
            <div style="background-color: #2e8540; color: white; padding: 10px 15px; border-radius: 5px; text-align: center; font-weight: bold; margin-bottom: 25px; font-size: 16px;">
                ✅ Order Status: Processing
            </div>
            <p style="font-size: 16px;">Thank you for your order! We've received it and will have it ready for you shortly.</p>
            
            <h3 style="color: #ffffff; border-bottom: 1px solid #4facfe; padding-bottom: 5px; margin-top: 25px; font-size: 18px;">Order Summary (#${order.orderId})</h3>
            <div style="margin-top: 15px;">
                ${itemsHtml}
            </div>
            <div style="text-align: right; font-size: 1.4em; font-weight: bold; margin-top: 20px; padding-top: 15px; border-top: 2px solid #4facfe; color: #4facfe;">
                Total: ₹${order.total.toFixed(2)}
            </div>
            ${addressHtml}
        `;
        const htmlContent = createHtmlTemplate(subject, content);

        const sendSmtpEmail = new brevo.SendSmtpEmail();
        sendSmtpEmail.sender = sender;
        sendSmtpEmail.to = [{ email: user.email }];
        sendSmtpEmail.subject = `Order Confirmation #${order.orderId}`;
        sendSmtpEmail.htmlContent = htmlContent;

        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Order confirmation email sent to ${user.email}`);
    } catch (error) {
        console.error(`Brevo email error (Order Confirmation):`, error.response ? JSON.stringify(error.response.body) : error.message);
    }
};


// --- Welcome Email (Also uses new template) ---
export const sendWelcomeEmail = async (user) => {
    if (!apiInstance) return;
    
    const subject = 'Welcome to the Tuckshop!';
    const content = `
        <p>Thanks for signing up! You can now browse our products and place orders for all your campus needs.</p>
        <p>We're excited to have you with us.</p>
    `;
    const htmlContent = createHtmlTemplate(`Welcome, ${user.name}!`, content);

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = sender;
    sendSmtpEmail.to = [{ email: user.email }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
        console.error(`Brevo email error (Welcome):`, error.response ? JSON.stringify(error.response.body) : error.message);
    }
};


// --- Password Reset Email (Also uses new template) ---
export const sendPasswordResetEmail = async (user, resetToken) => {
    if (!apiInstance) return;

    const resetLink = `https://campus-tuckshop.vercel.app/reset-password.html?token=${resetToken}`;
    const subject = 'Reset Your Password';
    const content = `
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your password. Click the button below to set a new one. This link is valid for one hour.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-image: linear-gradient(to right, #4facfe 0%, #00f2fe 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Your Password</a>
        </div>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
    `;
    const htmlContent = createHtmlTemplate(subject, content);
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = sender;
    sendSmtpEmail.to = [{ email: user.email }];
    sendSmtpEmail.subject = `${subject} - ${BREVO_FROM_NAME}`;
    sendSmtpEmail.htmlContent = htmlContent;

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
        console.error(`Brevo email error (Password Reset):`, error.response ? JSON.stringify(error.response.body) : error.message);
    }
};

