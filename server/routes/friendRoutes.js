import express from "express"
import { protectRoute } from "../middleware/auth.js"
import {
    searchUser,
    sendFriendRequest,
    getFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    blockUser,
    getBlockedUsers,
    unblockUser,
    removeFriend,
    getRelationshipStatus
} from "../controllers/friendController.js"

const friendRouter = express.Router()

friendRouter.get("/search/:email", protectRoute, searchUser)

friendRouter.get("/blocked", protectRoute, getBlockedUsers)

friendRouter.get("/status/:id", protectRoute, getRelationshipStatus)

friendRouter.post("/send/:id", protectRoute, sendFriendRequest)

friendRouter.get("/requests", protectRoute, getFriendRequests)

friendRouter.put("/accept/:id", protectRoute, acceptFriendRequest)

friendRouter.delete("/reject/:id", protectRoute, rejectFriendRequest)

friendRouter.delete("/remove/:id", protectRoute, removeFriend)

friendRouter.put("/block/:id", protectRoute, blockUser)

friendRouter.put("/unblock/:id", protectRoute, unblockUser)

export default friendRouter