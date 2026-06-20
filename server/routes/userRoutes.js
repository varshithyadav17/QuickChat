import express from 'express'
import { protectRoute } from '../middleware/auth.js'
import { signup, login, updateProfile, checkAuth, sendLoginOTP, verifyLoginOTP } from '../controllers/userController.js'


const userRouter = express.Router()

userRouter.post("/signup", signup)
userRouter.post("/login", login)
userRouter.post("/send-login-otp", sendLoginOTP)
userRouter.post("/verify-login-otp",verifyLoginOTP)
userRouter.put("/update-profile", protectRoute, updateProfile)
userRouter.get("/check-auth", protectRoute, checkAuth)

export default userRouter