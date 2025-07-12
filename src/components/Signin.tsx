import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles, Video, MessageSquare, Hand, Shield, Smartphone, Settings, Play, Users, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../../firebaseConfiguration/config';
import { addUser } from '../../store/UserSlice';
import envConfig from '@/config';

const Signin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  };

  const slideInLeftVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  const slideInRightVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const buttonVariants = {
    hover: { 
      scale: 1.02, 
      transition: { duration: 0.2 } 
    },
    tap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  const floatingElementVariants = {
    animate: {
      y: [-10, 10, -10],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await fetch(`${envConfig.backendUrl}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await result.json();

      if (!data.success) {
        setError(data.message || 'Signin failed');
        setLoading(false);
        return;
      }

      const userToSave = {
        userName: data.user.userName,
        email: data.user.email,
        uid: data.user.uid,
        isGoogleSignin: false
      };

      dispatch(addUser(userToSave));
      navigate('/room-setup');
    } catch (error) {
      console.error('Signin error:', error);
      setError('An error occurred during signin');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignin = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const response = await fetch(`${envConfig.backendUrl}/firebaseuser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: user.displayName,
          email: user.email,
          fireBaseId: user.uid
        }),
      });

      const data = await response.json();

      const userToSave = {
        userName: data.user.userName,
        email: data.user.email,
        uid: data.user.uid,
        isGoogleSignin: true
      };

      dispatch(addUser(userToSave));
      navigate('/room-setup');
    } catch (error) {
      console.error('Google signin error:', error);
      setError('Google signin failed');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Video, title: 'HD Video Quality', description: 'Crystal-clear video calls' },
    { icon: MessageSquare, title: 'Real-time Chat', description: 'Instant messaging during calls' },
    { icon: Hand, title: 'Hand Raise Feature', description: 'Interactive participation' },
    { icon: Shield, title: 'Secure Connections', description: 'End-to-end encryption' },
    { icon: Smartphone, title: 'Cross-platform Support', description: 'Works on all devices' },
    { icon: Settings, title: 'Audio/Video Controls', description: 'Full media management' }
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Floating background elements */}
      <motion.div
        className="absolute top-10 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20"
        variants={floatingElementVariants}
        animate="animate"
      />
      <motion.div
        className="absolute top-1/4 right-20 w-16 h-16 bg-purple-200 rounded-full opacity-20"
        variants={floatingElementVariants}
        animate="animate"
        style={{ animationDelay: "1s" }}
      />
      <motion.div
        className="absolute bottom-20 left-1/4 w-24 h-24 bg-indigo-200 rounded-full opacity-20"
        variants={floatingElementVariants}
        animate="animate"
        style={{ animationDelay: "2s" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-32 h-32 bg-pink-200 rounded-full opacity-10"
        variants={floatingElementVariants}
        animate="animate"
        style={{ animationDelay: "3s" }}
      />

      <motion.div
        className="flex min-h-screen w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left Hero Section */}
        <motion.div
          className="flex-1 min-w-0 flex flex-col justify-center px-6 md:px-12 lg:px-16 xl:px-20 py-12"
          variants={slideInLeftVariants}
        >
          <div className="max-w-3xl w-full">
            {/* Brand Logo */}
            <motion.div
              className="flex items-center mb-8"
              variants={itemVariants}
            >
              <motion.div
                className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.8 }}
              >
                <Video className="w-6 h-6 text-white" />
              </motion.div>
              <span className="text-2xl font-bold text-gray-800">VideoCall</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight"
              variants={itemVariants}
            >
              Connect Face-to-Face,
              <motion.span
                className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600"
                animate={{ 
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] 
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {' '}Anywhere
              </motion.span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed"
              variants={itemVariants}
            >
              Experience crystal-clear video calls with advanced features. 
              Connect with friends, family, and colleagues from anywhere in the world.
            </motion.p>

            {/* Features Grid */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
              variants={itemVariants}
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className="flex items-start space-x-3 p-4 rounded-lg bg-white/50 backdrop-blur-sm"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center"
                    whileHover={{ rotate: 5 }}
                  >
                    <feature.icon className="w-5 h-5 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Call to Action */}
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0"
              variants={itemVariants}
            >
              <motion.div
                className="flex items-center space-x-2 text-sm text-gray-600"
                whileHover={{ scale: 1.05 }}
              >
                <Globe className="w-4 h-4" />
                <span>Join 10,000+ users worldwide</span>
              </motion.div>
              <motion.div
                className="flex items-center space-x-2 text-sm text-gray-600"
                whileHover={{ scale: 1.05 }}
              >
                <Users className="w-4 h-4" />
                <span>Start your first call in seconds</span>
              </motion.div>
            </motion.div>

            {/* Demo Button */}
            <motion.div
              className="mt-8"
              variants={itemVariants}
            >
              <motion.button
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Play className="w-5 h-5" />
                <span>Watch Demo</span>
              </motion.button>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Signin Form */}
        <motion.div
          className="w-full max-w-md lg:max-w-lg xl:max-w-xl flex items-center justify-center px-6 md:px-8 lg:px-12 py-12"
          variants={slideInRightVariants}
        >
          <div className="w-full max-w-md">
            {/* Form Header */}
            <motion.div
              className="text-center mb-8"
              variants={itemVariants}
            >
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.8 }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to continue your video calling experience</p>
            </motion.div>

            {/* Signin Form */}
            <motion.div
              className="bg-white rounded-2xl shadow-xl p-6 backdrop-blur-sm"
              variants={itemVariants}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 border border-red-200 rounded-lg p-3"
                  >
                    <p className="text-red-600 text-sm">{error}</p>
                  </motion.div>
                )}

                {/* Email field */}
                <motion.div variants={itemVariants}>
                  <Label htmlFor="email" className="text-gray-700 mb-2 block">
                    Email Address
                  </Label>
                  <motion.div
                    className="relative"
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 border-2 border-gray-200 focus:border-blue-500 transition-colors"
                      placeholder="Enter your email"
                      disabled={loading}
                    />
                  </motion.div>
                </motion.div>

                {/* Password field */}
                <motion.div variants={itemVariants}>
                  <Label htmlFor="password" className="text-gray-700 mb-2 block">
                    Password
                  </Label>
                  <motion.div
                    className="relative"
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-11 border-2 border-gray-200 focus:border-blue-500 transition-colors"
                      placeholder="Enter your password"
                      disabled={loading}
                    />
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </motion.button>
                  </motion.div>
                </motion.div>

                {/* Sign in button */}
                <motion.div variants={itemVariants}>
                  <motion.div
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all duration-200 group"
                    >
                      {loading ? (
                        <motion.div
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>

                {/* Divider */}
                <motion.div
                  className="relative my-5"
                  variants={itemVariants}
                >
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </motion.div>

                {/* Google sign in button */}
                <motion.div variants={itemVariants}>
                  <motion.div
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Button
                      type="button"
                      onClick={handleGoogleSignin}
                      disabled={loading}
                      className="w-full h-11 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-medium rounded-lg transition-all duration-200 group"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </Button>
                  </motion.div>
                </motion.div>
              </form>

              {/* Sign up link */}
              <motion.div
                className="text-center mt-5"
                variants={itemVariants}
              >
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <motion.button
                    onClick={() => navigate('/signup')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign up
                  </motion.button>
                </p>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Signin; 