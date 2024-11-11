// routes/contractRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('node:crypto'); // Import crypto module correctly
const { authMiddleware } = require('../middleware/auth');
const Contract = require('../Models/Contract');
const { sendContractEmail } = require('../utils/emailService');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');


// Ensure uploads directory exists
const fs = require('fs');
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

// // Configure multer storage
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'uploads/');
//     },
//     filename: (req, file, cb) => {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//         cb(null, uniqueSuffix + path.extname(file.originalname));
//     }
// });

// const upload = multer({
//     storage,
//     fileFilter: (req, file, cb) => {
//         if (file.mimetype === 'application/pdf') {
//             cb(null, true);
//         } else {
//             cb(new Error('Only PDF files are allowed!'), false);
//         }
//     },
//     limits: {
//         fileSize: 5 * 1024 * 1024 // 5MB limit
//     }
// });

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure multer for base64 data
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});




// Create contract
router.post('/', authMiddleware, upload.single('pdf'), async (req, res) => {
    try {
        console.log('Creating contract...');
        console.log('Request body:', req.body);
        console.log('File:', req.file);

        if (!req.file) {
            return res.status(400).json({ message: 'No PDF file uploaded' });
        }

        const { title, description, expiryDate, recipientEmail } = req.body;
        
        // Generate signing key
        const signingKey = crypto.randomBytes(16).toString('hex');

        const contract = await Contract.create({
            title,
            description,
            createdBy: req.user.id,
            originalPdfUrl: `/uploads/${req.file.filename}`,
            expiryDate: new Date(expiryDate),
            recipientEmail,
            signingKey
        });

        // Generate signing link
        const signingLink = `${process.env.FRONTEND_URL}/sign/${signingKey}`;

        // Send email to recipient
        try {
            await sendContractEmail(recipientEmail, title, signingLink);
            console.log('Email sent successfully');
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Don't fail the request if email fails, but log it
        }

        res.status(201).json(contract);
    } catch (error) {
        console.error('Contract creation error:', error);
        
        // Clean up uploaded file if contract creation fails
        if (req.file) {
            fs.unlink(req.file.path, (unlinkError) => {
                if (unlinkError) {
                    console.error('Error deleting file:', unlinkError);
                }
            });
        }
        
        res.status(500).json({ message: 'Error creating contract', error: error.message });
    }
});

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

router.post('/payment/create-intent', async (req, res) => {
    try {
        const { contractId, amount, currency } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: currency.toLowerCase(),
            metadata: { contractId }
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ message: 'Error creating payment intent' });
    }
});

// Get user's contracts
router.get('/', authMiddleware, async (req, res) => {
    try {
        const contracts = await Contract.find({ createdBy: req.user.id })
            .sort('-createdAt');
        res.json(contracts);
    } catch (error) {
        console.error('Error fetching contracts:', error);
        res.status(500).json({ message: 'Error fetching contracts' });
    }
});

// Get contract by signing key (public route)
router.get('/sign/:signingKey', async (req, res) => {
    try {
        const contract = await Contract.findOne({
            signingKey: req.params.signingKey,
            status: 'pending',
            expiryDate: { $gt: new Date() }
        });

        if (!contract) {
            return res.status(404).json({ message: 'Contract not found or expired' });
        }

        res.json(contract);
    } catch (error) {
        console.error('Error fetching contract:', error);
        res.status(500).json({ message: 'Error fetching contract' });
    }
});

// Handle contract signing
router.post('/sign/:signingKey', async (req, res) => {
    try {
        console.log('Received signing request for:', req.params.signingKey);
        
        const contract = await Contract.findOne({
            signingKey: req.params.signingKey,
            status: 'pending',
            expiryDate: { $gt: new Date() }
        });

        if (!contract) {
            return res.status(404).json({ message: 'Contract not found or expired' });
        }

        const { signatureData } = req.body;
        if (!signatureData) {
            return res.status(400).json({ message: 'No signature provided' });
        }

        // Extract the base64 data (remove data URL prefix)
        const base64Data = signatureData.replace(/^data:image\/png;base64,/, '');

        // Create signature filename
        const signatureFileName = `signature-${Date.now()}.png`;
        const signaturePath = path.join(uploadDir, signatureFileName);

        // Save signature file
        fs.writeFileSync(signaturePath, base64Data, 'base64');

        // Update contract with signature path and status
        contract.signedPdfUrl = `/${signaturePath}`;
        contract.status = 'signed';
        contract.signedAt = new Date();
        await contract.save();

        // Send success response
        res.json({
            message: 'Contract signed successfully',
            signedPdfUrl: contract.signedPdfUrl
        });

    } catch (error) {
        console.error('Error signing contract:', error);
        res.status(500).json({ 
            message: 'Error signing contract',
            error: error.message 
        });
    }
});




