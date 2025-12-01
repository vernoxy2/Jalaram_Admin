import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Right from "../../assets/Right.svg";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleMobileSidebar = () => setMobileOpen(!mobileOpen);

  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems = [
    { name: "Dashboard", path: "/" },
    { name: "Job Card", path: "/jobcard" },
    { name: "Material In", path: "/material_in" },
    { name: "Material Issue", path: "/material_issue" },
    { name: "Dispatch", path: "/dispatch" },
    { name: "Total Inventory", path: "/total_inventory" },
    { name: "Stock", path: "/stock" },
  ];

  return (
    <div className="flex flex-col h-full border border-black ">
      <img src={Right} alt="" className="absolute rotate-180 bottom-0"/>
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex flex-col h-full border border-black ${
          isOpen ? "w-[360px]" : "w-20"
        } bg-gradient-to-b from-[#102F5C] to-[#3566AD] text-white transition-all duration-300`}
      >
        <nav className="flex flex-col mt-16 gap-1 px-2 ms-10 me-6">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex text-xl font-bold items-center gap-3 px-6 py-3 rounded-md transition-colors duration-200 ${
                currentPath === item.path
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
        className={`fixed top-0 left-0 h-full bg-[#2F3185] text-white z-50 transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } w-64`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <Link to={"/"}>
            <h1 className="text-xl font-bold">Dashboard</h1>
          </Link>
          <button
            onClick={toggleMobileSidebar}
            className="p-1 px-3 bg-white rounded-md hover:bg-white/80 text-black"
          >
            X
          </button>
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
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleMobileSidebar}
        ></div>
      )}
    </div>
  );
};

export default Sidebar;
