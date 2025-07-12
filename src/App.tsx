import { useState } from "react";
import { Button } from "./components/ui/button";
// Import moon and sun SVGs
import { Moon } from 'lucide-react';
import { Sun } from 'lucide-react';
import {lazy,Suspense} from 'react';
const Signup = lazy(() => import('./components/Singup'));
const Signin = lazy(() => import('./components/Signin'));
// If VideoChat is a named export:
const VideoChatComponent = lazy(() =>
  import("./components/VideoChat").then(module => ({ default: module.VideoChat }))
);

// If VideoChat is the default export, use this instead:
// const VideoChatComponent = lazy(() => import("./components/VideoChat"));
import {Routes, Route} from 'react-router-dom';

function App() {
  const [theme, setTheme] = useState("light");
  const handleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };
  const themeStyles = theme === "light"
    ? { backgroundColor: "white", color: "black" }
    : { backgroundColor: "black", color: "white" };

  return (
    <>
      <Button
        onClick={handleTheme}
        className=" flex top-5 right-5 absolute p-3 h-10 w-20 rounded-full bg-primary-0 bg-amber-400 hover:bg-primary-0"
      >
        {theme === "dark" ? <Moon width={35} height={35}  /> : <Sun width={35} height={35}   />}
      </Button>
    <div style={themeStyles} className="min-h-screen flex flex-col items-center justify-center">
      <Suspense fallback={<div>Loading.....</div>}>
    <Routes>
      <Route path="/" element={<Signup />} />
      <Route path="/signin" element={<Signin />} />
      <Route path="/video-chat" element={<VideoChatComponent />} />
    </Routes>
    </Suspense>
    </div>
    </>
  );
}

export default App;
