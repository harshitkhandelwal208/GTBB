const mongoose = require('mongoose');
const GTBBBase = mongoose.model('GTBBBase', new mongoose.Schema({
    week: { type: mongoose.Schema.Types.ObjectId, ref: 'GTBBWeek', required: true },
    baseImage: { type: String, required: true },
    correctOption: { type: String, enum: ['a','b','c','d','e'], required: true },
    options: [String],
    roundNumber: { type: Number, required: true },
    locked: { type: Boolean, default: false }
}));
module.exports = { GTBBBase };
