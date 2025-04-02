const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const httpErrors = require("http-errors");
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require ("./dbConnect/db");
const db = require("./models");
const ApiRouter = require("./routes/api.route");
const ComicRoute = require("./routes/comic.route");

const app = express();
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", async (req, res, next) => {
    res.status(200).send({ message: "Welcome to Restful API server" });
});

//Recieve request 
app.use("/api", ApiRouter);
app.use("/api/comic", ComicRoute);


app.use(async (req, res, next) => {
    next(httpErrors.BadRequest("Bad request"));
});

app.use(async (err, req, res, next) => {
    res.status = err.status || 500,
        res.send({
            "error": {
                "status": err.status || 500,
                "message": err.message
            }
        });
})

const HOST_NAME = process.env.HOST_NAME;
const PORT = process.env.PORT || 9999;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    connectDB();
});