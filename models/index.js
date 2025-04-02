const mongoose = require("mongoose");
const User = require("./user.model");
const ComicReading = require("./comicReading");
const ComicFavor = require("./comicFavorite");
const db = {}

// Define schema
db.User = User;
db.ComicReading = ComicReading;
db.ComicFavor = ComicFavor;

module.exports = db;