import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";
import { protectRoute } from "../middleware/auth.js"
import { io, userSocketMap } from "../server.js"

export const searchUser = async (req, res) => {

    try {

        const { email } = req.params

        const user = await User.findOne({ email }).select("-password")
        let status = "none"

        if(!user){
            return res.json({
                success: false,
                message: "User not found"
            })
        }

        if(user.blockedUsers.includes(req.user._id)){
            return res.json({
                success:false,
                message:"User not found"
            })
        }

        const currentUser = await User.findById(req.user._id)

        if(currentUser.blockedUsers.includes(user._id)){
            return res.json({
                success:false,
                message:"User not found"
            })
        }

        const sentRequest = await FriendRequest.findOne({
            senderId:req.user._id,
            receiverId:user._id
        })
        if(sentRequest){
            status = "request_sent"
        }

        const incomingRequest = await FriendRequest.findOne({
            senderId:user._id,
            receiverId:req.user._id
        })
        if(incomingRequest){
            status = "incoming_request"
        }

        if(user.friends.includes(req.user._id)){
            status = "friend"
        }



        res.json({
            success: true,
            user,
            status
        })

    } catch(error){
        console.log(error.message)
        res.json({
            success:false,
            message:error.message
        })
    }

}


export const sendFriendRequest = async (req,res)=>{
    
    try{

        const senderId = req.user._id
        const receiverId = req.params.id

        if(senderId.toString() === receiverId){
            return res.json({
                success:false,
                message:"cannot send request to yourself"
            })
        }

        const receiver = await User.findById(receiverId)

        if(!receiver){
            return res.json({
                success:false,
                message:"User not found"
            })
        }

        if(receiver.blockedUsers.includes(senderId)){
            return res.json({
                success:false,
                message:"Cannot send request"
            })
        }

        const alreadyFriends =
            receiver.friends.includes(senderId)

        if(alreadyFriends){
            return res.json({
                success:false,
                message:"Already friends"
            })
        }

        const existingRequest =
            await FriendRequest.findOne({
                senderId,
                receiverId
            })

        if(existingRequest){
            return res.json({
                success:false,
                message:"Request already sent"
            })
        }

        await FriendRequest.create({
            senderId,
            receiverId
        })
        
        // real time update using socket.io
        const receiverSocketId = userSocketMap[receiverId]
        if(receiverSocketId){
            io.to(receiverSocketId).emit("newFriendRequest")

        }

        res.json({
            success:true,
            message:"Friend request sent"
        })

    }catch(error){
        console.log(error.message)

        res.json({
            success:false,
            message:error.message
        })
    }
}


export const getFriendRequests = async (req,res)=>{

    try{

        const requests = await FriendRequest.find({
            receiverId:req.user._id
        }).populate(
            "senderId",
            "fullName email profilePic"
        )

        res.json({
            success:true,
            requests
        })

    }catch(error){

        console.log(error.message)

        res.json({
            success:false,
            message:error.message
        })

    }

}


export const acceptFriendRequest = async (req,res)=>{

    try{

        const requestId = req.params.id

        const request =
            await FriendRequest.findById(requestId)

        if(!request){
            return res.json({
                success:false,
                message:"Request not found"
            })
        }

        await User.findByIdAndUpdate(
            request.senderId,
            {
                $addToSet:{
                    friends:request.receiverId
                }
            }
        )

        await User.findByIdAndUpdate(
            request.receiverId,
            {
                $addToSet:{
                    friends:request.senderId
                }
            }
        )
        
        await FriendRequest.findByIdAndDelete(requestId)

        // on spot relationshipstatus change using socket.io
        const senderSocketId = userSocketMap[request.senderId]
        if(senderSocketId){
            io.to(senderSocketId).emit("RequestAccepted", { userId: request.receiverId })
        
            io.to(senderSocketId).emit(
                "RelationshipStatusChanged",
                {
                    userId:req.user._id
                }
            )
        }
        
        res.json({
            success:true,
            message:"Friend added",
            friendId:request.receiverId
        })

    }catch(error){

        console.log(error.message)

        res.json({
            success:false,
            message:error.message
        })

    }

}


