import React, { useState } from 'react'
import { auth, provider } from "../../firebaseConfiguration/config"
import {signInWithPopup} from "firebase/auth"
import { useDispatch, useSelector } from 'react-redux';
import { addUser } from "../../store/UserSlice"
import { useNavigate } from 'react-router-dom';
import { ClipLoader } from "react-spinners";

interface User{
 fullName:string,
      email:string,
      firebaseId:string,
      isGoogleSignin: boolean
}

function Singup() {
    const [userName,setUserName]=useState<string>("");
    const [email,setEmail]=useState<string>("");
    const [password,setPassword]=useState<string>("");
    const [error,setError]=useState<string>("");
    const [loading,setLoading]=useState<boolean>(false);

    const navigate= useNavigate();
    const dispatch = useDispatch();
    const user = useSelector((state:any) => state.user.user);



    // console.log("user from redux",user);
  const googleSignIn =async () => {
   const user= await signInWithPopup(auth, provider)
      setLoading(true);
     
      const userToSave = {
        userName: user.user.displayName,
        email: user.user.email,
        uid: user.user.uid,
      } 

      googleSubmit(userToSave);
    } 
   
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  try{
  e.preventDefault();
  setLoading(true);
  if (!userName || !email || !password ) {
    setError("Please fill all the fields");
    setLoading(false);
    return;
  }
  const result= await fetch("http://localhost:3000/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userName,
      email,
      password,
    }),
  });  
  const data = await result.json();

  console.log("data",data )
    // Assuming the response contains user data
    const userToSave = {
      userName: data.user.userName,
    email: data.user.email,   
    uid: data.user.uid, // Assuming UID is returned from the server
    isGoogleSignin: false // Assuming this is a regular signup
    }
    dispatch(addUser(userToSave));
    navigate("/video-chat");
  if (!data.success) {
    setError(data.message || "Signup failed. Please try again.");
    setLoading(false);
    return;
    
  }

  
  // You can add your signup logic here (e.g., Firebase signup)
  setError("");
  setLoading(false);
}
catch (error) {
  console.error("Error during signup:", error);
  setError("An error occurred during signup. Please try again.");
  setLoading(false);
}
}
const googleSubmit = async (user: { userName: string | null, email: string | null, uid: string }) => {
  try{
  const result = await fetch("http://localhost:3000/firebaseuser", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userName: user.userName,
      email: user.email,
      fireBaseId: user.uid
    }),
  });
  const data = await result.json();
  console.log("data",data)
  console.log( "data from server", data.user.userName, data.user.email, data.user.uid);
  const userToSave=(   {
   userName: data.user.userName,
    email: data.user.email, 
    uid: data.user.uid,
    // Assuming UID is returned from the server
    isGoogleSignin: true
})
      dispatch(addUser(userToSave));
    navigate("/video-chat");
  }

catch (error) {
  console.error("Error during Google signup:", error);
  setError("An error occurred during Google signup. Please try again.");
  setLoading(false);
}
}

  return (
    <>
    
    <div className="flex flex-col items-center justify-center ">
      <h1 className="text-3xl font-bold mb-4">Sign Up</h1>
      
      <form className="bg-white p-6 rounded shadow-md w-96 shadow-black-700" onSubmit={handleSubmit} id='form' name='form'>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {loading && <ClipLoader color="#000" loading={loading} size={30} />}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={userName}
            onChange={(e)=>setUserName(e.target.value)}
            name='username'
            placeholder="Enter your username"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email
          </label>
          <input
            type="email"
            id="email"
            name='username'
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            placeholder="Enter your email"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            type="password"
            id="password"
            name='password'
            value={password}    
            onChange={(e)=>setPassword(e.target.value)}
            placeholder="Enter your password"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className=" flex flex-row mb-4 bg-blue-500 gap-2 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full">
        <button
          type="submit"
          disabled={loading}
          
          className=" text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full hover:bg-blue-700 border-[2px]  border-solid border-white"
        >
          Sign Up
        </button>
         <button
          type="submit"
          disabled={loading}  
          onClick={googleSignIn}
          className="font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full border-[2px]  border-solid border-white hover:bg-blue-700"
        >Goggle Sing In</button>
        </div>
   
      {/* {user && ( 

        <div className="bg-white p-6 rounded shadow-md w-96 shadow-black-700">
          <h2 className="text-xl font-bold mb-4">Welcome, {user.userName}!</h2>
          <p className="text-gray-700 mb-4">Email: {user.email}</p>
          <p className="text-gray-700 mb-4">UID: {user.uid}</p>
          </div>
           )} */}
      </form>
    </div>
    </>
  );
}
export default Singup;