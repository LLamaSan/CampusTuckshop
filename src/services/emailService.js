// Use modern ES Module syntax
import * as brevo from '@getbrevo/brevo';
import User from '../models/User.js';

// --- Configuration ---
const BREVO_API_key = process.env.BREVO_API_KEY;
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || 'no-reply@yourdomain.com';
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'Campus Tuckshop';

let apiInstance;
if (BREVO_API_key) {
    apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_key);
} else {
    console.error('⚠️ BREVO_API_KEY is not set. Emails will not be sent.');
}

const sender = {
    email: BREVO_FROM_EMAIL,
    name: BREVO_FROM_NAME
};

// --- Main Template Function ---
// A helper function to wrap all emails in a consistent, decorative template.
const createHtmlTemplate = (title, content) => `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #4facfe; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">${BREVO_FROM_NAME}</h1>
    </div>
    <div style="padding: 30px;">
        <h2 style="color: #007bff; font-size: 20px;">${title}</h2>
        ${content}
        <p style="margin-top: 30px;">Thanks,</p>
        <p style="margin: 0;">The Campus Tuckshop Team</p>
    </div>
    <div style="background-color: #f8f9fa; text-align: center; padding: 15px; font-size: 12px; color: #6c757d;">
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} Campus Tuckshop. All rights reserved.</p>
    </div>
</div>
`;

// --- Password Reset Email ---
export const sendPasswordResetEmail = async (user, resetToken) => {
    if (!apiInstance) return;

    const resetLink = `https://campus-tuckshop.vercel.app/reset-password.html?token=${resetToken}`;
    const subject = 'Reset Your Password';
    const content = `
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your password. Click the button below to set a new one. This link is valid for one hour.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Your Password</a>
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

// --- Welcome Email ---
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

// --- Order Confirmation Email ---
export const sendOrderConfirmationEmail = async (userId, order) => {
    if (!apiInstance) {
        console.log("Email sending skipped: Brevo API key not configured.");
        return;
    }
    
    if (!userId) {
        console.error("CRITICAL EMAIL ERROR: sendOrderConfirmationEmail was called without a userId.");
        return; 
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            console.error(`Could not find user with ID ${userId} to send order confirmation.`);
            return;
        }

        const subject = `Your Order is Confirmed!`;
        const itemsHtml = order.items.map(item => 
            `<tr>
                <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">${item.name} (x${item.quantity})</td>
                <td style="padding: 10px; border-bottom: 1px solid #e0e0e0; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
            </tr>`
        ).join('');
        
        const content = `
            <p>Thank you for your order! We've received it and will have it ready for you shortly.</p>
            <h3 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px; margin-top: 25px;">Order Summary (#${order.orderId})</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td style="padding: 15px 10px 0; text-align: right; font-weight: bold;">Total:</td>
                        <td style="padding: 15px 10px 0; text-align: right; font-weight: bold; font-size: 1.2em; color: #007bff;">₹${order.total.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
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

