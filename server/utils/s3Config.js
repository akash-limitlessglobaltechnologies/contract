const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const uploadToS3 = async (file, folder = 'contracts') => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${folder}/${Date.now()}-${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private'
    };

    const result = await s3.upload(params).promise();
    return result.Location;
};

const getSignedUrl = async (key) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Expires: 3600 // URL expires in 1 hour
    };

    return await s3.getSignedUrlPromise('getObject', params);
};

module.exports = { uploadToS3, getSignedUrl };

// routes/contractRoutes.js continued...
const { uploadToS3, getSignedUrl } = require('../utils/s3Config');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

router.post('/', authMiddleware, upload.single('pdf'), async (req, res) => {
    try {
        const { title, description, expiryDate, recipientEmail } = req.body;
        
        // Upload PDF to S3
        const pdfUrl = await uploadToS3(req.file);
        const signingKey = crypto.randomBytes(32).toString('hex');

        const contract = await Contract.create({
            title,
            description,
            createdBy: req.user.id,
            originalPdfUrl: pdfUrl,
            expiryDate,
            recipientEmail,
            signingKey
        });

        // Send email to recipient
        const signingLink = `${process.env.FRONTEND_URL}/sign/${signingKey}`;
        await sendSigningEmail(recipientEmail, signingLink, title);

        res.status(201).json(contract);
    } catch (error) {
        console.error('Contract creation error:', error);
        res.status(500).json({ message: 'Error creating contract' });
    }
});