import React, { useContext, useState } from 'react'
import Sidebar from '../components/Sidebar'
import ChatContainer from '../components/ChatContainer'
import RightSidebar from '../components/RightSidebar'
import { ChatContext } from '../../context/ChatContext'

const HomePage = () => {

    const { selectedUser , showRightSidebar } = useContext(ChatContext)

  return (
    <div className='w-full h-screen p-9'>
      <div className={`backdrop-blur-xl border-2 border-gray-600 rounded-2xl overflow-hidden h-full grid grid-cols-1 relative
                      ${selectedUser ? ( showRightSidebar ? 'md:grid-cols-[25%_50%_25%]' : 'md:grid-cols-[30%_70%]' ) : 'md:grid-cols-[30%_70%]'}`
                    }>
        <Sidebar />
        <ChatContainer />
        {showRightSidebar && <RightSidebar />}
      </div>
    </div>
  )
}

export default HomePage
