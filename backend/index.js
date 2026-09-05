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
app.use(cors({
    origin:["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials:true
}))
const port=process.env.PORT || 5000
app.use(express.json())
app.use(cookieParser())
app.use("/api/auth",authRouter)
app.use("/api/user",userRouter)


const startServer = async () => {
    await connectDb()
    app.listen(port, () => console.log(`server started on port ${port}`))
}

startServer()
