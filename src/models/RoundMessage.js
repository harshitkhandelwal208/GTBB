const mongoose = require('mongoose');
const RoundMessageSchema = new mongoose.Schema({
    base: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
    messageId: { type: String, required: true }
});
module.exports = mongoose.model('RoundMessage', RoundMessageSchema);