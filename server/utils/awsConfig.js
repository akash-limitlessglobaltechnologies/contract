// utils/awsConfig.js
const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

// Create S3 instance
const s3 = new AWS.S3();

// Helper function to validate AWS credentials
const validateAwsCredentials = async () => {
    try {
        await s3.listBuckets().promise();
        console.log('AWS credentials are valid');
        return true;
    } catch (error) {
        console.error('AWS credentials validation failed:', error);
        return false;
    }
};

module.exports = {
    s3,
    validateAwsCredentials
};