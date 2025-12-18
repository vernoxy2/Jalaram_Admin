import React from "react";
import logo from "../../assets/Logo.svg";
import Right from "../../assets/Right.svg";
import { BsPersonFill } from "react-icons/bs";
import { IoMdNotifications } from "react-icons/io";
import { IoMenu } from "react-icons/io5";
import { Link, useNavigate } from "react-router-dom";

const Header = ({toggleMobileSidebar}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
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
          <p className="text-[#3668B1] font-bold  md:text-base leading-tight">
            SHRI JALARAM <br /> LABELS
          </p>
        </Link>
      </div>

      {/* Divider */}
      <hr className="hidden lg:block w-px" />

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 md:space-x-5 z-10">
        {/* Notifications */}
        <button
          aria-label="Notifications"
          className="bg-[#3668B1] rounded-full text-white w-10 md:w-12 h-10 md:h-12 flex items-center justify-center"
        >
          <IoMdNotifications className="md:text-2xl" />
        </button>

        {/* Profile / Logout */}
        <button
          onClick={handleLogout}
          aria-label="Logout"
          className="bg-[#3668B1] rounded-full text-white w-10 md:w-12 h-10 md:h-12 flex items-center justify-center"
        >
          <BsPersonFill className="md:text-2xl" />
        </button>
      </div>
    </header>
  );
};

export default Header;
