import express from "express"
import dotenv from "dotenv"
import dns from "dns"

dns.setServers(["8.8.8.8", "1.1.1.1"])

dotenv.config()
import connectDb from "./config/db.js"
import authRouter from "./routes/auth.routes.js"
import cors from "cors"
import cookieParser from "cookie-parser"
import userRouter from "./routes/user.routes.js"


const app=express()
const deployedFrontendUrl = "https://vartule-ai-assistant.onrender.com"
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    deployedFrontendUrl,
    ...((process.env.FRONTEND_URL || "").split(",").map((url) => url.trim()).filter(Boolean)),
]
app.use(cors({
    origin(origin, callback) {
        // Requests without an Origin header are server-to-server/health checks.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
        return callback(new Error("Origin is not allowed by CORS"))
    },
    credentials:true
}))
const port=process.env.PORT || 5000
app.use(express.json())
app.use(cookieParser())
app.get("/", (_req, res) => res.status(200).json({ status: "ok", service: "Vartule AI Assistant API" }))
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }))
app.use("/api/auth",authRouter)
app.use("/api/user",userRouter)


const startServer = async () => {
    await connectDb()
    app.listen(port, () => console.log(`server started on port ${port}`))
}

startServer()
