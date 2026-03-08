import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useSidebar } from '../context/SidebarContext';

export default function Layout() {
  const { isCollapsed } = useSidebar();
  const { i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Header */}
      <Header />
      
      {/* Main Container */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content Area */}
        <main 
          className={`
            flex-1 flex flex-col min-h-[calc(100vh-4rem)]
            transition-all duration-300 ease-in-out
            ${isRTL 
              ? (isCollapsed ? 'lg:mr-20' : 'lg:mr-64')
              : (isCollapsed ? 'lg:ml-20' : 'lg:ml-64')
            }
          `}
        >
          {/* Page Content */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
          
          {/* Footer */}
          <Footer />
        </main>
      </div>
    </div>
  );
}
