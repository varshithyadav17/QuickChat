import React, { useContext, useEffect, useRef, useState } from 'react'
import assets from '../assets/assets'
import { formatMessageTime, formatLastSeen } from '../lib/utils'
import { AuthContext } from '../../context/AuthContext'
import { ChatContext } from '../../context/ChatContext'
import { FriendContext } from '../../context/FriendContext'
import toast from 'react-hot-toast'

const ChatContainer = () => {
    
    const { socket, authUser, onlineUsers, offlineUsers } = useContext(AuthContext)
    const { messages, selectedUser, setSelectedUser, sendMessage, getMessages, setShowRightSidebar, isTyping, setIsTyping } = useContext(ChatContext)
    const { relationshipStatus, removeFriend, blockUser, unblockUser } = useContext(FriendContext)
    const scrollEnd = useRef()
    const typingTimeoutRef = useRef()

    const [input, setInput] = useState('')
    const [, forceUpdate] = useState(0)

    // HANDLE SENDING A MESSAGE
    const handleSendMessage = async (e) => {
        e.preventDefault()
        if(input.trim() === "") return null

        await sendMessage({text: input.trim()})
        setInput("")
    }

    //HANDLE SENDING AN IMAGE 
    const handleSendImage = async (e) => {
        const file = e.target.files[0]

        if(!file || !file.type.startsWith("image/")){
            toast.error("select an image type")
            return  
        }

        const reader = new FileReader()
        reader.onloadend = async () => {
            await sendMessage({image: reader.result})
            e.target.value = ""
        }
        reader.readAsDataURL(file)
    }

    useEffect(()=>{
        if(selectedUser){
            getMessages(selectedUser._id)
        }
    },[selectedUser])

    useEffect(() => {
        if(scrollEnd.current && messages){
            scrollEnd.current.scrollIntoView({ behavior: 'smooth' })
        }
    },[messages])

    useEffect(() => {        
        const interval = setInterval(() => {
            forceUpdate(prev => prev + 1)
        }, 1000)

        return () => clearInterval(interval)
    }, [])
  
    return selectedUser ? (

  <div className='h-full overflow-scroll relative backdrop-blur-lg'>
    
    {/* -------- HEADER -------- */}

    <div className='flex items-center gap-3 py-3 mx-4 border-b border-stone-500'>

      <img
        onClick={() => setShowRightSidebar(true)}
        src={selectedUser.profilePic || assets.avatar_icon}
        alt=""
        className='w-9 h-9 rounded-full object-cover'
      />

      <div className='flex-1'>
        <p className='text-lg text-white'>
            {selectedUser.fullName}
        </p>

        {isTyping ? (
            <p className='text-xs text-green-400'>
                typing...
            </p>
        ) : (
            relationshipStatus === "friend" && <p className='text-xs text-gray-400'>
                {selectedUser.lastSeen ? 
                    (onlineUsers.includes(selectedUser._id) ? "Online" : `Last seen ${formatLastSeen(selectedUser.lastSeen)}`)
                    :
                    (onlineUsers.includes(selectedUser._id) ? "Online" : offlineUsers[selectedUser._id] ? `Last seen ${formatLastSeen(selectedUser.lastSeen)}` : "")
                }
            </p>
        )}
    
      </div>

      <img
        onClick={() => setSelectedUser(null)}
        src={assets.arrow_icon}
        alt=""
        className='md:hidden max-w-7'
      />

      <div className="relative group">
        <img
            src={assets.help_icon}
            alt=""
            className='max-md:hidden max-w-5 cursor-pointer'
        />

        {(relationshipStatus === "none" || relationshipStatus === "request_sent" || relationshipStatus === "incoming_request" || relationshipStatus === "friend" || relationshipStatus === "blocked_by_me" || relationshipStatus === "blocked_by_both" || relationshipStatus === "blocked_by_them") && 
        <div className='absolute top-full right-0 z-20 w-40 p-4 rounded-md bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:block'>

            {relationshipStatus === "friend" && (
            <>
                <p
                    onClick={() => removeFriend(selectedUser._id)}
                    className='cursor-pointer text-sm'
                >
                    Remove Friend
                </p>

                <hr className='my-2 border-t border-gray-500' />

                <p
                    onClick={() => blockUser(selectedUser._id)}
                    className='cursor-pointer text-sm text-red-400'
                >
                    Block User
                </p>
            </>
            )}

            {(relationshipStatus === "blocked_by_both" || relationshipStatus === "blocked_by_me") && (
                <p
                    onClick={() => unblockUser(selectedUser._id)}
                    className='cursor-pointer text-sm text-green-400'
                >
                Unblock User
                </p>
            )}

            {relationshipStatus === "blocked_by_them" && (
                <p
                    onClick={() => blockUser(selectedUser._id)}
                    className='cursor-pointer text-sm text-red-400'
                >
                Block User
                </p>
            )}

            {(relationshipStatus === "none" || relationshipStatus === "request_sent" || relationshipStatus === "incoming_request") && (
                <p
                    onClick={() => blockUser(selectedUser._id)}
                    className='cursor-pointer text-sm text-red-400'
                >
                Block User
                </p>
            )}

        </div>}
      </div>

    </div>

    {/* -------- MESSAGES -------- */}

    <div className='flex flex-col h-[calc(100%-120px)] overflow-y-scroll p-3 pb-6'>

        {messages.map((msg) => (

        <div key={msg._id} className={`flex items-end gap-2 justify-end ${String(msg.senderId) !== String(authUser._id) && 'flex-row-reverse'}`}>

        {msg.image ? (
            <img src={msg.image} alt="" className='max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8' />
        ) : (
            <p className={`p-2 max-w-[200px] md:text-sm font-light rounded-lg mb-8 break-all bg-violet-500/30 text-white ${msg.senderId === authUser._id ? 'rounded-br-none' : 'rounded-bl-none'}`}>
            {msg.text}
            </p>
        )}

        <div className="text-center text-xs">
            <img src={String(msg.senderId) === String(authUser._id) ? (authUser?.profilePic || assets.avatar_icon) : (selectedUser?.profilePic || assets.avatar_icon)} alt="" className='w-7 rounded-full' />
            <p className='text-gray-500'>{formatMessageTime(msg.createdAt)}</p>
        </div>

        </div>

        ))}

        <div ref={scrollEnd}></div>

    </div>

    {/* -------- BOTTOM AREA -------- */}

    {relationshipStatus === "friend" ? (

    <div className='absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3'>

        <div className='flex-1 flex items-center bg-gray-100/12 px-3 rounded-full'>

            <input
                onChange={(e) => {
                    setInput(e.target.value)

                    socket.emit("typing", {
                        receiverId: selectedUser._id
                    })

                    clearTimeout(typingTimeoutRef.current)

                    typingTimeoutRef.current = setTimeout(() => {
                        socket.emit("stopTyping", {
                            receiverId: selectedUser._id
                        })
                    }, 1000)
                }}
                value={input}
                onKeyDown={(e) => e.key === 'Enter' ? handleSendMessage(e) : null}
                type="text"
                placeholder='Send a message'
                className='flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400'
            />

            {/* here we did give input file type but we hid the choose file and gave a label to this using its id,
            so when we click the image icon it behaves like we clicked the hidden choose file input and we can choose an image to send */}
            <input
                onChange={handleSendImage}
                type="file"
                id='image'
                accept='image/png, image/jpeg'
                hidden
            />

            <label htmlFor='image'>
                <img
                    src={assets.gallery_icon}
                    alt=""
                    className='w-5 mr-2 cursor-pointer'
                />
            </label>

        </div>

        <img
            onClick={handleSendMessage}
            src={assets.send_button}
            alt=""
            className='w-7 cursor-pointer'
        />

    </div>  

    ) : (

        <div className='h-16 flex items-center justify-center border-t border-gray-700 text-gray-400 text-sm'>
            {relationshipStatus === "blocked_by_me" &&
            `You blocked this user. Unblock to connect with ${selectedUser.fullName}.`
            }

            {relationshipStatus === "blocked_by_them" &&
            "You cannot message this user anymore."
            }

            {relationshipStatus === "blocked_by_both" &&
            `You blocked this user. Unblock to connect with ${selectedUser.fullName}.`
            }

            {relationshipStatus === "none" &&
            "Become friends to continue chatting."
            }

            {relationshipStatus === "request_sent" &&
            "Friend request sent. Waiting for acceptance."
            }

            {relationshipStatus === "incoming_request" &&
            "Accept the friend request to continue chatting."
            }    
        </div>

        )
    }

 </div>

  ) : (

    <div className='flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden'>

        <img
          src={assets.logo_icon}
          className='max-w-16'
          alt=""
        />

        <p className='text-lg font-medium text-white'>
            Chat anytime, anywhere
        </p>

    </div>

)
}

export default ChatContainer
