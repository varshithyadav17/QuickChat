import React, { useContext, useEffect, useState } from 'react'
import assets from '../assets/assets'
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ChatContext } from '../../context/ChatContext';
import { FriendContext } from '../../context/FriendContext';


const Sidebar = () => {

    const {getUsers, users, selectedUser, setSelectedUser, unseenMessages, setUnseenMessages} = useContext(ChatContext)
    const {logout, onlineUsers, axios} = useContext(AuthContext)
    const {requests, searchedUser, relationshipStatus, getRelationshipStatus, searchUserByEmail, sendRequest, getRequests, acceptRequest, rejectRequest, setSearchedUser, setRequests, blockUser, getBlockedUsers, blockedUsers, unblockUser} = useContext(FriendContext)

    const [input, setInput] = useState("")
    const [searchEmail, setSearchEmail] = useState("")
    const [activeTab, setActiveTab] = useState("friends")

    const navigate = useNavigate()

    const filteredUsers = input ? users.filter((user) => user.fullName.toLowerCase().includes(input.toLowerCase())) : users

    useEffect(()=>{
        getUsers()
        getRequests()
    },[onlineUsers])
    
    const changeTab = (tab) => {

        setActiveTab(tab)

        setSearchEmail("")
        setSearchedUser(null)

        if(tab === "requests"){
            getRequests()
        }

    }

    return (
    <>
    <div className={`bg-[#8185B2]/10 h-full p-5 rounded-r-xl text-white flex flex-col ${selectedUser ? "max-md:hidden" : ''}`}>
      <div className='pb-5'>

        <div className='flex justify-between items-center'>
            <img src={assets.logo} alt="logo" className='max-w-44' />
            <div className="relative py-2 group">
                <img src={assets.menu_icon} alt="menu" className='max-h-5 cursor-pointer' />
                <div className='absolute top-full right-0 z-20 w-32 p-5 rounded-md bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:block'>
                    <p onClick={() => navigate('/profile')} className='cursor-pointer text-sm'>Edit Profile</p>
                    <hr className='my-2 border-t border-gray-500' />
                    <p onClick={()=> {
                        setActiveTab("blocked")
                        getBlockedUsers()
                        }} 
                        className='cursor-pointer text-sm'
                    >
                    Blocked Users
                    </p>
                    <hr className='my-2 border-t border-gray-500'/>
                    <p onClick={()=> logout()} className='cursor-pointer text-sm'>Logout</p>
                </div>
            </div>           
        </div>

        <div className="bg-[#282142] rounded-full flex items-center gap-2 h-11 px-4 mt-5">
            <img src={assets.search_icon} alt="Search" className="w-3" />
            <input
                onChange={(e) => setInput(e.target.value)}
                type="text"
                className="bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8c8] flex-1"
                placeholder="Search friends..."
            />
        </div>

        <div className='flex mt-3 gap-2'>

            <button
                onClick={() => {
                    changeTab("friends")
                    setSearchEmail("")
                    setSearchedUser(null)
                }}
                className={`px-4 h-10 rounded-full transition-all text-sm
                    ${activeTab === "friends" ? "bg-violet-500 text-white" : "bg-[#282142] text-gray-300"}`
                }
            >
            Friends
            </button>

            <button
                onClick={() => {
                    changeTab("add")
                }}
                className={`px-4 h-10 rounded-full transition-all text-sm
                    ${activeTab === "add" ? "bg-violet-500 text-white" : "bg-[#282142] text-gray-300"}`
                }
            >
            Add Friends
            </button>

            <button
                onClick={() => {
                    changeTab("groups")
                    setSearchEmail("")
                    setSearchedUser(null)
                }}
                className={`px-4 h-10 rounded-full transition-all text-sm
                    ${activeTab === "groups" ? "bg-violet-500 text-white" : "bg-[#282142] text-gray-300"}`
                }
            >
            Groups
            </button>

            <button
                onClick={() => {
                    changeTab("requests")
                    setSearchEmail("")
                    setSearchedUser(null)
                }}
                className={`px-4 h-10 rounded-full transition-all text-sm relative
                    ${activeTab === "requests" ? "bg-violet-500 text-white" : "bg-[#282142] text-gray-300"}`
                }
            >
                Requests

                {requests.length > 0 && <span className='absolute -top-1 -right-1 bg-gray-500 text-[10px] min-w-5 h-4 flex items-center justify-center rounded-full'>
                    {requests.length}
                </span>}

            </button>

        </div>

      </div>

       <div className='flex-1 overflow-y-auto mt-3'>

            {activeTab === "friends" &&
            <div className='flex flex-col overflow-y-auto scroll-smooth h-full'>

                {filteredUsers.map((user, index) => (

                    <div
                        onClick={() =>{
                            setSelectedUser(user)
                            getRelationshipStatus(user._id)
                            setUnseenMessages(prev => ({...prev, [user._id]: 0}))
                        }}
                        key={index}
                        className={`relative flex items-center gap-3 px-3 py-4 rounded-xl cursor-pointer max-sm:text-sm transition-all
                            ${selectedUser?._id === user._id && 'bg-[#282142]/50'}`}
                    >

                        <img
                            src={user?.profilePic || assets.avatar_icon}
                            alt=""
                            className='w-12 h-12 rounded-full object-cover flex-shrink-0'
                        />

                        <div className='flex-1 min-w-0'>

                            <div className='flex justify-between items-center'>

                                <p className='font-medium truncate'>
                                {user.fullName}
                                </p>

                                <span className='text-xs text-green-400 flex-shrink-0'>
                                {user.lastMessageTime ? new Date(user.lastMessageTime).toLocaleTimeString([], {hour: '2-digit',minute: '2-digit'}): ""}
                                </span>

                            </div>

                            <div className='flex justify-between items-center mt-1'>

                                <p className='text-sm text-gray-400 truncate flex-1'>
                                {user.lastMessage || ""}
                                </p>

                                {selectedUser?._id !== user._id && unseenMessages[user._id] > 0 && (
                                    <span className='ml-2 bg-green-500 text-black text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0'>
                                    {unseenMessages[user._id]}
                                    </span>
                                )}

                            </div>

                        </div>

                    </div>

                ))}

            </div>

            }

            {activeTab === "add" &&
            <div className='flex flex-col gap-4 mt-5'>

                <div className='flex items-center justify-between'>

                    <h2 className='text-lg font-medium'>
                        Add Friend
                    </h2>

                    <button
                        onClick={() => {
                            setSearchEmail("")
                            setSearchedUser(null)
                        }}
                        className='text-gray-400 hover:text-white text-xl'
                    >
                    ×
                    </button>
            </div>

                <input
                    value={searchEmail}
                    onChange={(e)=>setSearchEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchUserByEmail(searchEmail)}
                    type='email'
                    placeholder='Enter Email'
                    className='bg-[#282142] h-11 px-4 rounded-lg outline-none'
                />

                {searchedUser &&
                <div className='bg-[#282142] p-3 rounded-lg'>
                    <div className='flex items-center gap-3'>

                        <img
                            src={searchedUser.profilePic || assets.avatar_icon}
                            alt=""
                            className='w-12 h-12 rounded-full object-cover'
                        />

                        <div>
                            <p className='font-medium'>
                            {searchedUser.fullName}
                            </p>

                            <p className='text-xs text-gray-400'>
                            {searchedUser.email}
                            </p>
                        </div>

                    </div>

                    {relationshipStatus === "none" &&
                    <button
                        onClick={() => {
                            sendRequest(searchedUser._id)
                            }}
                        className='bg-violet-500 w-full py-2 mt-3 rounded-lg'
                    >
                    Send Friend Request
                    </button>
                    }

                    {relationshipStatus === "request_sent" &&
                    <button
                        disabled
                        className='bg-yellow-600 w-full py-2 mt-3 rounded-lg'
                    >
                    Request Sent ✓
                    </button>
                    }

                    {relationshipStatus === "friend" &&
                    <button
                        onClick={() => {
                        setSelectedUser(searchedUser)
                        getRelationshipStatus(searchedUser._id)
                        changeTab("friends")
                        getUsers()
                        }}
                        className='bg-green-600 w-full py-2 mt-3 rounded-lg'
                    >
                    Message
                    </button>
                    }


                    {relationshipStatus === "incoming_request" &&
                    <button
                        onClick={() => changeTab("requests")}
                        className='bg-blue-600 w-full py-2 mt-3 rounded-lg'
                    >
                    View Request
                    </button>
                    }

                </div>

                }

            </div>

            }


            {activeTab === "groups" &&
            <div className='h-full flex items-center justify-center text-gray-400 text-sm'>
                No Groups Yet
            </div>

            }

            {activeTab === "requests" &&
            <div className='flex-1 overflow-y-auto scroll-smooth mt-3'>

                {requests.length === 0 &&
                    <p className='text-center text-gray-400 mt-10'>
                    No Requests Yet
                    </p>
                }

                <div className='flex flex-col'>

                    {requests.map((request,index)=>(

                    <div
                        key={index}
                        className='bg-[#282142]/60 p-3 rounded-xl mb-3'
                    >

                        <div className='flex items-center gap-3'>
                            <img
                                src={request.senderId.profilePic || assets.avatar_icon}
                                alt=""
                                className='w-12 h-12 rounded-full object-cover'
                            />

                            <div className='flex-1 min-w-0'>

                                <p className='truncate'>
                                {request.senderId.fullName}
                                </p>

                                <p className='text-xs text-gray-400 truncate'>
                                {request.senderId.email}
                                </p>

                            </div>
                        </div>

                        <div className='flex gap-2 mt-3'>

                            <button
                                onClick={() => acceptRequest(request._id)}
                                className='flex-1 bg-green-600 hover:bg-green-300 py-2 rounded-lg text-sm'
                            >
                            Accept
                            </button>

                            <button
                                onClick={() => rejectRequest(request._id)}
                                className='flex-1 bg-red-600 hover:bg-red-300 py-2 rounded-lg text-sm'
                            >
                            Reject
                            </button>

                            <button
                                onClick={() => blockUser(request.senderId._id)}
                                className='flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg text-sm'
                            >
                            🚫Block User
                            </button>

                        </div>

                    </div>

                    ))}

                </div>

            </div>
            }


            {activeTab === "blocked" &&
                <div className='flex-1 overflow-y-auto scroll-smooth mt-3'>

                    {blockedUsers.length === 0 &&
                        <p className='text-center text-gray-400 mt-10'>
                        No Blocked Users
                        </p>
                    }

                    {blockedUsers.map((user,index)=>(
                        <div
                            key={index}
                            className='bg-[#282142]/60 p-3 rounded-xl'
                        >

                            <div className='flex items-center gap-3'>
                                <img
                                    src={user.profilePic || assets.avatar_icon}
                                    alt=""
                                    className='w-12 h-12 rounded-full object-cover'
                                />

                                <div className='flex-1'>
                                    <p>
                                    {user.fullName}
                                    </p>

                                    <p className='text-xs text-gray-400'>
                                    {user.email}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    console.log("working unblock button")
                                    unblockUser(user._id)}}
                                className='w-full mt-3 bg-gray-600 hover:bg-gray-700 py-2 rounded-lg'
                            >
                            Unblock User
                            </button>

                        </div>
                    ))}

                </div>
            }


        </div>

    </div>
    </>
  )
}

export default Sidebar
