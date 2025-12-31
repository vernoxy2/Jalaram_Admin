import React from "react";
import Sidebar from "./SideBar";
import Header from "./Header";
import { Outlet } from "react-router-dom";
import Footer from "./Footer";

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

        {/* Main Content */}
        <main className="flex flex-col px-6 py-6 md:pt-10 w-full container">
          {/* Page Content - takes up all available space */}
          <div className="flex-1">
            <Outlet />
          </div>

          {/* Footer - always at bottom */}
          <Footer className="mt-auto" />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
