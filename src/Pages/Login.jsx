import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase"; // Import your firebase config
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import LoginImg from "../assets/LoginImg.webp";
import Right from "../assets/Right.svg";
import Logow from "../assets/LogoW.svg";
import Logo from "../assets/Logo.svg";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const userRole = localStorage.getItem("userRole");
    
    // Only redirect if logged in AND role is Admin
    if (isLoggedIn && userRole === "Admin") {
      navigate("/");
    }
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

  // Handle login with Firebase
  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    if (loading) return; // Prevent double submission

    setLoading(true);
    setErrors({ email: "", password: "" });

    try {
      // Ensure any existing user is fully signed out before new login
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log(
          "⚠️ Existing user found, signing out before new login:",
          currentUser.uid
        );
        await signOut(auth);
      }

      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const uid = userCredential.user.uid;

      console.log("✅ Logged in successfully, UID:", uid);

      // Fetch user role from Firestore
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setErrors({
          email: "",
          password: "User profile not found. Please contact administrator.",
        });
        await signOut(auth); // Sign out if no user doc
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const role = userData.role;

      console.log("🔑 User role:", role);

      // ✅ Only allow Admin role for web portal
      if (role === "Admin") {
        // Store authentication state
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", role);
        localStorage.setItem("userId", uid);
        localStorage.setItem("userEmail", email.trim());

        // Redirect to dashboard
        navigate("/");
      } else {
        // Access denied for non-admin users
        setErrors({
          email: "",
          password: `Access Denied. This portal is only for Admin users. Your role: ${role}`,
        });
        await signOut(auth); // Sign out non-admin users
      }
    } catch (error) {
      console.error("❌ Login Error:", error);
      
      let errorMessage = "Login failed. Please enter valid credentials.";
         
      
      setErrors({ email: "", password: errorMessage });
    } finally {
      setLoading(false);
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
            Admin Portal <br /> Login
          </h1>

          <form className="space-y-5 w-full" onSubmit={handleLogin}>
            <div>
              <input
                type="text"
                placeholder="Email ID"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="bg-transparent ring-2 lg:text-white lg:ring-white lg:placeholder:text-white shadow-md p-3 rounded-md w-full text-lg font-medium focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {errors.email && (
                <p className="text-red-500 lg:text-red-200 text-sm mt-1 font-semibold">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="bg-transparent ring-2 lg:text-white lg:ring-white lg:placeholder:text-white shadow-md p-3 rounded-md w-full text-lg font-medium focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {errors.password && (
                <p className="text-red-500 lg:text-red-200 text-sm mt-1 font-semibold">
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-[#3668B1] lg:bg-white text-white lg:text-[#3668B1] w-fit p-3 px-5 mr-auto rounded-md text-xl font-bold hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >                   
                  </svg>
                  Logging in...
                </>
              ) : (
                "Login"
              )}
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