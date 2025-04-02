const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const httpErrors = require("http-errors");
require("dotenv").config();

const connectDB = require ("./dbConnect/db");
const db = require("./models");
const ApiRouter = require("./routes/api.route");
const ComicRoute = require("./routes/comic.route");

const app = express();
app.use(bodyParser.json());
app.use(morgan("dev"));
app.use(express.json());


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
const PORT = process.env.PORT;

app.listen(PORT, HOST_NAME, () => {
    console.log(`Server running at: http://${HOST_NAME}:${PORT}`);
    //Connect database 
    connectDB();
});