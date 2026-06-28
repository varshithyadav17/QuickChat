import { generateToken } from "../lib/utils.js"
import User from "../models/User.js"
import bcrypt from "bcryptjs"
import cloudinary from "../lib/cloudinary.js"
import { signupSchema, loginSchema } from "../validations/userValidation.js"
import axios from "axios";
import { redis } from "../lib/redis.js";

// signup a new user 
export const signup = async (req, res) => {
    const { fullName, email, password, bio } = req.body

    try{
        const result = signupSchema.safeParse(req.body)
        console.log(result)
        if(!result.success){
            return res.json({
                success: false,
                message: result.error.issues[0].message
            })
        }

        const user = await User.findOne({email})
        if(user){
            return res.json({message: "User with this email already exists."})
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = await User.create({
            fullName,
            email,
            password: hashedPassword,
            bio
        })

        const token = generateToken(newUser._id)

        res.json({success: true, userData: newUser, token, message: "Account created successfully"})

    }catch(error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }

}


// for login users 
export const login = async (req, res) => {

    const result = loginSchema.safeParse(req.body)
    console.log(result)
    if(!result.success){
        return res.json({
            success:false,
            message: result.error.issues[0].message
        })
    }    

    
    const {email, password} = req.body

    try{

        const userData = await User.findOne({email})

        if(!userData){
            return res.json({
                success:false,
                message:"User not found"
            })
        }

        const isPassswordCorrect = await bcrypt.compare(password, userData.password)

        if(!isPassswordCorrect){
            return res.json({message: "Invalid credentials. Please try again."})
        }

        const token = generateToken(userData._id)
        const updatedUser = await User.findByIdAndUpdate(userData._id, {lastSeen: null})

        res.json({success: true, userData: updatedUser, token, message: "Login successful"})

    }catch(error){
        console.log(error.message)
        res.json({success: false, message: error.message})
    }

}

//controller to check if the user is authenticated
export const checkAuth = async (req,res) =>{
    res.json({success: true, user: req.user})
}

//controller to update the user profile details
export const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullName } = req.body

        const userId = req.user._id
        let updatedUser;

        if(!profilePic){
            updatedUser = await User.findByIdAndUpdate(userId, {bio, fullName}, {new: true})
        } else{
            const upload = await cloudinary.uploader.upload(profilePic)
            updatedUser = await User.findByIdAndUpdate(userId, {profilePic: upload.secure_url, bio, fullName }, {new: true})
        }

        res.json({success: true, userData: updatedUser, message: "Profile updated successfully"})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

const OTP_LIMIT = 2;
const OTP_WINDOW = 180; // 15 minutes
export const sendLoginOTP = async (req,res)=>{

    const { email } = req.body

    try{

        const user = await User.findOne({ email })
        
        if(!user){
            return res.json({
                success:false,
                message:"User not found"
            })
        }

        //Redis Rate Limiter
        const key = `otp-limit:${email}`;

        // Increment request count
        const count = await redis.incr(key);

        // Set expiry only on first request
        if (count === 1) {
            await redis.expire(key, OTP_WINDOW);
        }

        console.log("OTP Request Count:", count);

        // Block if limit exceeded
        if (count > OTP_LIMIT) {
            const ttl = await redis.ttl(key);

            const minutes = Math.floor(ttl / 60);
            const seconds = ttl % 60;

            let timeLeft = "";

            if (minutes > 0) {
                timeLeft = `${minutes} minute${minutes > 1 ? "s" : ""}`;

                if (seconds > 0) {
                    timeLeft += ` ${seconds} second${seconds > 1 ? "s" : ""}`;
                }
            } else {
                timeLeft = `${seconds} second${seconds > 1 ? "s" : ""}`;
            }

            return res.json({
                success: false,
                message: `Too many OTP requests. Please try again after ${timeLeft}.`,
                retryAfter: ttl
            });
        }

        
        const otp = Math.floor(
            100000 + Math.random()*900000
        ).toString()
        
        const OTP_TTL = 300; // 5 minutes

        await redis.set(
            `otp:${email}`,
            String(otp),
            {
                ex: OTP_TTL 
            }
        );

        try {
            const response = await axios.post(
            "https://api.brevo.com/v3/smtp/email",
            {
                sender: {
                    name: "QuickChat",
                    email: process.env.BREVO_SENDER,
                },
                to: [
                    {
                        email: email,
                    },
                ],
                subject: "QuickChat Login OTP",
                htmlContent: `
                    <div style="font-family:Arial;padding:20px">
                        <h2>Your Login OTP</h2>

                        <p>Your verification code is:</p>

                        <h1 style="
                            letter-spacing:6px;
                            color:#7c3aed;
                            font-size:36px;
                        ">
                            ${otp}
                        </h1>

                        <p>This OTP is valid for <b>5 minutes</b>.</p>

                        <p>If you didn't request this, you can safely ignore this email.</p>
                    </div>
                `,
                },
            {
                headers: {
                    "api-key": process.env.BREVO_API_KEY,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("BREVO RESPONSE:", response.data);

        } catch (err) {
            console.error("BREVO ERROR:", err.response?.data || err.message);

            return res.status(500).json({
                success: false,
                message: err.response?.data?.message || "Failed to send OTP",
            });
        }

        res.json({
            success:true,
            message:"OTP sent successfully"
        })

    }catch(error){
        res.json({
            success:false,
            message:error.message
        })
    }

}

export const verifyLoginOTP = async (req,res)=>{

    const { email, otp } = req.body

    try{

        const user = await User.findOne({ email })

        if(!user){
            return res.json({
                success:false,
                message:"User not found"
            })
        }

        const storedOTP = await redis.get(`otp:${email}`);

        if(!storedOTP){
            return res.json({
                success:false,
                message:"OTP expired"
            });
        }

        if(String(storedOTP) !== String(otp)){
            return res.json({
                success:false,
                message:"Incorrect OTP"
            });
        }

        await redis.del(`otp:${email}`);

        const token = generateToken(user._id)

        res.json({
            success:true,
            userData:user,
            token,
            message:"Login successful"
        })

    }catch(error){
        res.json({
            success:false,
            message:error.message
        })
    }

}