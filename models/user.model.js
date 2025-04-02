const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Define schema
const userSchema = new Schema({
    email: { type: String, required: [true, "Email is required"], unique: true },
    password: { type: String, required: [true, "Password is required"] },
    name: { type: String, required: [true, "Name is required"] },
    phone: { type: String },
    address: { type: String },
    avatar: {
        type: String,
        default: 'https://cdn.vectorstock.com/i/1000x1000/44/01/default-avatar-photo-placeholder-icon-grey-vector-38594401.webp'
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

module.exports = User;