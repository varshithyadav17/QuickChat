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
  
  const [loginWithOTP, setLoginWithOTP] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")


  const {login, sendLoginOTP, verifyLoginOTP} = useContext(AuthContext)

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
          const success = await sendLoginOTP(email)

          if(success){
              setOtpSent(true)
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

        <button 
          type='submit'
          className='py-3 bg-gradient-to-r from-purple-400 to-violet-600 text-white rounded-md cursor-pointer'

        >
          {currState === "Sign up" ? "Create Account" 
            : loginWithOTP ? (otpSent ? "Verify & Login" : "Send OTP") : "Login"
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
