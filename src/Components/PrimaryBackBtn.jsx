import React from "react";
import { Link } from "react-router-dom";

const PrimaryBackBtn = ({ children, className, onClick, to }) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`bg-gradient-to-t from-[#102F5C] to-[#3566AD] text-white font-bold text-base md:text-lg lg:text-xl rounded-xl p-3  ${className}`}
    >
      {children}
    </Link>
  );
};

export default PrimaryBackBtn;
