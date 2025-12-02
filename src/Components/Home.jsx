import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="h-screen flex flex-col gap-3 justify-center items-center bg-gray-100">
      <h1 className="text-2xl">Home Page</h1>
      <Link to="/material">
        <button className="bg-[#3668B1] text-white py-3 px-6 rounded-md">
          {" "}
          Material In
        </button>
      </Link>
      <Link to="/jobcard">
        <button className="bg-[#3668B1] text-white py-3 px-6 rounded-md">
          {" "}
          Job Card
        </button>
      </Link>
       <Link to="/materialIssueRequestList">
        <button className="bg-[#3668B1] text-white py-3 px-6 rounded-md">
          {" "}
          Material Issue Request List
        </button>
      </Link>
    </div>
  );
};

export default Home;
