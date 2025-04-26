import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const authenticateUser =(req , res , next)=>{
    const token = req.cookies?.token;
    console.log(token)

    if(!token)
    {
        return res.status(401).json({success: false , message:"Access denied. No token provided." });
    }
    try
    {
        const user = jwt.verify(token,process.env.SECRET_KEY);
         console.log(user)

        next();
    }
    catch (error) {
        res.status(400).json({
            message: "invalid token.. " ,
            success: false
        });
    }
}

export default authenticateUser;
