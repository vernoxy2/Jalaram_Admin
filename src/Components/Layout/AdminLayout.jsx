import React from "react";
import Sidebar from "./SideBar";
import Header from "./Header";

const AdminLayout = ({ children }) => {
  return (
    <div className=" h-screen bg-[#FFFFFF]">
      <Header />

      <div className="flex flex-row h-full flex-1">
        <Sidebar />
        <main className="p-6 py-10 w-full">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
