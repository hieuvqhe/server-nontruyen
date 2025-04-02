const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const comicFavorSchema = new Schema({
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
        type: String
    },
    lastReadAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

comicFavorSchema.index({ userId: 1, slug: 1 }, { unique: true });

const ComicFavor = mongoose.model("ComicFavor", comicFavorSchema);

module.exports = ComicFavor;