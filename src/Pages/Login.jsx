import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const userRole = localStorage.getItem("userRole");
    
    if (isLoggedIn && userRole === "Admin") {
      navigate("/");
    }
  }, [navigate]);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    if (loading) return;

    setLoading(true);
    setErrors({ email: "", password: "" });

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log("⚠️ Existing user found, signing out before new login:", currentUser.uid);
        await signOut(auth);
      }

      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;

      console.log("✅ Logged in successfully, UID:", uid);

      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setErrors({
          email: "",
          password: "User profile not found. Please contact administrator.",
        });
        await signOut(auth);
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const role = userData.role;

      console.log("🔑 User role:", role);

      if (role === "Admin") {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", role);
        localStorage.setItem("userId", uid);
        localStorage.setItem("userEmail", email.trim());

        navigate("/");
      } else {
        setErrors({
          email: "",
          password: `Access Denied. This portal is only for Admin users. Your role: ${role}`,
        });
        await signOut(auth);
      }
    } catch (error) {
      console.error("❌ Login Error:", error);
      let errorMessage = "Login failed. Please enter valid credentials.";
      setErrors({ email: "", password: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!resetEmail) {
      setResetError("Please enter your email address");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      setResetError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setResetError("");
    setResetMessage("");

    try {
      // ✅ First, check if email exists in Firestore users collection
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", resetEmail.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Email not found in database
        setResetError("Invalid email ID. This email is not registered in our system.");
        setLoading(false);
        return;
      }

      // ✅ Email exists, now send password reset email
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetMessage("Password reset email sent! Check your inbox and spam folder.");
      setResetEmail("");
      
      // Auto close after 3 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetMessage("");
      }, 3000);
    } catch (error) {
      console.error("❌ Password Reset Error:", error);
      
      if (error.code === "auth/user-not-found") {
        setResetError("Invalid email ID. This email is not registered.");
      } else if (error.code === "auth/invalid-email") {
        setResetError("Invalid email address format");
      } else if (error.code === "auth/too-many-requests") {
        setResetError("Too many requests. Please try again later.");
      } else {
        setResetError("Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-lvh flex flex-col-reverse lg:flex-row w-full relative overflow-hidden">
        <img src={Right} alt="" className="block absolute right-0 top-0 w-40" />
        <img src={Right} alt="" className="absolute rotate-180 bottom-0 left-0 w-40" />

        <div className="lg:w-5/12 w-full lg:bg-gradient-to-b from-[#102F5C] to-[#3566AD] flex justify-center items-start py-16 px-6">
          <div className="space-y-5 w-full max-w-sm text-center lg:text-left">
            <div className="flex flex-col items-center justify-center w-fit gap-3">
              {/* <img src={Logow} alt="Logo" className="w-32 hidden lg:block" />
              <p className="text-[#3668B1] lg:text-white uppercase font-bold tracking-wide text-lg">
                Shri jalaram labels
              </p> */}
            </div>
            
            <h1 className="text-[#3668B1] lg:text-white font-medium text-3xl leading-snug pt-8">
              Reset Password
            </h1>
            
            <p className="text-[#3668B1] lg:text-white text-sm">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <div className="space-y-5 w-full">
              <div>
                <input
                  type="email"
                  placeholder="Email ID"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={loading}
                  className="bg-transparent ring-2 lg:text-white lg:ring-white lg:placeholder:text-white shadow-md p-3 rounded-md w-full text-lg font-medium focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {resetError && (
                  <p className="text-red-500 lg:text-red-200 text-sm mt-1 font-semibold">
                    {resetError}
                  </p>
                )}
                {resetMessage && (
                  <p className="text-green-500 lg:text-green-200 text-sm mt-1 font-semibold">
                    {resetMessage}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="bg-[#3668B1] lg:bg-white text-white lg:text-[#3668B1] w-fit p-3 px-5 rounded-md text-xl font-bold hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail("");
                    setResetError("");
                    setResetMessage("");
                  }}
                  disabled={loading}
                  className="bg-transparent ring-2 ring-[#3668B1] lg:ring-white text-[#3668B1] lg:text-white w-fit p-3 px-5 rounded-md text-xl font-bold hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center lg:p-10 flex-1">
          <img src={LoginImg} alt="Login" className="h-[50vh] lg:h-[70vh] lg:object-contain" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-lvh flex flex-col-reverse lg:flex-row w-full relative overflow-hidden">
      <img src={Right} alt="" className="block absolute right-0 top-0 w-40" />
      <img src={Right} alt="" className="absolute rotate-180 bottom-0 left-0 w-40" />

      <div className="lg:w-5/12 w-full lg:bg-gradient-to-b from-[#102F5C] to-[#3566AD] flex justify-center items-start py-16 px-6">
        <div className="space-y-5 w-full max-w-sm text-center lg:text-left">
          <div className="flex flex-col items-center justify-center w-fit gap-3">
            {/* <img src={Logow} alt="Logo" className="w-32 hidden lg:block" />
            <p className="text-[#3668B1] lg:text-white uppercase font-bold tracking-wide text-lg">
              Shri jalaram labels
            </p> */}
          </div>
          
          <h1 className="text-[#3668B1] lg:text-white font-medium text-3xl leading-snug pt-8">
            Admin Portal <br /> Login
          </h1>

          <div className="space-y-5 w-full">
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

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="bg-[#3668B1] lg:bg-white text-white lg:text-[#3668B1] w-fit p-3 px-5 rounded-md text-xl font-bold hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
              
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-[#3668B1] lg:text-white text-sm font-semibold hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center lg:p-10 flex-1">
        <img src={LoginImg} alt="Login" className="h-[50vh] lg:h-[70vh] lg:object-contain" />
      </div>
    </div>
  );
};

export default Login;