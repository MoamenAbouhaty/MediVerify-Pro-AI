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
    const medicine = await Medicine.findOne({ serialNumber: req.params.serial.toUpperCase() });
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

router.post('/add', protect, async (req, res) => {
  try {
    const { name, brand, expiryDate, description } = req.body;
    if (!name || !expiryDate) {
      return res.status(400).json({ success: false, message: 'Name and expiry date required' });
    }
    let serialNumber = generateSerial();
    let tries = 0;
    while (await Medicine.findOne({ serialNumber }) && tries < 10) {
      serialNumber = generateSerial();
      tries++;
    }
    const med = await Medicine.create({ name, brand, expiryDate, description, serialNumber, createdBy: req.user._id });
    res.status(201).json({ success: true, data: med });
  } catch (err) {
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
