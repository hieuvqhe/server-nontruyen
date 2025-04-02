const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define schema
const userVerificationSchema = new Schema({
   
    userId: { type: String},
    uniqueString: { type: String},
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: Date.now, index: { expires: '1h' } },
});

const userVerification = mongoose.model("userVerification", userVerificationSchema);

module.exports = userVerification;