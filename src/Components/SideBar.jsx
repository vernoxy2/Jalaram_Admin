import { useState } from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleMobileSidebar = () => setMobileOpen(!mobileOpen);

  const menuItems = [
    { name: "Home", path: "/" },
    { name: "Add Material", path: "/add-material" },
    { name: "Users", path: "/users" },
    { name: "Settings", path: "/settings" },
  ];

  return (
    <div className="flex h-screen">
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex flex-col ${
          isOpen ? "w-64" : "w-20"
        } bg-[#2F3185] text-white transition-all duration-300`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {isOpen && <Link to={"/"}><h1 className="text-xl font-bold">Dashboard</h1></Link>}
          <button
            onClick={toggleSidebar}
            className="p-1 px-3 bg-white rounded-md hover:bg-white/80 text-black"
          >
            {isOpen ? "<" : ">"}
          </button>
        </div>

        <nav className="flex flex-col mt-4 gap-2 px-2">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className="flex items-center gap-3 p-2 hover:bg-white hover:text-black rounded-md"
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
          <Link to={"/"}><h1 className="text-xl font-bold">Dashboard</h1></Link>
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
              className="flex items-center gap-3 p-2 hover:bg-white hover:text-black rounded-md"
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

      {/* Main Content */}
      <div className="flex-1 bg-gray-100 p-6">
        {/* Mobile hamburger button */}
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden mb-4 p-2 bg-[#2F3185] text-white rounded-md"
        >
          ☰
        </button>

        <h1 className="text-2xl font-bold">Main Content Area</h1>
        <p>Add your content here.</p>
      </div>
    </div>
  );
};

export default Sidebar;
