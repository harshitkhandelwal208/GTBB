// Dev terminal command: node src/commands/dev_clear_db.js
require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    await Promise.all([
        require('./models/GTBBBase').GTBBBase.deleteMany({}),
        require('./models/GTBBWeek').GTBBWeek.deleteMany({}),
        require('./models/GTBBResponse').GTBBResponse.deleteMany({}),
        require('./models/GTBBPoint').GTBBPoint.deleteMany({}),
    ]);
    console.log('Database cleared.');
    process.exit(0);
})();