import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import http from 'http'
import "dotenv/config"
import { connectDB } from './lib/db.js';
import messageRouter from './routes/messageRoutes.js';
import userRouter from './routes/userRoutes.js';
import { Server } from 'socket.io';
import friendRouter from './routes/friendRoutes.js'
import User from "./models/User.js"

// create express app and HTTP server 
const app = express();

app.use(helmet())

// This creates a server that can receive requests from the internet/browser. It allows us to handle incoming HTTP requests and send responses back to the client. By using the http module, we can create a server that can listen for requests on a specific port and route those requests to the appropriate handlers defined in our Express app.
const server = http.createServer(app);

// Initialize socket.io server and pass the HTTP server to it. This allows socket.io to listen for WebSocket connections on the same server that is handling our HTTP requests. By doing this, we can enable real-time communication between the client and server using WebSockets, which is essential for features like instant messaging in a chat application.
export const io = new Server(server, {
    cors: { 
        origin: process.env.CLIENT_URL,
        credentials: true
     }
})

// store online users in a map where key is user id and value is socket id
export const userSocketMap = {}

export const disconnectTimers = {}

// socket.io connection handler - this function will run whenever a new client connects to the socket.io server. It listens for the "connection" event, which is emitted when a new client establishes a WebSocket connection with the server. Inside this handler, we can set up event listeners for various events that the client may emit, such as sending messages, joining rooms, etc. This is where we can manage real-time interactions between clients and the server.
io.on("connection", async (socket) => {
    const userId = socket.handshake.query.userId
    console.log("New client connected with userId: ", userId)
    
    if(userId){

        if(disconnectTimers[userId]){
            clearTimeout(disconnectTimers[userId])
            delete disconnectTimers[userId]
        }

        if(!userSocketMap[userId]){
            userSocketMap[userId] = []
        }

        userSocketMap[userId].push(socket.id)  

        socket.on("typing", ({ receiverId }) => {
            const receiverSockets = userSocketMap[receiverId]
            
            if(receiverSockets){
                receiverSockets.forEach(socketId => {

                    io.to(socketId).emit("userTyping", {
                        userId
                    })

                })
            }
        })

        socket.on("stopTyping", ({ receiverId }) => {
            const receiverSockets = userSocketMap[receiverId]
            
            if(receiverSockets){
                receiverSockets.forEach(socketId => {

                    io.to(socketId).emit("userStopTyping", {
                        userId
                    })

                })
            }
        })
        
        const user = await User.findById(userId)

        user.friends.forEach(friendId => {
            const friendSockets = userSocketMap[friendId.toString()]

                if(friendSockets){

                    friendSockets.forEach(socketId => {
                        io.to(socketId).emit("UserOnline", {
                            userId
                        })
                    })

                }
        })
    }  

    // emit online users to all connected clients 
    io.emit("getOnlineUsers", Object.keys(userSocketMap))

    socket.on("disconnect", async() => {
        
        
        console.log("Client disconnected with userId: ", userId)
        
        if(userId){
            userSocketMap[userId] = userSocketMap[userId].filter(
                id => id !== socket.id
            )

            if(userSocketMap[userId].length === 0){
                delete userSocketMap[userId]

                disconnectTimers[userId] = setTimeout(async () => {
                    console.log("TIMER FINISHED", userId)
                    const lastSeen = new Date()

                    const result = await User.findByIdAndUpdate(userId,{lastSeen},{new: true})
                    console.log("UPDATED USER:", result.lastSeen)
                    const user = await User.findById(userId)
                    console.log("db value:", user.lastSeen)
                    user.friends.forEach(friendId => {
                        const friendSockets = userSocketMap[friendId.toString()]

                        console.log(
            "FRIEND SOCKETS:",
            friendId.toString(),
            friendSockets
        )

                        if(friendSockets){
                            console.log(
                "EMITTING TO:",
                friendId.toString()
            )
                            friendSockets.forEach(socketId => {
                                console.log("EMITTING USEROFFLINE TO SOCKET:", socketId)
                                io.to(socketId).emit("UserOffline",{userId,lastSeen})
                            })
                        }

                    })

                    delete disconnectTimers[userId]

                },10000)
            }

        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap))
    })
})


// middleware setup ( for every request from frontend run these middlewares first before running the actual route handler)
// request from frontend -> run middlwares -> route handler -> response to frontend
//express.json() is used to parse incoming JSON data in the request body and make it available under req.body. The limit option is set to "4mb" to restrict the maximum size of the JSON payload that can be accepted by the server to 4 megabytes. This helps prevent potential issues with excessively large requests that could consume too much server resources or lead to denial of service attacks.
//app.use() ise used to mount the specified middleware function(s) at the path which is being specified.
app.use(express.json({limit: "4mb"}));
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

app.use("/api/status", (req, res) => res.send("server is live"));
app.use("/api/auth", userRouter)
app.use("/api/messages", messageRouter)
app.use("/api/friends", friendRouter)

// connect to mongodb databse before starting the server
await connectDB();


// here we are telling that our backend is ready and listenening for incoming requests on the specified port(either from .env or 5000). When the server starts successfully, it will log a message to the console indicating that it is running and on which port it is listening.
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log("Server is running on port:", PORT);
});

//export server for vercel or render 
export default server;

