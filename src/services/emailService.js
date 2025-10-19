// Use modern 'import' syntax
import * as brevo from '@getbrevo/brevo';
import User from '../models/User.js';

// --- Initialize Brevo API ---
// This setup is taken from your file, which is the correct way to do it.
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

const sender = {
    email: 'no-reply@yourdomain.com', // It's better to use a generic no-reply address
    name: 'Campus Tuckshop'
};

// --- Password Reset Email Function ---
// This function takes the email and token, just like our controller expects.
export const sendPasswordResetEmail = async (userEmail, resetToken) => {
    // The Vercel URL is fixed, so we can define it here.
    const resetUrl = `https://campus-tuckshop.vercel.app/reset-password.html?token=${resetToken}`;
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.sender = sender;
    sendSmtpEmail.to = [{ email: userEmail }];
    sendSmtpEmail.subject = 'Reset Your Password - Campus Tuckshop';
    sendSmtpEmail.htmlContent = `
        <p>Hi there,</p>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
    `;

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Password reset email sent to ${userEmail}`);
    } catch (error) {
        console.error(`Brevo password reset error:`, error.response ? JSON.stringify(error.response.body) : error.message);
    }
}

// --- Order Confirmation Email Function ---
// This function takes the userId and order object, just like our controller provides.
export const sendOrderConfirmationEmail = async (userId, order) => {
    try {
        // 1. Find the user in the database to get their name and email
        const user = await User.findById(userId);
        if (!user) {
            console.error("User not found for order confirmation email.");
            return;
        }

        // 2. Format the order items into an HTML list
        const itemsHtml = order.items.map(item => 
            `<li>${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}</li>`
        ).join('');

        // 3. Create the email object using the Brevo SDK
        const sendSmtpEmail = new brevo.SendSmtpEmail();
        
        sendSmtpEmail.sender = sender;
        sendSmtpEmail.to = [{ email: user.email, name: user.name }];
        sendSmtpEmail.subject = `Your Campus Tuckshop Order #${order._id}`;
        sendSmtpEmail.htmlContent = `
            <h2>Hi ${user.name},</h2>
            <p>Thank you for your order! We've received it successfully.</p>
            <h3>Order Summary:</h3>
            <ul>
                ${itemsHtml}
            </ul>
            <p><strong>Total: $${order.total.toFixed(2)}</strong></p>
            <p>Thanks for shopping with us!</p>
        `;

        // 4. Send the email
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Order confirmation email sent successfully to ${user.email}`);

    } catch (error) {
        console.error(`Brevo order confirmation error:`, error.response ? JSON.stringify(error.response.body) : error.message);
    }
};

