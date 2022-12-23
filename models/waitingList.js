const mongoose = require("mongoose")

const WaitingListSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, "must provide user email"],
        unique: true
    },
})

module.exports = mongoose.model('WaitingList', WaitingListSchema);
