import toast from 'react-hot-toast'
import { io } from 'socket.io-client'
import { useState, useContext, createContext } from "react"
import { AuthContext } from './AuthContext'
import { useEffect } from 'react'
import { ChatContext } from './ChatContext'



export const FriendContext = createContext()

export const FriendProvider = ({children}) => {

    const { authUser, axios, socket } = useContext(AuthContext)   
    const { getUsers, selectedUser } = useContext(ChatContext)

    const [searchedUser, setSearchedUser] = useState(null)
    const [relationshipStatus, setRelationshipStatus] = useState("none")
    const [requests, setRequests] = useState([])
    const [blockedUsers, setBlockedUsers] = useState([])

    useEffect(() => {
        getRequests()
        getUsers()
    }, [])

    useEffect(() => {
        if(!socket) return

        socket.on("newFriendRequest", () => {
            console.log("NEW FRIEND REQUEST RECEIVED")
            getRequests()
        })

        socket.on("RequestAccepted", async (data) => {
            getUsers()
            getRequests()
            await getRelationshipStatus(data.userId)
        })

        socket.on("RequestRejected", async (data) => {    
            getRequests()
            await getRelationshipStatus(data.userId)
        })
        
        socket.on("UserBlocked", async (data) => {
            getUsers()
            getRequests()
            await getRelationshipStatus(data.userId)
        })

        socket.on("RelationshipStatusChanged",async(data)=>{

            if(selectedUser?._id === data.userId){
                await getRelationshipStatus(data.userId)
            }
            getUsers()
            getRequests()
        })

        return () => {
            socket.off("newFriendRequest")
            socket.off("RequestAccepted")
            socket.off("RequestRejected")
            socket.off("UserBlocked")
            socket.off("RelationshipStatusChanged")
        }
    }, [socket, selectedUser])


    const searchUserByEmail = async (email) => {
        
        try {
            const { data } = await axios.get(`/api/friends/search/${email}`)
            if(data.success){
                setSearchedUser(data.user)
                setRelationshipStatus(data.status)
            }

        } catch (error) {
            console.log(error)
        }
    }

    const getRelationshipStatus = async(userId)=>{

        const {data} = await axios.get(`/api/friends/status/${userId}`)

        if(data.success){
            setRelationshipStatus(data.status)
        }
    }

    const sendRequest = async (userId) => {

        try {
            const { data } = await axios.post(`/api/friends/send/${userId}`)
            if(data.success){
                await getRelationshipStatus(userId)
            }
        } catch(error){
            console.log(error)
        }
    }

    const getRequests = async ()=>{

        try{
            const {data} =
            await axios.get("/api/friends/requests")

            if(data.success){
                setRequests(data.requests)
            }

        }catch(error){
            console.log(error)
        }

    }

    const acceptRequest = async (requestId)=>{

        try{
            const {data} = await axios.put(`/api/friends/accept/${requestId}`)

            if(data.success){
                getRequests()
                await getRelationshipStatus(data.friendId)
                getUsers()
            }
        }catch(error){
            console.log(error)
        }

    }

    const rejectRequest = async (requestId)=>{

        try{
            const {data} = await axios.delete(`/api/friends/reject/${requestId}`)

            if(data.success){
                getRequests()
            }
        }catch(error){
            console.log(error)
        }
    }

    const blockUser = async (userId) => {

        try{
            const { data } = await axios.put(`/api/friends/block/${userId}`)

            if(data.success){
                setSearchedUser(null)
                await getRelationshipStatus(userId)
                getUsers()
                getRequests()
            }
        }catch(error){
            console.log(error)
        }

    }

    const unblockUser = async(userId)=>{
        const {data} = await axios.put(`/api/friends/unblock/${userId}`)

        if(data.success){
            getBlockedUsers()
            await getRelationshipStatus(userId)
        }
    }

    const getBlockedUsers = async () => {

        try {   
            const { data } = await axios.get("/api/friends/blocked")
            
            if(data.success){
                setBlockedUsers(data.users)
            }
        } catch (error) {
            console.log(error)
        }
    }

    const removeFriend = async(userId) => {

        try{
            const {data} = await axios.delete(`/api/friends/remove/${userId}`)

            if(data.success){
                await getRelationshipStatus(userId)
                getUsers()
            }

        }catch(error){
            console.log(error)
        }

    }

    const value={
        requests,
        searchedUser,
        relationshipStatus,
        blockedUsers,
        getRelationshipStatus,
        removeFriend,
        unblockUser,
        getBlockedUsers,
        setSearchedUser,
        setRelationshipStatus,
        setRequests,
        searchUserByEmail,
        sendRequest,
        getRequests,
        acceptRequest,
        rejectRequest,
        blockUser
    }

    return(
        <FriendContext.Provider value = {value}>
            {children}
        </FriendContext.Provider>
    )

}
