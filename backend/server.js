import express from "express";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT


app.get("/api/auth/signup", (req, res) => {
    res.send("Signup Route");
});

app.get("/api/auth/Login", (req, res) => {
    res.send("Login Route");
});

app.get("/api/auth/Logout", (req, res) => {
    res.send("Logout Route");
});

app.listen(PORT, () => {
    console.log("Server is running on port ${PORT}");
})