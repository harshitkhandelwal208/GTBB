const mongoose = require('mongoose');
const GTBBWeek = mongoose.model('GTBBWeek', new mongoose.Schema({
    weekNumber: { type: Number, required: true },
    status: { type: String, enum: ['next', 'active', 'ended'], required: true, default: 'next' },
}));
module.exports = { GTBBWeek };
