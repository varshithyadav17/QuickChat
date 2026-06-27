import { generateToken } from "../lib/utils.js"
import User from "../models/User.js"
import bcrypt from "bcryptjs"
import cloudinary from "../lib/cloudinary.js"
import { signupSchema, loginSchema } from "../validations/userValidation.js"
import { transporter } from "../lib/nodemailer.js"

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

        console.log(user.email)


        const otp = Math.floor(
            100000 + Math.random()*900000
        ).toString()

        user.loginOTP = otp
        user.loginOTPExpiry = Date.now() + 5*60*1000

        await user.save()

        console.log("Before sendMail");

        try {
            const info = await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "QuickChat Login OTP",
                html: `
                    <h2>Your OTP is ${otp}</h2>
                    <p>Valid for 5 minutes.</p>
                `
            });

            console.log("After sendMail");
            console.log(info);

        } catch (err) {
            console.error("SENDMAIL ERROR:");
            console.error(err);
        }

        console.log("Controller finished");

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

        if(user.loginOTP !== otp){
            return res.json({
                success:false,
                message:"Incorrect OTP"
            })
        }

        if(user.loginOTPExpiry < Date.now()){
            return res.json({
                success:false,
                message:"OTP expired"
            })
        }

        user.loginOTP = ""
        user.loginOTPExpiry = null

        await user.save()

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