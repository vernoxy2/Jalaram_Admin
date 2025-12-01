import React from "react";
import logo from "../../assets/Logo.svg";
import { BsPersonFill } from "react-icons/bs";
import { IoMdNotifications } from "react-icons/io";
import Right from "../../assets/Right.svg";

const Header = () => {
  return (
    <header className=" bg-white shadow-md flex items-center justify-between px-7 relative ">
      <img src={Right} alt="" className="absolute right-0 h-full" />
      <div className="flex items-center space-x-3">
        <img src={logo} alt="Logo" className="h-full py-4" />
      <p className="text-[#3668B1] font-bold text-base">SHRI JALARAM <br /> LABELS</p>
      </div>
      <div className="flex items-center space-x-5 pr-24">
        <button className="bg-[#3668B1] rounded-full text-white w-12 h-12 flex items-center justify-center">
          <IoMdNotifications className="text-2xl" />
        </button>
        <button className="bg-[#3668B1] rounded-full text-white w-12 h-12 flex items-center justify-center">
          <BsPersonFill className="text-2xl" />
        </button>
      </div>
    </header>
  );
};

export default Header;
