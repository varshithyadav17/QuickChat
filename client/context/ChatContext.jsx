import { createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";
import { useRef } from "react"


export const ChatContext = createContext()

export const ChatProvider = ({children}) => {

    const [messages , setMessages] = useState([])
    const [users, setUsers] = useState([])
    const [selectedUser, setSelectedUser] = useState(null)
    const [unseenMessages, setUnseenMessages] = useState({})
    const [showRightSidebar, setShowRightSidebar] = useState(false)
    const [isTyping, setIsTyping] = useState(false)

    const {socket, axios} = useContext(AuthContext)

    const selectedUserRef = useRef(null)

    useEffect(()=>{
        subscribeToMessages()
        return () => unsubscribeFromMessages()
    },[socket])

    useEffect(() => {
        selectedUserRef.current = selectedUser
        }, [selectedUser]
    )

    //function to get all users 
    const getUsers = async ()=>{
        try {
            const { data } = await axios.get('/api/messages/users')
            if(data.success){
                setUsers(data.users)
                setUnseenMessages(data.unseenMessages)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const getLastMessagePreview = (message) => {

        if (message.text) return message.text

        if (message.image) return "📷 Photo"

        if (message.video) return "🎥 Video"

        if (message.file) return "📄 Document"

        return "New message"
    }

    const updateUserOrder = (userId, message) => {
        setUsers(prevUsers => {
            const updatedUsers = prevUsers.map(user =>
                user._id === userId
                    ? {
                        ...user,
                        lastMessage: getLastMessagePreview(message),
                        lastMessageTime: message.createdAt
                    }
                    : user
            )
            const index = updatedUsers.findIndex(user => user._id === userId)
            if (index === -1) return updatedUsers

            const [activeUser] = updatedUsers.splice(index, 1)

            return [activeUser, ...updatedUsers]
        })
    }

    // function to get messages for selected users
    const getMessages = async (userId)=>{
        try {
            const {data} = await axios.get(`/api/messages/${userId}`)
            if(data.success){
                setMessages(data.messages)
            }
        } catch (error) {
            toast.error(error.messages)
        }
    }

    //function to send a msg to a particular user
    const sendMessage = async (messageData)=>{
        try {
            const { data } = await axios.post(`/api/messages/send/${selectedUser._id}`, {...messageData, senderSocketId: socket.id})
            if(data.success){
                setMessages(prev => [...prev,data.message])
                updateUserOrder(selectedUser._id, data.message)               
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    //function to subscribe to messages for selected user
    const subscribeToMessages = async () => {

        if(!socket) return;
        
        socket.on("newMessage", (newMessage)=>{
            if(selectedUserRef.current && newMessage.senderId === selectedUserRef.current._id){
                newMessage.seen = true
                setMessages((prevMessages) => {
                    return [...prevMessages, newMessage]
                })
                axios.put(`/api/messages/mark/${newMessage._id}`)
                updateUserOrder(newMessage.senderId, newMessage)
            }else{
                setUnseenMessages((prevUnseenMessages) => ({
                    ...prevUnseenMessages,
                    [newMessage.senderId] : prevUnseenMessages[newMessage.senderId] ? prevUnseenMessages[newMessage.senderId] + 1 : 1
                }))

                updateUserOrder(newMessage.senderId, newMessage)
            }
        })

        socket.on("UserOffline", ({userId, lastSeen}) => {
            console.log("CHAT OFFLINE", userId)
            console.log(
        "CURRENT SELECTED:",
        selectedUserRef.current?._id
    )
            if(selectedUserRef.current?._id == userId){
                setSelectedUser(prev => ({
                    ...prev,
                    lastSeen
                }))
            }
        })

        socket.on("userOnline", ({userId}) => {

            console.log("CHAT ONLINE", userId)

            if(selectedUserRef.current?._id === userId){
                setSelectedUser(prev => ({
                    ...prev,
                    lastSeen: null
                }))

            }
        })

        socket.on("userTyping", ({userId}) => {

            if(selectedUserRef.current?._id === userId){
                setIsTyping(true)
            }
        })

        socket.on("userStopTyping", ({userId}) => {

            if(selectedUserRef.current?._id === userId){
                setIsTyping(false)
            }
        })

    }

    //function to unsubscribe from messages
    const unsubscribeFromMessages = ()=>{
        if(socket){
            socket.off("UserOnline")
            socket.off("newMessage")
            socket.off("UserOffline")
        } 
    }


    const value = {
        messages,
        users,
        selectedUser,
        unseenMessages,
        getUsers,
        setMessages,
        getMessages,
        sendMessage,
        setSelectedUser,
        setUnseenMessages,
        showRightSidebar,
        setShowRightSidebar,
        isTyping, 
        setIsTyping
    }

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    )
}