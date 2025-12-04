import React, { Children } from "react";
import { FaSquarePlus } from "react-icons/fa6";
import { Link } from "react-router-dom";

const Addbtn = ({ children, to, onClick }) => {
  return (
    <Link onClick={onClick} to={to} className=" flex gap-3 text-textcolor text-xl">
      <FaSquarePlus className="text-[#18B910] text-3xl" />
      {children}
    </Link>
  );
};

export default Addbtn;
