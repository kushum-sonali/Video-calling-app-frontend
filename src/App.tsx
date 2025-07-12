import { useState } from "react";
import { Button } from "./components/ui/button";
// Import moon and sun SVGs
import { Moon } from 'lucide-react';
import { Sun } from 'lucide-react';
import {lazy,Suspense} from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const Signup = lazy(() => import('./components/Singup'));
const Signin = lazy(() => import('./components/Signin'));
const RoomSetup = lazy(() => import('./components/RoomSetup'));
// If VideoChat is a named export:
const VideoChatComponent = lazy(() =>
  import("./components/VideoChat").then(module => ({ default: module.VideoChat }))
);

// If VideoChat is the default export, use this instead:
// const VideoChatComponent = lazy(() => import("./components/VideoChat"));
import {Routes, Route} from 'react-router-dom';

// Protected Route Components
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useSelector((state: any) => state.user);
  
  // If no user, redirect to signin
  if (!user) {
    return <Navigate to="/signin" replace />;
  }
  
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useSelector((state: any) => state.user);
  
  // If user is already signed in, redirect to room setup
  if (user) {
    return <Navigate to="/room-setup" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const [theme, setTheme] = useState("light");
  const { user } = useSelector((state: any) => state.user);
  
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
      <Route path="/" element={
        user ? <Navigate to="/room-setup" replace /> : <Navigate to="/signup" replace />
      } />
      <Route path="/signup" element={
        <AuthRoute>
          <Signup />
        </AuthRoute>
      } />
      <Route path="/signin" element={
        <AuthRoute>
          <Signin />
        </AuthRoute>
      } />
      <Route path="/room-setup" element={
        <ProtectedRoute>
          <RoomSetup />
        </ProtectedRoute>
      } />
      <Route path="/video-chat/:roomId" element={
        <ProtectedRoute>
          <VideoChatComponent />
        </ProtectedRoute>
      } />
      {/* Catch all route - redirect to appropriate page */}
      <Route path="*" element={
        user ? <Navigate to="/room-setup" replace /> : <Navigate to="/signup" replace />
      } />
    </Routes>
    </Suspense>
    </div>
    </>
  );
}

export default App;
