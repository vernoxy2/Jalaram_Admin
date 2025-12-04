import React from "react";

const PrimaryBtn = ({ children, className, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-t from-[#102F5C] to-[#3566AD] text-white font-bold text-base md:text-lg lg:text-xl rounded-xl p-3  ${className}`}
    >
      {children}
    </button>
  );
};

export default PrimaryBtn;
