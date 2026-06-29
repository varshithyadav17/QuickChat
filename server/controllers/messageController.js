import Message from "../models/Message.js"
import User from "../models/User.js"
import cloudinary from "../lib/cloudinary.js"
import { io, userSocketMap } from "../server.js"
import { redis } from "../lib/redis.js";

const CHAT_CACHE_TTL = 600;

// get all user for sidebar 
export const getUserForSidebar = async (req, res) => {

    try {

        const userId = req.user._id
        const currentUser = await User.findById(userId)
    
        const messages = await Message.find({
            $or: [
                { senderId: userId },
                { receiverId: userId }
            ]
        })

        const conversationUserIds = new Set()

        messages.forEach(msg => {

            if(msg.senderId.toString() !== userId.toString()){
                conversationUserIds.add(msg.senderId.toString())
            }

            if(msg.receiverId.toString() !== userId.toString()){
                conversationUserIds.add(msg.receiverId.toString())
            }

        })

        const allUserIds = new Set([
            ...currentUser.friends.map(id => id.toString()),
            ...conversationUserIds
        ])

        const filteredUsers = (
            await User.find({
                _id: { $in: [...allUserIds] }
            }).select("-password")
        ).map(user => user.toObject())

        //count no.of messages unseen for each user
        const unseenMessages = {}
        const promises = filteredUsers.map(async(user) => {

            const messages = await Message.find({
                senderId: user._id,
                receiverId: userId,
                seen: false
            })

            if(messages.length > 0){
                unseenMessages[user._id] = messages.length
            }

            const lastMessage = await Message.findOne({
                $or:[
                        {
                            senderId:user._id,
                            receiverId:userId
                        },
                        {
                            senderId:userId,
                            receiverId:user._id
                        }
                    ]
            }).sort({createdAt:-1})

            user.lastMessage = lastMessage?.text || ""

            user.lastMessageTime = lastMessage?.createdAt || null
        })

        await Promise.all(promises)
        
        // in sort() if return neg means keep a first -> gives descending order 
        filteredUsers.sort((a,b)=>{

            const timeA = a.lastMessageTime ? new Date(a.lastMessageTime) : 0
            const timeB = b.lastMessageTime ? new Date(b.lastMessageTime) : 0

            return timeB - timeA
        })

        res.json({success: true, users: filteredUsers, unseenMessages})
        
    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }

}

// get all messages for selected user 
export const getMessages = async (req, res) => {
    try {

        const { id: selectedUserId } = req.params;
        const myId = req.user._id;

        const chatKey = `chat:${[myId.toString(), selectedUserId.toString()].sort().join(":")}`;

        // 1. Check Redis
        const cachedMessages = await redis.get(chatKey);

        if (cachedMessages) {

            console.log("✅ Chat Cache HIT");

            await Message.updateMany(
                {
                    senderId: selectedUserId,
                    receiverId: myId,
                },
                {
                    seen: true,
                }
            );

            const mySockets = userSocketMap[myId.toString()];

            if (mySockets) {
                mySockets.forEach(socketId => {
                    io.to(socketId).emit("messagesSeen", {
                        userId: selectedUserId,
                    });
                });
            }

            return res.json({
                success: true,
                messages: cachedMessages,
            });
        }

        console.log("❌ Chat Cache MISS");

        // 2. MongoDB
        const messages = await Message.find({
            $or: [
                {
                    senderId: myId,
                    receiverId: selectedUserId,
                },
                {
                    senderId: selectedUserId,
                    receiverId: myId,
                },
            ],
        }).sort({
            createdAt: 1,
        });

        await Message.updateMany(
            {
                senderId: selectedUserId,
                receiverId: myId,
            },
            {
                seen: true,
            }
        );

        const mySockets = userSocketMap[myId.toString()];

        if (mySockets) {
            mySockets.forEach(socketId => {
                io.to(socketId).emit("messagesSeen", {
                    userId: selectedUserId,
                });
            });
        }

        // 3. Store in Redis
        await redis.set(chatKey, messages, {
            ex: CHAT_CACHE_TTL,
        });

        res.json({
            success: true,
            messages,
        });

    } catch (error) {

        console.log(error.message);

        res.json({
            success: false,
            message: error.message,
        });

    }
};


// Api to mark messages as seen using messages id
export const markMessagesAsSeen = async (req, res) => {

    try {    
        const { id } = req.params
        await Message.findByIdAndUpdate(id, {seen: true})
        res.json({success: true})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message: error.message})
    }

}


//send message to selected user
export const sendMessage = async (req, res) => {
    try {
        const {text, image, senderSocketId} = req.body
        const receiverId = req.params.id
        const senderId = req.user._id
        const receiver = await User.findById(receiverId)
        const sender = await User.findById(senderId)

        if(receiver.blockedUsers.includes(senderId)){
            return res.json({
                success:false,
                message:"You can't message this user anymore."
            })
        }
        if(sender.blockedUsers.includes(receiverId)){
            return res.json({
                success:false,
                message:"You blocked this user."
            })
        }  
        if(!sender.friends.includes(receiverId)){
            return res.json({
                success:false,
                message:"Become friends to continue chatting."
            })
        } 

        let imageUrl;
        if(image){
            const uploadResponse = await cloudinary.uploader.upload(image)
            imageUrl = uploadResponse.secure_url
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
            image: imageUrl
        })

        const chatKey = `chat:${[
            senderId.toString(),
            receiverId.toString(),
        ].sort().join(":")}`;

        await redis.del(chatKey);

        console.log("🗑 Chat Cache Invalidated");
        
        //emit the new message to the receivers socket
        const receiverSockets = userSocketMap[receiverId]
        if(receiverSockets && !receiver.blockedUsers.includes(senderId)){
            receiverSockets.forEach(receiverSocketId => {
                io.to(receiverSocketId).emit("newMessage",newMessage)
            })
        }

        //emit to other login tabs of the sender side
        const senderSockets = userSocketMap[senderId]
        if(senderSockets){

            senderSockets.forEach(socketId => {

                if(socketId !== senderSocketId){
                    io.to(socketId).emit("newMessage",newMessage)
                }
            })
        }

        res.json({success: true, message: newMessage})

    } catch (error) {
        console.log(error.message)
        res.json({success: false, message:error.message})

    }
}