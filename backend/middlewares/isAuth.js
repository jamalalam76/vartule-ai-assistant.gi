import jwt from "jsonwebtoken"
const isAuth=async (req,res,next)=>{
    try {
        const token=req.cookies.token
        if(!token){
            return res.status(400).json({message:"token not found"})
        }
        const verifyToken=jwt.verify(token,process.env.JWT_SECRET)
        req.userId=verifyToken.userId

        next()

    } catch (error) {
        console.error("Authentication failed:", error.message)
        res.clearCookie("token", { httpOnly:true, sameSite:"strict", secure:false })
        return res.status(401).json({message:"Your session has expired. Please sign in again."})
    }
}

export default isAuth
