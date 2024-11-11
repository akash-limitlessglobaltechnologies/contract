// models/Contract.js
const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    originalPdfUrl: {
        type: String,
        required: true
    },
    signedPdfUrl: String,
    status: {
        type: String,
        enum: ['pending', 'signed', 'expired'],
        default: 'pending'
    },
    expiryDate: {
        type: Date,
        required: true
    },
    recipientEmail: {
        type: String,
        required: true
    },
    signingKey: {
        type: String,
        required: true,
        unique: true
    },
    emailStatus: {
        sent: {
            type: Boolean,
            default: false
        },
        sentAt: Date,
        error: String
    },
    signedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    requirePayment: {
        type: Boolean,
        default: false
    },
    paymentAmount: {
        type: Number,
        required: function() { return this.requirePayment; }
    },
    paymentCurrency: {
        type: String,
        enum: ['USD', 'EUR', 'GBP', 'INR'],
        required: function() { return this.requirePayment; }
    },
    paymentDescription: String,
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    stripePaymentIntentId: String
});

module.exports = mongoose.model('Contract', contractSchema);