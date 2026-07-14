// frontend/src/components/layout/Layout.tsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ChatButton from '../ia/ChatButton';


export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="d-flex vh-100">
      <Sidebar isOpen={sidebarOpen} />
      
      <div className="flex-grow-1 d-flex flex-column overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-grow-1 overflow-auto bg-light p-4">
          <Outlet />
        </main>
      </div>


      <ChatButton />
    </div>
  );
}