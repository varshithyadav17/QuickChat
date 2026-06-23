import React, { useContext, useState } from 'react'
import assets from '../assets/assets'
import { AuthContext } from '../../context/AuthContext'
import toast from "react-hot-toast"

const LoginPage = () => {

  const [currState, setCurrState] = useState('Sign up')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [bio, setBio] = useState('')
  const [isDataSubmitted, setIsDataSubmitted] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)
  
  const [loginWithOTP, setLoginWithOTP] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")


  const {login, sendLoginOTP, verifyLoginOTP} = useContext(AuthContext)

  const handleResendOTP = async () => {

    if (otpLoading || otpCooldown > 0) return
    setOtpLoading(true)

    try {
      const success = await sendLoginOTP(email)

      if (success) {
          toast.success("OTP resent")
          startOtpCooldown()
      }
      
    }catch(error) {
      toast.error(error.message)

    } finally {

        setOtpLoading(false)

    }
  }

  const startOtpCooldown = () => {

    setOtpCooldown(60)

    const timer = setInterval(() => {

        setOtpCooldown(prev => {
            if(prev <= 1){
                clearInterval(timer)
                return 0
            }

            return prev - 1
        })

    },1000)
  }

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    if(currState === 'Sign up' && !isDataSubmitted){

      if(fullName.trim().length < 3){
        return toast.error("Name must contain at least 3 characters")
      }

      if(password.length < 6){
        return toast.error("Password must contain at least 6 characters")
      }
      
      setIsDataSubmitted(true)
      return
    }

    if(currState==="Login" && loginWithOTP){

      if(!otpSent){
          if(otpLoading || otpCooldown > 0) return
          setOtpLoading(true)

          try {
            const success = await sendLoginOTP(email)
            if(success){
              setOtpSent(true)
              startOtpCooldown()
            }
          }finally {
            setOtpLoading(false)
          }

          return
      }
      if (!otp.trim()) {
        return toast.error("Enter verification code")
      }
      
      await verifyLoginOTP(email,otp)
      return
    }

    await login(currState === 'Sign up' ? 'signup' : 'login' , {fullName, email, password, bio})
  }

  return (
    <div className='min-h-screen bg-cover bg-center flex items-center justify-center gap-8 sm:justify-evenly max-sm:flex-col backdrop-blur-2xl'>

      {/* ---------- left ---------- */}
      <img src={assets.logo_big} alt="" className='w-[min(30vw,250px)]'/>

      {/* ---------- right ---------- */}

      <form onSubmit = {onSubmitHandler} className='border-2 bg-white/8 text-white border-gray-500 p-6 flex flex-col gap-6 rounded-lg shadow-lg'>
        <h2 className='font-medium text-2xl flex justify-between items-center'>
          {currState}
          {isDataSubmitted && (
            <img onClick={() => setIsDataSubmitted(false)} src={assets.arrow_icon} alt='' className='w-5 cursor-pointer' />
          )}
        </h2>

        {currState === 'Sign up' && !isDataSubmitted && (
          <input 
            type="text"
            placeholder='Full Name'
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className='p-2 border border-gray-500 rounded-md focus:outline-none'
            required
           />
        )}
        
        {!isDataSubmitted && (
          <>
              <input
                  type="email"
                  placeholder='Email'
                  value={email}
                  onChange={(e)=>setEmail(e.target.value)}
                  className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  required
              />

              {!loginWithOTP && (
                  <input
                      type="password"
                      placeholder='Password'
                      value={password}
                      onChange={(e)=>setPassword(e.target.value)}
                      className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500'
                      required
                  />
              )}

              {loginWithOTP && otpSent && (
                  <input
                      type="text"
                      placeholder='Verification Code'
                      value={otp}
                      onChange={(e)=>setOtp(e.target.value)}
                      className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500'
                      required
                  />
              )}

          </>
        )}

        {currState === 'Sign up' && isDataSubmitted && (
          <textarea 
            placeholder='Setup your Bio for your profile'
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className='p-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500'
            required
          ></textarea>  
        )}

        {loginWithOTP && otpSent && (
            <div className="text-sm text-right">

                {
                    otpCooldown > 0
                    ? (
                        <p className="text-gray-400 mb-2">
                            Resend OTP in {otpCooldown}s
                        </p>
                    )
                    : (
                        <p
                            className="text-violet-400 cursor-pointer hover:underline mb-2"
                            onClick={handleResendOTP}
                        >
                            Didn't receive OTP? Resend OTP
                        </p>
                    )
                }

            </div>
        )
        }

        <button 
          type='submit'
          disabled = {otpLoading}
          className={`py-3 rounded-md text-white transition-all
          ${
              otpLoading
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-400 to-violet-600 cursor-pointer"
          }`}
        >
          {currState === "Sign up"
            ? "Create Account"
            : loginWithOTP
                ? (
                    otpLoading
                    ? "Sending..."

                    : otpSent
                    ? "Verify & Login"
                    : "Send OTP"
                )
                : "Login"
          }
        </button>

        {currState==="Login" && (
          <p
            className='text-center text-violet-500 cursor-pointer'
            onClick={()=>{
              setLoginWithOTP(prev=>!prev)
              setOtpSent(false)
              setOtp("")
            }}
          >
            {loginWithOTP ? "Login using password" : "Login using OTP"}
          </p>
        )}

        <div className='flex items-center gap-2 text-sm text-gray-500'>
          <input type="checkbox"/>
          <p>Agree to the terms of use & privacy policy.</p>
        </div>

        <div className='flex flex-col gap-2'>
          {currState === "Sign up" ? (
            <p className='text-sm text-gray-600'>Already have an account? 
            <span onClick={() => {setCurrState("Login"); setIsDataSubmitted(false)}} className='font-medium text-violet-500 cursor-pointer'>Login here</span> </p>
          ) : (
            <p className='text-sm text-gray-600'>Create an account 
            <span onClick={() => setCurrState("Sign up")} className='font-medium text-violet-500 cursor-pointer'>Click here</span></p>
          )} 
        </div>

      </form>


    </div>
  )
}

export default LoginPage
