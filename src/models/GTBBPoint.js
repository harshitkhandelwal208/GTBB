const mongoose = require('mongoose');
const GTBBPoint = mongoose.model('GTBBPoint', new mongoose.Schema({
    userId: { type: String, required: true },
    week: { type: mongoose.Schema.Types.ObjectId, ref: 'GTBBWeek' },
    points: { type: Number, default: 0 }
}));
module.exports = { GTBBPoint };