export const rejectFriendRequest = async (req,res)=>{

    try{
        const requestId = req.params.id

        const request = await FriendRequest.findById(requestId)

        // real time rejection 
        const senderSocketId = userSocketMap[request.senderId]
        if(senderSocketId){
            io.to(senderSocketId).emit("RequestRejected", { userId: request.receiverId })
        }

        await FriendRequest.findByIdAndDelete(requestId)

        res.json({
            success:true,
            message:"Request rejected"
        })
    }catch(error){
        console.log(error.message)

        res.json({
            success:false,
            message:error.message
        })

    }

}

export const removeFriend = async (req,res) => {

    try{

        const friendId = req.params.id

        await User.findByIdAndUpdate(
            req.user._id,
            {
                $pull:{
                    friends: friendId
                }
            }
        )

        await User.findByIdAndUpdate(
            friendId,
            {
                $pull:{
                    friends: req.user._id
                }
            }
        )

        const friendSocketId = userSocketMap[friendId]

        if(friendSocketId){
            io.to(friendSocketId).emit(
                "RelationshipStatusChanged",
                {
                    userId:req.user._id
                }
            )
        }

        res.json({
            success:true,
            message:"Friend removed"
        })

    }catch(error){

        res.json({
            success:false,
            message:error.message
        })

    }

}


export const blockUser = async (req,res)=>{

    try{

        const blockedUserId = req.params.id

        if(req.user._id.toString() === blockedUserId){
            return res.json({
                success:false,
                message:"Cannot block yourself"
            })
        }

        await User.findByIdAndUpdate(
            req.user._id,
            {
                $addToSet:{
                    blockedUsers: blockedUserId
                },
                $pull:{
                    friends: blockedUserId
                }
            }
        )

        await User.findByIdAndUpdate(
            blockedUserId,
            {
                $pull:{
                    friends:req.user._id
                }
            }
        )

        await FriendRequest.deleteMany({
            $or:[
                {
                    senderId:req.user._id,
                    receiverId:blockedUserId
                },
                {
                    senderId:blockedUserId,
                    receiverId:req.user._id
                }
            ]
        })

        const blockedUserSocketId = userSocketMap[blockedUserId]

        if(blockedUserSocketId){
            io.to(blockedUserSocketId).emit(
                "RelationshipStatusChanged",
                {
                    userId: req.user._id
                }
            )
        }

        res.json({
            success:true,
            message:"User blocked"
        })

    }catch(error){

        res.json({
            success:false,
            message:error.message
        })

    }

}

export const unblockUser = async (req,res)=>{

    try{

        await User.findByIdAndUpdate(
            req.user._id,
            {
                $pull:{
                    blockedUsers:req.params.id
                }
            }
        )

        const unblockedUserSocketId = userSocketMap[req.params.id]

        if(unblockedUserSocketId){
            io.to(unblockedUserSocketId).emit("RelationshipStatusChanged",
                {
                    userId:req.user._id
                }
            ) 
        }      

        res.json({
            success:true,
            message:"User unblocked"
        })

    }catch(error){

        res.json({
            success:false,
            message:error.message
        })

    }

}

export const getBlockedUsers = async (req,res)=>{

    try{

        const currentUser =
        await User.findById(req.user._id)
        .populate(
            "blockedUsers",
            "fullName email profilePic"
        )

        res.json({
            success:true,
            users:currentUser.blockedUsers
        })

    }catch(error){

        res.json({
            success:false,
            message:error.message
        })

    }

}

export const getRelationshipStatus = async (req,res) => {

    try{

        const userId = req.params.id
        const user = await User.findById(userId)

        let status = "none"

        const iBlockedThem = req.user.blockedUsers.some(id => id.toString() === userId)
        const theyBlockedMe = user.blockedUsers.some(id => id.toString() === req.user._id.toString())

        if(iBlockedThem && theyBlockedMe){
            status = "blocked_by_both"
        }
        else if(iBlockedThem){
            status = "blocked_by_me"
        }
        else if(theyBlockedMe){
            status = "blocked_by_them"
        }
        else if(req.user.friends.includes(userId)){
            status = "friend"
        }
        else{

            const sentRequest =
            await FriendRequest.findOne({
                senderId:req.user._id,
                receiverId:userId
            })

            if(sentRequest){
                status = "request_sent"
            }

            const incomingRequest =
            await FriendRequest.findOne({
                senderId:userId,
                receiverId:req.user._id
            })

            if(incomingRequest){
                status = "incoming_request"
            }

        }

        res.json({
            success:true,
            status
        })

    }catch(error){

        res.json({
            success:false,
            message:error.message
        })

    }

}