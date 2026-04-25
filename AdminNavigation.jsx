import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useGetCurrentUserQuery, useLogoutUserMutation } from '../../redux/features/auth/authApi';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../redux/features/auth/authSlice';
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  Settings,
  X,
  UserCog,
  ChevronRight,
  Archive,
  ArchiveRestore,
  Menu,
  Bell,
  FilePenLine
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import avatarImg from "../../assets/commenter.png";

const AdminNavigation = ({ onClose, isMobile }) => {
  const [logoutUser] = useLogoutUserMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [activeSection, setActiveSection] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { data: currentUser } = useGetCurrentUserQuery();

  // Detect active section based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path === '/dashboard') setActiveSection('overview');
    else if (path.includes('/manage-items')) setActiveSection('posts');
    else if (path.includes('/users')) setActiveSection('users');
    else if (path.includes('/archive') && !path.includes('/archived-articles')) setActiveSection('archive');
    else if (path.includes('/archived-articles')) setActiveSection('archived');
  }, [location.pathname]);

  const navItems = [
    {
      path: "/dashboard",
      label: "Overview",
      icon: <LayoutDashboard className="h-5 w-5" />,
      section: 'overview',
      end: true
    },
    {
      path: "/dashboard/manage-items",
      label: "Manage Posts",
      icon: <FileText className="h-5 w-5" />,
      section: 'posts'
    },
    {
      path: "/dashboard/users",
      label: "Users",
      icon: <Users className="h-5 w-5" />,
      section: 'users'
    },
    {
      path: "/dashboard/archive",
      label: "View Articles",
      icon: <Archive className="h-5 w-5" />,
      section: 'archive'
    },
    {
      path: "/dashboard/archived-articles",
      label: "Archived Articles",
      icon: <ArchiveRestore className="h-5 w-5" />,
      section: 'archived'
    },
    {
      path: "/dashboard/reports",
      label: "Reports",
      icon: <FilePenLine className="h-5 w-5" />,
      section: 'reports'
    },
  ];

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
      dispatch(logout());
      setToastMessage('Logged out successfully');
      setToastType('success');
      setShowToast(true);
      navigate('/login');
    } catch (error) {
      setToastMessage(error?.message || 'Failed to log out');
      setToastType('error');
      setShowToast(true);
    }
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  // Close logout confirmation if user clicks outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLogoutConfirm && !event.target.closest('#logout-confirm')) {
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLogoutConfirm]);

  return (
    <>
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <div className={`flex flex-col transition-all duration-300 h-full ${isCollapsed ? 'w-20' : 'w-full'} bg-white shadow-md rounded-r-lg`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100 text-blue-600">
              <UserCog className="h-6 w-6" />
            </div>
            {!isCollapsed && (
              <div>
                <h2 className="font-semibold text-gray-900">Admin Panel</h2>
                <p className="text-xs text-gray-500">Manage your platform</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isMobile && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
            )}

            {isMobile && onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2">
          <nav className={`px-3 py-2 ${isCollapsed ? 'px-2' : ''}`}>
            {!isCollapsed && (
              <div className="mb-2">
                <p className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Main
                </p>
              </div>
            )}
            <div className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-lg ${isCollapsed ? 'px-2 py-3' : 'px-3 py-2.5'} text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                    <div className={`${activeSection === item.section ? 'text-blue-600' : 'text-gray-500'}`}>
                      {item.icon}
                    </div>
                    {!isCollapsed && item.label}
                  </div>
                  {activeSection === item.section && !isCollapsed && (
                    <ChevronRight className="h-4 w-4 text-blue-600" />
                  )}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className={`p-4 border-t border-gray-200 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {!isCollapsed && (
            <div className="mb-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200 cursor-pointer">
                <div className="relative">
                  <img
                    src={user?.profileImg || currentUser?.profileImg || avatarImg}
                    alt={`${user?.username || 'Admin'}'s avatar`}
                    className="h-10 w-10 rounded-full object-cover border border-gray-200"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-gray-900 truncate">
                    {user?.username || 'Admin User'}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email || 'admin@example.com'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isCollapsed ? (
            <div className="mt-4">
              <div className="relative mb-4 flex justify-center">
                <div className="relative">
                  <img
                    src={user?.avatar || avatarImg}
                    alt={`${user?.username || 'Admin'}'s avatar`}
                    className="h-10 w-10 rounded-full object-cover border border-gray-200"
                    title={user?.username || 'Admin User'}
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 border-2 border-white rounded-full"></span>
                </div>
              </div>
              <button
                onClick={confirmLogout}
                className="p-2 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors duration-200"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={confirmLogout}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg transition-colors duration-200 font-medium text-sm"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>

              {/* Logout confirmation popup */}
              {showLogoutConfirm && (
                <div
                  id="logout-confirm"
                  className="absolute bottom-full left-0 right-0 mb-2 p-4 bg-white rounded-lg border border-gray-200 shadow-lg z-10"
                >
                  <p className="text-sm text-gray-700 mb-3">Are you sure you want to sign out?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleLogout}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200"
                    >
                      Yes, sign out
                    </button>
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminNavigation;
