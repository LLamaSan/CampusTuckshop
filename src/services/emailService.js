// src/services/emailService.js
const brevo = require('@getbrevo/brevo');
require('dotenv').config(); // Ensure env vars are loaded

if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) {
    console.error('⚠️ Brevo API Key or From Email not set in environment variables');
    // Consider throwing an error or exiting if email is critical
}

let apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

const sender = {
    email: process.env.BREVO_FROM_EMAIL,
    name: process.env.BREVO_FROM_NAME || 'Campus Tuckshop'
};

// Generic function to send email using SDK
async function sendEmail(toEmail, subject, htmlContent, textContent) {
    try {
        const sendSmtpEmail = new brevo.SendSmtpEmail();
        sendSmtpEmail.sender = sender;
        sendSmtpEmail.to = [{ email: toEmail }];
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = htmlContent;
        sendSmtpEmail.textContent = textContent;

        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Brevo email sent successfully to ${toEmail}, Message ID:`, response.messageId);
        return response;
    } catch (error) {
        console.error(`Brevo email error sending to ${toEmail}:`, error.response ? JSON.stringify(error.response.body) : error.message);
        // Re-throw the error so the caller knows it failed
        throw error;
    }
}

// You can add specific email functions here (welcome, order confirmation, password reset)
// that call the generic sendEmail function with pre-defined templates/content.
// Example:
async function sendWelcomeEmail(user) {
    const subject = 'Welcome to Campus Tuckshop! 🍪';
    // Construct HTML and Text content as you had before...
    const htmlContent = `... Hi ${user.name} ...`; // (Your detailed HTML)
    const textContent = `... Dear ${user.name} ...`; // (Your detailed text)
    return sendEmail(user.email, subject, htmlContent, textContent);
}

async function sendOrderConfirmationEmail(order) {
    const subject = `Order Confirmation - ${order.orderId}`;
    // Construct HTML and Text content using order details...
    const htmlContent = `... Thank you ${order.userName} ...`; // (Your detailed HTML)
    const textContent = `... Dear ${order.userName} ...`; // (Your detailed text)
    return sendEmail(order.userEmail, subject, htmlContent, textContent);
}

async function sendPasswordResetEmail(user, resetToken) {
    const subject = 'Reset Your Password - Campus Tuckshop';
    const appUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` || 'http://localhost:3000'; // Make sure RAILWAY_PUBLIC_DOMAIN is set
    const resetLink = `${appUrl}/reset-password.html?token=${resetToken}`;
    // Construct HTML and Text content with resetLink...
    const htmlContent = `... Hi ${user.name}, click <a href="${resetLink}">here</a> ...`; // (Your detailed HTML)
    const textContent = `... Dear ${user.name}, use this link: ${resetLink} ...`; // (Your detailed text)
    return sendEmail(user.email, subject, htmlContent, textContent);
}


module.exports = {
    sendEmail, // Export generic function if needed elsewhere
    sendWelcomeEmail,
    sendOrderConfirmationEmail,
    sendPasswordResetEmail
};