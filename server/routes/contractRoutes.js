const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const AWS = require('aws-sdk');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');
const Contract = require('../Models/Contract');
const { sendContractEmail } = require('../utils/emailService');

// Configure AWS
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
});

// Helper function to upload to S3
const uploadToS3 = async (file, folder = 'contracts') => {
    try {
        const fileExtension = file.originalname ? path.extname(file.originalname) : '.pdf';
        const filename = `${folder}/${Date.now()}-${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
        
        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: filename,
            Body: file.buffer || Buffer.from(file, 'base64'),
            ContentType: file.mimetype || 'application/pdf',
            // Remove ACL setting
        };

        console.log('Uploading to S3:', { bucket: params.Bucket, key: params.Key });
        const uploadResult = await s3.upload(params).promise();
        console.log('S3 upload successful:', uploadResult.Location);
        return uploadResult.Location;
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error(`Failed to upload to S3: ${error.message}`);
    }
};

// Create contract
router.post('/', authMiddleware, upload.single('pdf'), async (req, res) => {
    try {
        console.log('Creating contract...');
        console.log('Request body:', req.body);
        console.log('File:', req.file);

        if (!req.file) {
            return res.status(400).json({ message: 'No PDF file uploaded' });
        }

        // Upload file to S3
        const fileUrl = await uploadToS3(req.file);
        console.log('File uploaded to S3:', fileUrl);

        const { title, description, expiryDate, recipientEmail, requirePayment } = req.body;
        const signingKey = crypto.randomBytes(16).toString('hex');

        const contract = await Contract.create({
            title,
            description,
            createdBy: req.user.id,
            originalPdfUrl: fileUrl,
            expiryDate: new Date(expiryDate),
            recipientEmail,
            signingKey,
            requirePayment: requirePayment === 'true'
        });

        const signingLink = `${process.env.FRONTEND_URL}/sign/${signingKey}`;

        try {
            await sendContractEmail(recipientEmail, title, signingLink);
            console.log('Email sent successfully');
        } catch (emailError) {
            console.error('Failed to send email:', emailError);
        }

        res.status(201).json(contract);
    } catch (error) {
        console.error('Contract creation error:', error);
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

        // Upload signature to S3
        const base64Data = signatureData.replace(/^data:image\/png;base64,/, '');
        const signatureUrl = await uploadToS3({
            buffer: Buffer.from(base64Data, 'base64'),
            mimetype: 'image/png',
            originalname: 'signature.png'
        }, 'signatures');

        // Update contract with signature URL and status
        contract.signedPdfUrl = signatureUrl;
        contract.status = 'signed';
        contract.signedAt = new Date();
        await contract.save();

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

        const fileUrl = contract.signedPdfUrl || contract.originalPdfUrl;
        res.redirect(fileUrl);
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

        const fileUrl = contract.signedPdfUrl || contract.originalPdfUrl;
        res.redirect(fileUrl);
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