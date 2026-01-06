import React, { useState, useEffect, useRef } from "react";
import Right from "../../assets/Right.svg";
import { BsPersonFill } from "react-icons/bs";
import { IoMdNotifications } from "react-icons/io";
import { IoMenu } from "react-icons/io5";
import { BiLogOut, BiUser, BiKey } from "react-icons/bi";
import { Link, useNavigate } from "react-router-dom";
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import logo from "../../assets/Logo.svg";

const Header = ({ toggleMobileSidebar }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);

  // Get user email from localStorage (initialize state directly)
  const [userEmail] = useState(() => localStorage.getItem("userEmail") || "User");

  useEffect(() => {
    // Listen to all material requests in real-time
    const q = query(
      collection(db, "materialRequest"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allNotifications = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        allNotifications.push({
          id: doc.id,
          ...data,
        });
      });
      
      // Filter only unread notifications (where notificationRead is not true)
      const unreadNotifications = allNotifications.filter(
        notification => notification.notificationRead !== true
      );
      
      setNotifications(unreadNotifications);
      setUnreadCount(unreadNotifications.length);
    });

    return () => unsubscribe();
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    navigate("/login");
  };

  const handleNotificationClick = async (notificationId) => {
    try {
      // Mark notification as read in Firebase
      const notificationDocRef = doc(db, "materialRequest", notificationId);
      await updateDoc(notificationDocRef, {
        notificationRead: true
      });

      // Close dropdown and navigate
      setShowNotifications(false);
      navigate("/issue_material", { state: { highlightId: notificationId } });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Still navigate even if update fails
      setShowNotifications(false);
      navigate("/issue_material", { state: { highlightId: notificationId } });
    }
  };

  return (
    <header className="bg-white shadow flex items-center justify-between px-4 md:pr-16 relative z-10 py-2">
      {/* Background Image */}
      <img
        src={Right}
        alt=""
        className="absolute right-0 top-0 h-12 md:h-24 w-auto z-0"
        aria-hidden="true"
      />

      {/* Mobile Menu Icon */}
      <div className="flex items-center gap-2">
        <IoMenu
          className="text-4xl md:hidden text-primary z-10"
          aria-label="Menu"
          onClick={toggleMobileSidebar}
        />
             {/* Logo and Brand */}
        <Link to="/" className="flex items-center space-x-2 max-w-full z-10">
          <img
            src={logo}
            alt="Shri Jalaram Labels Logo"
            className="h-16 md:h-20 py-2"
          />
          <p className="text-[#3668B1] font-bold md:text-base leading-tight">
            SHRI JALARAM <br /> LABELS
          </p>
        </Link>
      </div>

      {/* Divider */}
      <hr className="hidden lg:block w-px" />

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 md:space-x-5 z-10">
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            aria-label="Notifications"
            className="bg-[#3668B1] rounded-full text-white w-10 md:w-12 h-10 md:h-12 flex items-center justify-center relative hover:bg-[#2a5492] transition-colors"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <IoMdNotifications className="md:text-2xl" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-bold text-lg text-gray-800">Material Requests</h3>
              </div>
              
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No new requests
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification.id)}
                      className="w-full p-4 hover:bg-blue-50 transition-colors text-left border-l-4 border-transparent hover:border-blue-500"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            {notification.jobName || "New Request"}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Job Card: {notification.jobCardNo}
                          </p>
                          <p className="text-sm text-gray-600">
                            Required: {notification.requiredMaterial} meter
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            By {notification.createdBy} •{" "}
                            {notification.createdAt
                              ? new Date(notification.createdAt.seconds * 1000).toLocaleDateString()
                              : ""}
                          </p>
                        </div>
                        <span className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 animate-pulse"></span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User Menu"
            className="bg-[#3668B1] rounded-full text-white w-10 md:w-12 h-10 md:h-12 flex items-center justify-center hover:bg-[#2a5492] transition-colors"
          >
            <BsPersonFill className="md:text-2xl" />
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-66 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
              {/* User Info Section */}
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm text-gray-500">Signed in as</p>
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {userEmail}
                </p>
              </div>
           
              {/* Logout Section */}
              <div className="border-t border-gray-200 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                >
                  <BiLogOut className="text-lg" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;