// utils/emailService.js
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

// Create reusable transporter
let transporter = null;

const createTransporter = async () => {
    if (transporter) return transporter;

    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
        },
        pool: true, // Use pooled connections
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5 // Limit to 5 emails per second
    });

    // Verify connection
    try {
        await transporter.verify();
        console.log('Email service ready');
    } catch (error) {
        console.error('Email service error:', error);
        transporter = null;
        throw error;
    }

    return transporter;
};

// Email rate limiter middleware
const emailRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 emails per windowMs
});

const sendContractEmail = async (recipientEmail, contractTitle, signingLink, retries = 3) => {
    try {
        const transport = await createTransporter();
        
        const mailOptions = {
            from: {
                name: 'Contract Management System',
                address: process.env.EMAIL_USER
            },
            to: recipientEmail,
            subject: `Contract for Signing: ${contractTitle}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Contract Ready for Signature</h2>
                    <p>Hello,</p>
                    <p>You have received a contract titled "<strong>${contractTitle}</strong>" for your signature.</p>
                    <p>Please click the link below to view and sign the contract:</p>
                    <div style="margin: 20px 0;">
                        <a href="${signingLink}" 
                           style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 4px; display: inline-block;">
                            View and Sign Contract
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px;">
                        This link will expire in 7 days. Please sign the contract before it expires.
                    </p>
                    <p style="color: #666; margin-top: 20px; font-size: 12px;">
                        If you didn't expect this contract, please ignore this email.
                    </p>
                </div>
            `,
            text: `
                Contract Ready for Signature
                
                Hello,
                
                You have received a contract titled "${contractTitle}" for your signature.
                
                Please visit the following link to view and sign the contract:
                ${signingLink}
                
                This link will expire in 7 days. Please sign the contract before it expires.
                
                If you didn't expect this contract, please ignore this email.
            `
        };

        const info = await transport.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Email sending failed:', error);
        
        if (retries > 0) {
            console.log(`Retrying... ${retries} attempts left`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
            return sendContractEmail(recipientEmail, contractTitle, signingLink, retries - 1);
        }
        
        throw error;
    }
};

module.exports = { 
    sendContractEmail,
    emailRateLimiter 
};