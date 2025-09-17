const mongoose = require('mongoose');
const GTBBResponse = mongoose.model('GTBBResponse', new mongoose.Schema({
    week: { type: mongoose.Schema.Types.ObjectId, ref: 'GTBBWeek' },
    base: { type: mongoose.Schema.Types.ObjectId, ref: 'GTBBBase' },
    userId: { type: String, required: true },
    answer: { type: String, enum: ['a','b','c','d','e'] },
    correct: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
}));
module.exports = { GTBBResponse };
