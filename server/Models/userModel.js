const mongoose = require('mongoose');

// Define the schema for contractuser database
const contractUserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  displayName: String,
  firstName: String,
  lastName: String,
  profilePhoto: String,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'contractusers' // Explicitly name the collection
});

const ContractUser = mongoose.model('ContractUser', contractUserSchema);
module.exports = ContractUser;