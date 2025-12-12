import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginImg from "../assets/LoginImg.webp";
import Right from "../assets/Right.svg";
import Logow from "../assets/LogoW.svg";
import Logo from "../assets/Logo.svg";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ email: "", password: "" });

  // Redirect if already logged in
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn) navigate("/");
  }, [navigate]);

  // Validation function
  const validate = () => {
    let valid = true;
    let errs = { email: "", password: "" };

    if (!email) {
      errs.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = "Email is invalid";
      valid = false;
    }

    if (!password) {
      errs.password = "Password is required";
      valid = false;
    } else if (password.length < 6) {
      errs.password = "Password must be at least 6 characters";
      valid = false;
    }

    setErrors(errs);
    return valid;
  };

  // Handle login
  const handleLogin = (e) => {
    e.preventDefault();
    if (validate()) {
      localStorage.setItem("isLoggedIn", "true"); // Set login flag
      navigate("/"); // Redirect to dashboard
    }
  };

  return (
    <div className="min-h-lvh flex flex-col-reverse lg:flex-row w-full relative overflow-hidden">
      {/* Decorative Right Images */}
      <img src={Right} alt="" className="block absolute right-0 top-0 w-40" />
      <img
        src={Right}
        alt=""
        className="absolute rotate-180 bottom-0 left-0 w-40"
      />

      {/* Left Panel */}
      <div className="lg:w-5/12 w-full lg:bg-gradient-to-b from-[#102F5C] to-[#3566AD] flex justify-center items-start py-16 px-6">
        <div className="space-y-5 w-full max-w-sm text-center lg:text-left">
          <div className="flex flex-col items-center justify-center w-fit gap-3 ">
            <img src={Logow} alt="Logo" className="w-32 hidden lg:block" />
            <p className="text-[#3668B1] lg:text-white uppercase font-bold tracking-wide text-lg">
              Shri jalaram labels
            </p>
          </div>
          <h1 className="text-[#3668B1] lg:text-white font-medium text-3xl leading-snug pt-8">
            One Click to <br /> Your Dashboard.
          </h1>

          <form className="space-y-5 w-full" onSubmit={handleLogin}>
            <div>
              <input
                type="text"
                placeholder="Email ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent ring-2 lg:text-white lg:ring-white lg:placeholder:text-white shadow-md p-3 rounded-md w-full text-lg font-medium focus:outline-none"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent ring-2 lg:text-white lg:ring-white lg:placeholder:text-white shadow-md p-3 rounded-md w-full text-lg font-medium focus:outline-none"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              className="bg-[#3668B1] lg:bg-white text-white lg:text-[#3668B1] w-fit p-3 px-5 mr-auto rounded-md text-xl font-bold hover:bg-gray-100 transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>

      {/* Right Image Section */}
      <div className="flex justify-center items-center lg:p-10 flex-1">
        <img
          src={LoginImg}
          alt="Login"
          className="h-[50vh] lg:h-[70vh] lg:object-contain"
        />
      </div>
    </div>
  );
};

export default Login;
