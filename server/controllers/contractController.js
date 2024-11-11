const Contract = require('../Models/Contract');
const docusign = require('docusign-esign');
const path = require('path');
const fs = require('fs');
const { sendEmail } = require('../utils/emailService');

const contractController = {
  createContract: async (req, res) => {
    try {
      const { title, description, expiryDate, recipientEmail } = req.body;
      const pdfFile = req.file;

      if (!pdfFile) {
        return res.status(400).json({ message: 'PDF file is required' });
      }

      // Save PDF file to storage (you might want to use cloud storage in production)
      const pdfPath = path.join(__dirname, '../uploads', pdfFile.filename);
      
      // Create contract in database
      const contract = await Contract.create({
        title,
        description,
        createdBy: req.user.id,
        pdfUrl: pdfPath,
        expiryDate,
        recipientEmail
      });

      // Initialize DocuSign
      const envelopeId = await initializeDocuSign(contract, pdfPath);
      
      // Update contract with DocuSign envelope ID
      contract.docusignEnvelopeId = envelopeId;
      await contract.save();

      // Send email to recipient
      await sendEmail({
        to: recipientEmail,
        subject: `Contract for Signature: ${title}`,
        text: `You have been sent a contract to sign. Please click the following link to view and sign the contract: ${process.env.FRONTEND_URL}/contracts/sign/${contract._id}`
      });

      res.status(201).json(contract);
    } catch (error) {
      console.error('Contract creation error:', error);
      res.status(500).json({ message: 'Error creating contract' });
    }
  },

  getContracts: async (req, res) => {
    try {
      const contracts = await Contract.find({
        $or: [
          { createdBy: req.user.id },
          { recipientEmail: req.user.email }
        ]
      }).populate('createdBy', 'displayName email');
      
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching contracts' });
    }
  },

  getContract: async (req, res) => {
    try {
      const contract = await Contract.findById(req.params.id)
        .populate('createdBy', 'displayName email');

      if (!contract) {
        return res.status(404).json({ message: 'Contract not found' });
      }

      res.json(contract);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching contract' });
    }
  },

  // ... more controller methods
};

module.exports = contractController;