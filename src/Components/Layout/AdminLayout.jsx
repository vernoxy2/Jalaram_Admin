import React from "react";
import Sidebar from "./SideBar"; // make sure the filename matches exactly
import Header from "./Header";
import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggleMobileSidebar = () => setMobileOpen(!mobileOpen);

  return (
    <div className="h-screen w-screen flex flex-col overflow-x-hidden">
      {/* Header */}
      <Header toggleMobileSidebar={toggleMobileSidebar} />

      <div className="flex flex-1 w-full">
        {/* Sidebar */}
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        <main className="px-6 py-6 md:py-10 pr-6 w-full container">
          <Outlet /> {/* renders nested route components */}
          <p className="text-center py-5 md:py-2 text-gray-300 text-sm">Developed by Vernoxy </p>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
