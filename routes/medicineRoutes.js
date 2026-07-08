const router = require('express').Router();
const Medicine = require('../models/Medicine');
const { protect } = require('../middleware/auth');
const crypto = require('crypto');

function generateSerial() {
  return 'MV-' + crypto.randomBytes(2).toString('hex').toUpperCase() + '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

router.get('/all', async (req, res) => {
  try {
    const meds = await Medicine.find().sort({ createdAt: -1 });
    res.json({ success: true, data: meds });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/verify/:serial', async (req, res) => {
  try {
    const serial = decodeURIComponent(req.params.serial).trim().toUpperCase();
    const medicine = await Medicine.findOne({ serialNumber: serial });
    if (medicine) {
      res.json({ success: true, data: medicine });
    } else {
      res.status(404).json({ success: false, message: 'Serial not found' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: medicine });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Register a new medicine.
// - If "serialNumber" is provided in the body (e.g. a code scanned from a
//   physical barcode/QR code), it is used as-is after validating it is not
//   already registered.
// - Otherwise a new internal serial (MV-XXXX-XXXX) is auto-generated.
router.post('/add', protect, async (req, res) => {
  try {
    const { name, brand, expiryDate, description, serialNumber } = req.body;
    if (!name || !expiryDate) {
      return res.status(400).json({ success: false, message: 'Name and expiry date required' });
    }

    let finalSerial;

    if (serialNumber && serialNumber.trim()) {
      finalSerial = serialNumber.trim().toUpperCase();
      const existing = await Medicine.findOne({ serialNumber: finalSerial });
      if (existing) {
        return res.status(409).json({ success: false, message: 'This code is already registered' });
      }
    } else {
      finalSerial = generateSerial();
      let tries = 0;
      while (await Medicine.findOne({ serialNumber: finalSerial }) && tries < 10) {
        finalSerial = generateSerial();
        tries++;
      }
    }

    const med = await Medicine.create({
      name,
      brand,
      expiryDate,
      description,
      serialNumber: finalSerial,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: med });
  } catch (err) {
    // Handle race-condition duplicate key errors (e.g. two admins scanning
    // the same code at the same time) gracefully instead of a generic 500.
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'This code is already registered' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/update/:id', protect, async (req, res) => {
  try {
    const { name, brand, expiryDate } = req.body;
    await Medicine.findByIdAndUpdate(req.params.id, { name, brand, expiryDate });
    res.json({ success: true, message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/delete/:id', protect, async (req, res) => {
  try {
    await Medicine.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
