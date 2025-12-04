import React from "react";
import logo from "../../assets/Logo.svg";
import { BsPersonFill } from "react-icons/bs";
import { IoMdNotifications } from "react-icons/io";
import Right from "../../assets/Right.svg";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className=" bg-white shadow-md flex gap-5 items-center justify-between px-7 relative z-10 ">
      <img src={Right} alt="" className="absolute right-0 h-full z-[-1]" />
      <Link to="/" className="flex items-center space-x-3 w-96">
        <img src={logo} alt="Logo" className="h-full py-4" />
        <p className="text-[#3668B1] font-bold text-base ">
          SHRI JALARAM <br /> LABELS
        </p>
      </Link>
      <hr />
      <div className="flex items-center space-x-5 pr-14 xl:pr-24">
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
