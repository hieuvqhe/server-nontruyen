const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const comicReadingSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    slug: {
        type: String,
        required: true,
        index: true
    },
    lastReadChapter: {
        type: String,
        required: true
    },
    lastReadAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

comicReadingSchema.index({ userId: 1, slug: 1 }, { unique: true });

const ComicReading = mongoose.model("ComicReading", comicReadingSchema);

module.exports = ComicReading;