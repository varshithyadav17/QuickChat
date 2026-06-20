import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    email: {type: String, required: true, unique: true},
    fullName: {type: String, required: true},
    password: {type: String, required: true, minlength: 6},
    profilePic: {type: String, default: ""},
    bio: {type: String},

    friends: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],

    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],

    lastSeen: {
      type: Date,
      default: null
    },

    loginOTP:{
      type:String,
      default:""
    },

    loginOTPExpiry:{
      type:Date
    }

}, {timestamps: true})

const User = mongoose.model('User', userSchema)

export default User