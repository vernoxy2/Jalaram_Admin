import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Right from "../../assets/Right.svg";
import { FaCaretLeft, FaCaretRight } from "react-icons/fa6";
import { HiOutlineMenuAlt1 } from "react-icons/hi";
import { IoClose, IoMenu } from "react-icons/io5";

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const [isOpen, setIsOpen] = useState(true);
  // const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleMobileSidebar = () => setMobileOpen(!mobileOpen);

  const location = useLocation();
  const currentPath = "/" + location.pathname.split("/")[1];

  const menuItems = [
    { name: "Dashboard", path: "/" },
    { name: "Job Card", path: "/jobcard" },
    { name: "Material In", path: "/material_in" },
    { name: "Material Issue", path: "/issue_material" },
    { name: "Dispatch", path: "/dispatch" },
    { name: "Total Inventory", path: "/total_inventory" },
    { name: "Stock", path: "/stock" },
  ];

  return (
    <div className="flex relative">
      <img src={Right} alt="" className="absolute rotate-180 bottom-0" />

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex flex-col h-full  ${
          isOpen ? "w-96" : "w-16 "
        } bg-gradient-to-b from-[#102F5C] to-[#3566AD] text-white transition-all duration-300 `}
      >
        <div className="flex items-center justify-between p-4 border-gray-700">
          {isOpen && (
            <Link to={"/"}>
              <h1 className="text-white  delay-100">Shree Jalaram </h1>
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className=" p-1.5 bg-white rounded-lg hover:bg-white/80 text-black"
          >
            {isOpen ? (
              <FaCaretLeft className="text-2xl text-primary" />
            ) : (
              <IoMenu className="text-2xl text-primary" />
            )}
          </button>
        </div>
        <nav className="flex flex-col mt-10 gap-1 px-2 ml-10 mr-6">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex text-xl font-bold items-center gap-3 px-6 py-3 rounded-md transition-colors duration-200 ${
                isOpen && currentPath === item.path
                  ? "bg-white text-[#3668B1]"
                  : "hover:bg-white hover:text-[#3668B1]"
              }`}
            >
              {isOpen && item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-[#102F5C] to-[#3566AD] text-white pl-8 z-50 transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } w-80`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <Link to={"/"}>
            <h1 className="text-white  delay-100">Shree Jalaram </h1>
          </Link>

          <IoClose onClick={() => setMobileOpen(false)} className="text-2xl"/>
        </div>
        <nav className="flex flex-col mt-4 gap-2 px-2">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 p-2 rounded-md transition-colors duration-200 ${
                currentPath === item.path
                  ? "bg-white text-black"
                  : "hover:bg-white hover:text-black"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Overlay for Mobile */}
      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Sidebar;