// Get contract by ID
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const contract = await Contract.findOne({
            _id: req.params.id,
            createdBy: req.user.id
        });

        if (!contract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        res.json(contract);
    } catch (error) {
        console.error('Error fetching contract:', error);
        res.status(500).json({ message: 'Error fetching contract' });
    }
});

// Download contract
router.get('/:id/download', authMiddleware, async (req, res) => {
    try {
        const contract = await Contract.findOne({
            _id: req.params.id,
            createdBy: req.user.id
        });

        if (!contract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        const filePath = path.join(__dirname, '..', contract.signedPdfUrl || contract.originalPdfUrl);
        res.download(filePath);
    } catch (error) {
        console.error('Error downloading contract:', error);
        res.status(500).json({ message: 'Error downloading contract' });
    }
});

// Add this to routes/contractRoutes.js

router.post('/:id/resend-email', authMiddleware, async (req, res) => {
    try {
        const contract = await Contract.findOne({
            _id: req.params.id,
            createdBy: req.user.id
        });

        if (!contract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        const signingLink = `${process.env.FRONTEND_URL}/sign/${contract.signingKey}`;
        
        // Send email
        await sendContractEmail(contract.recipientEmail, contract.title, signingLink);
        
        // Update email status
        contract.emailStatus = {
            sent: true,
            sentAt: new Date(),
            error: null
        };
        await contract.save();

        res.json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error resending email:', error);
        res.status(500).json({ message: 'Failed to send email' });
    }
});

// Helper function to add signature to PDF
async function addSignatureToPdf(originalPdfPath, signaturePath, outputPath) {
    return new Promise((resolve, reject) => {
        try {
            // Read the original PDF
            const originalPdf = fs.readFileSync(originalPdfPath);
            // Read the signature image
            const signatureImage = fs.readFileSync(signaturePath);

            // Create a new PDF document
            const doc = new PDFDocument();
            const writeStream = fs.createWriteStream(outputPath);

            // Set up PDF writing
            writeStream.on('finish', () => {
                resolve();
            });

            writeStream.on('error', (err) => {
                reject(err);
            });

            // Add original PDF content
            doc.pipe(writeStream);
            
            // Add the signature image at the bottom
            doc.image(signatureImage, {
                fit: [200, 100],
                align: 'center',
                valign: 'center'
            });

            // Finalize the PDF
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}
// routes/contractRoutes.js

// Download route
router.get('/download/:id/:signingKey', async (req, res) => {
    try {
        const contract = await Contract.findOne({
            _id: req.params.id,
            signingKey: req.params.signingKey
        });

        if (!contract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        // Get the correct file path
        const filePath = path.join(__dirname, '..', contract.signedPdfUrl || contract.originalPdfUrl);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Set proper headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=' + path.basename(filePath));
        
        // Stream the file instead of reading it all at once
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ message: 'Error downloading file' });
    }
});

// Preview route
router.get('/preview/:id/:signingKey', async (req, res) => {
    try {
        const contract = await Contract.findOne({
            _id: req.params.id,
            signingKey: req.params.signingKey
        });

        if (!contract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        const filePath = path.join(__dirname, '..', contract.signedPdfUrl || contract.originalPdfUrl);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Set headers for inline viewing
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=' + path.basename(filePath));
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ message: 'Error previewing file' });
    }
});

// Keep the authenticated download route for the dashboard
router.get('/download/:id', authMiddleware, async (req, res) => {
    try {
        const contract = await Contract.findOne({
            _id: req.params.id,
            createdBy: req.user.id
        });

        if (!contract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        const filePath = path.join(__dirname, '..', contract.signedPdfUrl || contract.originalPdfUrl);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.download(filePath);
    } catch (error) {
        console.error('Error downloading contract:', error);
        res.status(500).json({ message: 'Error downloading contract' });
    }
});


module.exports = router;