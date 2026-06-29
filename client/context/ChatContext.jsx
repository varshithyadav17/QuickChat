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
    const [messagesLoading, setMessagesLoading] = useState(false);

    const {socket, axios, authUser} = useContext(AuthContext)

    const selectedUserRef = useRef(null)

    useEffect(()=>{
        subscribeToMessages()
        return () => unsubscribeFromMessages()
    },[socket])

    useEffect(() => {
        console.log("SELECTED USER =", selectedUser);
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
    const getMessages = async (userId) => {

        try {

            setMessagesLoading(true);

            const { data } = await axios.get(`/api/messages/${userId}`);

            if (data.success) {
                setMessages(data.messages);
            }

        } catch (error) {

            toast.error(error.message);

        } finally {

            setMessagesLoading(false);

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
            const currentChatId = selectedUserRef.current?._id;

            const isCurrentChat =
                currentChatId &&
                (
                    newMessage.senderId === currentChatId ||
                    newMessage.receiverId === currentChatId
                );

            const chatUserId =
                newMessage.senderId === authUser._id
                    ? newMessage.receiverId
                    : newMessage.senderId;

            if (isCurrentChat) {

                newMessage.seen = true;

                setMessages(prev => [...prev, newMessage]);

                axios.put(`/api/messages/mark/${newMessage._id}`);

                updateUserOrder(chatUserId, newMessage);

            } else {

                if (newMessage.senderId !== authUser._id) {
                    setUnseenMessages(prev => ({
                        ...prev,
                        [chatUserId]: prev[chatUserId]
                            ? prev[chatUserId] + 1
                            : 1
                    }));
                }

                updateUserOrder(chatUserId, newMessage);

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

        socket.on("UserOnline", ({userId}) => {

            console.log("CHAT ONLINE", userId)

            if(selectedUserRef.current?._id === userId){
                setSelectedUser(prev => ({
                    ...prev,
                    lastSeen: null
                }))

            }
        })

        socket.on("messagesSeen", ({ userId }) => {

            setUnseenMessages(prev => {
                const updated = { ...prev }
                delete updated[userId]
               return updated
            })

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
        if(!socket) return
        
        socket.off("UserOnline")
        socket.off("newMessage")
        socket.off("UserOffline")
        socket.off("messagesSeen") 
        socket.off("userTyping")
        socket.off("userStopTyping")

        
    }

    const resetChatState = () => {

        setMessages([]);
        setUsers([]);
        setSelectedUser(null);
        setUnseenMessages({});
        setShowRightSidebar(false);
        setIsTyping(false);
        setMessagesLoading(false);
    }


    const value = {
        messages,
        messagesLoading,
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
        setIsTyping,
        resetChatState
    }

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    )
}