import express from "express"
import dotenv from "dotenv"
import connectDB from "./config/db.js"
import cors from "cors"
import { createServer } from "node:http"
import { Server } from "socket.io"
import jwt from "jsonwebtoken"
import authRoutes from "./routes/authRoutes.js"
import emailRoutes from "./routes/emailRoutes.js"

dotenv.config()
const app= express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
    cors: {
        origin: true,
        methods: ["GET", "POST"]
    }
})

app.set("io", io)
app.use(cors())
app.use(express.json())
app.use("/api/auth", authRoutes)
app.use("/api/emails", emailRoutes)

io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (typeof token !== "string" || !process.env.JWT_SECRET) {
        return next(new Error("Authentication required."));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"]
        });

        if (typeof decoded === "string" || typeof decoded.userId !== "string") {
            return next(new Error("Invalid authentication token."));
        }

        socket.data.userId = decoded.userId;
        return next();
    } catch {
        return next(new Error("Invalid or expired authentication token."));
    }
})

io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`)
})

app.get("/", (req,res)=>{
    res.send("Welcome to Mail Backend")
})

const PORT = process.env.PORT || 5000;

const startServer = async ()=> {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not set in the server environment.");
    }

    await connectDB();

    httpServer.listen(PORT, ()=> {
        console.log(`Server running on port http://localhost:${PORT}`);
    })
}

startServer().catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exit(1);
});