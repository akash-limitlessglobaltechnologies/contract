const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const sendSigningEmail = async (recipientEmail, signingLink, contractTitle) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: `Contract for Signing: ${contractTitle}`,
        html: `
            <h2>You have a contract to sign</h2>
            <p>You have been sent a contract titled "${contractTitle}" for signing.</p>
            <p>Please click the link below to view and sign the contract:</p>
            <a href="${signingLink}">${signingLink}</a>
            <p>This link will expire in 7 days.</p>
        `
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { sendSigningEmail };