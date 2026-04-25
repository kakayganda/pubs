import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AdminNavigation from './AdminNavigation';
import { Menu } from 'lucide-react';

const AdminLayout = () => {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  // Close mobile nav when route changes
  useEffect(() => {
    setIsNavOpen(false);
  }, [location.pathname]);

  // Close mobile nav when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isNavOpen &&
          !event.target.closest('#mobile-nav') &&
          !event.target.closest('#menu-button')) {
        setIsNavOpen(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (isNavOpen && event.key === 'Escape') {
        setIsNavOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    // Lock body scroll when mobile nav is open
    if (isNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = '';
    };
  }, [isNavOpen]);

  // Redirect to login if not an admin
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation Header */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b bg-white shadow-sm">
        <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
        <button
          id="menu-button"
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          aria-label={isNavOpen ? "Close menu" : "Open menu"}
          aria-expanded={isNavOpen}
          aria-controls="mobile-nav"
        >
          <Menu className="h-6 w-6 text-gray-700" />
        </button>
      </header>

      {/* Mobile Navigation Overlay */}
      {isNavOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          aria-hidden="true"
          onClick={() => setIsNavOpen(false)}
        />
      )}

      {/* Mobile Navigation Drawer */}
      <div
        id="mobile-nav"
        className={`lg:hidden fixed top-0 left-0 w-72 h-full bg-white transform transition-transform duration-300 ease-in-out z-50 ${
          isNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isNavOpen}
        tabIndex={isNavOpen ? 0 : -1}
      >
        <AdminNavigation onClose={() => setIsNavOpen(false)} />
      </div>

      <div className="container mx-auto px-4 py-6 lg:px-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Desktop Navigation */}
          <aside className="hidden lg:block sticky top-8 h-[calc(100vh-4rem)] w-72 flex-shrink-0">
            <div className="h-full overflow-hidden rounded-xl border bg-white shadow-sm">
              <AdminNavigation />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="rounded-xl border bg-white shadow-sm">
              <div className="p-6">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
