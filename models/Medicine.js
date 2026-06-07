const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    brand: { type: String, default: 'Unknown' },
    serialNumber: { type: String, unique: true, required: true },
    expiryDate: { type: Date, required: true },
    description: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Medicine', MedicineSchema);
