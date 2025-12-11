import React from "react";
import Sidebar from "./SideBar"; // ensure filename matches
import Header from "./Header";
import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <div className="h-screen w-screen flex flex-col overflow-auto">
      <Header />
      <div className="flex flex-1 w-full">
        <Sidebar />
        <main className="px-6 py-10 pr-6 w-full container  ">
          <Outlet /> {/* This renders nested route components */}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
