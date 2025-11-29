import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Building2, LayoutDashboard, PlusCircle, Home, FileText } from 'lucide-react';

export const Layout: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50';
  };

  // Check if we are inside a specific project dashboard to show project-specific links
  const isProjectView = location.pathname.includes('/dashboard/') || location.pathname.includes('/drawings/');
  const currentProjectId = location.pathname.split('/')[2]; // Simple extraction

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-gray-900">BuildMaster</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
               <Link 
                to="/" 
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/')}`}
              >
                <Home className="h-4 w-4" />
                Home
              </Link>
              
              {isProjectView && currentProjectId && (
                <Link 
                  to={`/drawings/${currentProjectId}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(`/drawings/${currentProjectId}`)}`}
                >
                  <FileText className="h-4 w-4" />
                  Drawings
                </Link>
              )}

              <Link 
                to="/setup" 
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/setup')}`}
              >
                <PlusCircle className="h-4 w-4" />
                New Project
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} BuildMaster MVP. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};