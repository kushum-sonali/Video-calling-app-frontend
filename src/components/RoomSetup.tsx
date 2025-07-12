import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Users, 
  Plus, 
  ArrowRight, 
  Settings, 
  Shield, 
  Globe,
  Hash,
  User,
  Camera,
  Headphones,
  Eye,
  EyeOff,
  Sparkles,
  Play,
  AlertCircle,
  CheckCircle,
  Loader2,
  Monitor,
  Volume2,
  X,
  ChevronDown
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';


interface RoomSetupProps {
  onJoinRoom?: (roomId: string, name: string, settings: MediaSettings) => void;
  onCreateRoom?: (name: string, settings: MediaSettings) => void;
}

interface MediaSettings {
  video: boolean;
  audio: boolean;
  videoQuality: 'low' | 'medium' | 'high';
  audioQuality: 'low' | 'medium' | 'high';
}

export const RoomSetup: React.FC<RoomSetupProps> = ({ onJoinRoom, onCreateRoom }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const [settings, setSettings] = useState<MediaSettings>({
    video: true,
    audio: true,
    videoQuality: 'medium',
    audioQuality: 'medium'
  });
  const [showPreview, setShowPreview] = useState(false);
  const [mediaPermissions, setMediaPermissions] = useState({
    camera: false,
    microphone: false,
    error: ''
  });
  const [isValidatingRoom, setIsValidatingRoom] = useState(false);
  const [roomValidation, setRoomValidation] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }>({
    cameras: [],
    microphones: [],
    speakers: []
  });
  const [selectedDevices, setSelectedDevices] = useState<{
    camera: string;
    microphone: string;
    speaker: string;
  }>({
    camera: '',
    microphone: '',
    speaker: ''
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const { user } = useSelector((state: any) => state.user);

  // Set default name from user if available
  useEffect(() => {
    if (user?.userName && !name) {
      setName(user.userName);
    }
  }, [user, name]);

  // Automatically request media permissions when component mounts
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        localStreamRef.current = stream;
        setShowPreview(true);
        
        // Ensure video element is ready before setting source
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(console.error);
        }
        
        setMediaPermissions({
          camera: true,
          microphone: true,
          error: ''
        });
        
        // IMPORTANT: Get available devices AFTER stream is active
        // This ensures device labels are available
        setTimeout(async () => {
          await getAvailableDevices();
          console.log('Media and devices initialized successfully');
        }, 1000);
        
      } catch (error) {
        console.error('Media initialization error:', error);
        setMediaPermissions({
          camera: false,
          microphone: false,
          error: 'Please allow camera and microphone access to continue'
        });
      }
    };

    initializeMedia();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.1
      }
    }
  };

  const slideInVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.6 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const floatingElementVariants = {
    animate: {
      y: [-10, 10, -10],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 4,
        repeat: Infinity
      }
    }
  };

  // Get available media devices
  const getAvailableDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');
      const speakers = devices.filter(device => device.kind === 'audiooutput');
      
      console.log(`Found ${cameras.length} cameras, ${microphones.length} microphones, ${speakers.length} speakers`);
      
      setAvailableDevices({ cameras, microphones, speakers });
      
      // Set default devices
      if (cameras.length > 0) {
        setSelectedDevices(prev => ({ ...prev, camera: cameras[0].deviceId }));
      }
      if (microphones.length > 0) {
        setSelectedDevices(prev => ({ ...prev, microphone: microphones[0].deviceId }));
      }
      if (speakers.length > 0) {
        setSelectedDevices(prev => ({ ...prev, speaker: speakers[0].deviceId }));
      }
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  };

  // Request media permissions
  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      setShowPreview(true);
      
      // Set the video stream immediately
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      setMediaPermissions({
        camera: true,
        microphone: true,
        error: ''
      });
      
      // Get available devices after permissions are granted
      await getAvailableDevices();
      
      console.log('Media permissions granted, stream:', stream);
    } catch (error) {
      console.error('Media permission error:', error);
      setMediaPermissions({
        camera: false,
        microphone: false,
        error: 'Please allow camera and microphone access to continue'
      });
    }
  };

  // Validate room ID
  const validateRoom = async (roomId: string) => {
    if (!roomId.trim()) {
      setRoomValidation(null);
      return;
    }

    setIsValidatingRoom(true);
    
    // Simulate room validation (replace with actual API call)
    setTimeout(() => {
      const isValid = roomId.length >= 3; // Simple validation
      setRoomValidation({
        isValid,
        message: isValid ? 'Room is available' : 'Room ID must be at least 3 characters'
      });
      setIsValidatingRoom(false);
    }, 1000);
  };

  // Generate random room ID
  const generateRoomId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Handle room creation
  const handleCreateRoom = () => {
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }
    
    const newRoomId = generateRoomId();
    
    if (onCreateRoom) {
      onCreateRoom(name, settings);
    } else {
      // Navigate to video chat with room ID in URL
      navigate(`/video-chat/${newRoomId}`, { 
        state: { 
          name, 
          settings,
          isCreator: true 
        } 
      });
    }
  };

  // Handle room joining
  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      alert('Please enter a room ID');
      return;
    }
    
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }
    
    if (roomValidation && !roomValidation.isValid) {
      alert('Please enter a valid room ID');
      return;
    }
    
    if (onJoinRoom) {
      onJoinRoom(roomId, name, settings);
    } else {
      // Navigate to video chat with room ID in URL
      navigate(`/video-chat/${roomId}`, { 
        state: { 
          name, 
          settings,
          isCreator: false 
        } 
      });
    }
  };

  // Toggle media settings
  const toggleVideo = () => {
    setSettings(prev => ({ ...prev, video: !prev.video }));
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !settings.video;
      }
    }
  };

  const toggleAudio = () => {
    setSettings(prev => ({ ...prev, audio: !prev.audio }));
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !settings.audio;
      }
    }
  };

  // Handle device changes
  const handleDeviceChange = async (deviceType: 'camera' | 'microphone' | 'speaker', deviceId: string) => {
    setSelectedDevices(prev => ({ ...prev, [deviceType]: deviceId }));
    
    if (deviceType === 'camera' || deviceType === 'microphone') {
      // Restart stream with new device
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      try {
        const constraints = {
          video: deviceType === 'camera' ? { deviceId: { exact: deviceId } } : (settings.video ? true : false),
          audio: deviceType === 'microphone' ? { deviceId: { exact: deviceId } } : (settings.audio ? true : false)
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        console.log(`Successfully switched ${deviceType}`);
      } catch (error) {
        console.error(`Error switching ${deviceType}:`, error);
        // Fallback to basic stream
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: settings.video,
            audio: settings.audio
          });
          localStreamRef.current = fallbackStream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = fallbackStream;
          }
        } catch (fallbackError) {
          console.error('Fallback stream failed:', fallbackError);
        }
      }
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
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

      {/* Welcome message */}
      
      <motion.div
        className="flex min-h-screen items-center justify-center px-6 py-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="w-full max-w-7xl h-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Left side - Room Setup */}
          <motion.div
            className="space-y-6 h-full flex flex-col"
            variants={slideInVariants}
          >
            {/* Header */}
            <motion.div
              className="text-center space-y-4"
              variants={itemVariants}
            >
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.8 }}
              >
                <Video className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-4xl font-bold text-gray-900">
                Ready to Connect?
              </h1>
              <p className="text-lg text-gray-600">
                Choose how you'd like to start your video call
              </p>
            </motion.div>

            {/* Mode Selection */}
            <motion.div
              className="flex space-x-2 bg-white/60 backdrop-blur-sm rounded-lg p-2"
              variants={itemVariants}
            >
              <Button
                variant={mode === 'join' ? 'default' : 'ghost'}
                onClick={() => setMode('join')}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Join Room
              </Button>
              <Button
                variant={mode === 'create' ? 'default' : 'ghost'}
                onClick={() => setMode('create')}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Room
              </Button>
            </motion.div>

            {/* Room Setup Form */}
            <motion.div
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 space-y-6 flex-1 flex flex-col justify-between"
              variants={itemVariants}
            >
              <div className="space-y-6">
              <AnimatePresence mode="wait">
                {mode === 'join' ? (
                  <motion.div
                    key="join"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="roomId" className="text-gray-700 font-medium">
                        Room ID
                      </Label>
                      <div className="relative mt-2">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          id="roomId"
                          type="text"
                          value={roomId}
                          onChange={(e) => {
                            setRoomId(e.target.value.toUpperCase());
                            validateRoom(e.target.value);
                          }}
                          className="pl-10 pr-10 h-12 text-lg"
                          placeholder="Enter room ID"
                        />
                        {isValidatingRoom && (
                          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 animate-spin" />
                        )}
                        {roomValidation && !isValidatingRoom && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {roomValidation.isValid ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {roomValidation && (
                        <p className={`text-sm mt-1 ${roomValidation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                          {roomValidation.message}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="create"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Sparkles className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-blue-800 font-medium">
                        Create a new room and invite others to join
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Name Input */}
              <div>
                <Label htmlFor="name" className="text-gray-700 font-medium">
                  Your Name
                </Label>
                <div className="relative mt-2">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-12 text-lg"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

                             {/* Permission Error */}
               {mediaPermissions.error && (
                 <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                   <p className="text-red-600 text-sm">{mediaPermissions.error}</p>
                   <Button
                     onClick={requestMediaPermissions}
                     className="w-full mt-2"
                     variant="outline"
                     size="sm"
                   >
                     <Camera className="w-4 h-4 mr-2" />
                     Retry Permissions
                   </Button>
                 </div>
               )}
               </div>

              {/* Action Button */}
              <Button
                onClick={mode === 'join' ? handleJoinRoom : handleCreateRoom}
                className="w-full h-12 text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {mode === 'join' ? 'Join Room' : 'Create Room'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Right side - Preview & Info */}
          <motion.div
            className="h-full flex flex-col"
            variants={slideInVariants}
          >
            {/* Video Preview */}
            <motion.div
              className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 flex-1 flex flex-col"
              variants={itemVariants}
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Preview
              </h3>
              
              <div className="relative w-full flex-1 bg-gray-900 rounded-xl overflow-hidden min-h-[300px]">
                 {showPreview ? (
                   <>
                     <video
                       ref={localVideoRef}
                       autoPlay
                       muted
                       playsInline
                       className="w-full h-full object-cover"
                     />
                     
                     {/* Video Controls Overlay */}
                     <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                       <div className="flex items-center space-x-2">
                         <div className="bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                           {name || 'You'}
                         </div>
                       </div>
                       
                       <div className="flex items-center space-x-2">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={toggleVideo}
                           className={`w-8 h-8 p-0 rounded-full ${
                             settings.video ? 'bg-gray-800/80 hover:bg-gray-700' : 'bg-red-600/80 hover:bg-red-500'
                           }`}
                         >
                           {settings.video ? (
                             <Video className="w-4 h-4 text-white" />
                           ) : (
                             <VideoOff className="w-4 h-4 text-white" />
                           )}
                         </Button>
                         
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={toggleAudio}
                           className={`w-8 h-8 p-0 rounded-full ${
                             settings.audio ? 'bg-gray-800/80 hover:bg-gray-700' : 'bg-red-600/80 hover:bg-red-500'
                           }`}
                         >
                           {settings.audio ? (
                             <Mic className="w-4 h-4 text-white" />
                           ) : (
                             <MicOff className="w-4 h-4 text-white" />
                           )}
                         </Button>
                         
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => setShowSettings(!showSettings)}
                           className="w-8 h-8 p-0 rounded-full bg-gray-800/80 hover:bg-gray-700"
                         >
                           <Settings className="w-4 h-4 text-white" />
                         </Button>
                       </div>
                     </div>


                   </>
                 ) : (
                   <div className="flex items-center justify-center h-full">
                     <div className="text-center text-gray-400">
                       <Camera className="w-12 h-12 mx-auto mb-2" />
                       <p>Camera preview will appear here</p>
                     </div>
                   </div>
                 )}
               </div>
            </motion.div>

             
          </motion.div>
        </div>
      </motion.div>

      {/* Trust indicators section - like sponsor logos */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-6xl px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
      >
        <div className="text-center">
          <p className="text-gray-600 text-sm mb-4 uppercase tracking-wider">
            TRUSTED BY PROFESSIONALS
          </p>
          <div className="flex items-center justify-center space-x-8 text-gray-400">
            <motion.div 
              className="flex items-center space-x-2 text-sm font-medium"
              whileHover={{ scale: 1.05, color: '#3B82F6' }}
              transition={{ duration: 0.2 }}
            >
              <Shield className="w-4 h-4" />
              <span>End-to-End Encrypted</span>
            </motion.div>
            <motion.div 
              className="flex items-center space-x-2 text-sm font-medium"
              whileHover={{ scale: 1.05, color: '#3B82F6' }}
              transition={{ duration: 0.2 }}
            >
              <Users className="w-4 h-4" />
              <span>Up to 10 Participants</span>
            </motion.div>
            <motion.div 
              className="flex items-center space-x-2 text-sm font-medium"
              whileHover={{ scale: 1.05, color: '#3B82F6' }}
              transition={{ duration: 0.2 }}
            >
              <Globe className="w-4 h-4" />
              <span>Global Access</span>
            </motion.div>
            <motion.div 
              className="flex items-center space-x-2 text-sm font-medium"
              whileHover={{ scale: 1.05, color: '#3B82F6' }}
              transition={{ duration: 0.2 }}
            >
              <Headphones className="w-4 h-4" />
              <span>HD Audio Quality</span>
            </motion.div>
          </div>
                 </div>
       </motion.div>

       {/* Full-page Settings Modal */}
       <AnimatePresence>
         {showSettings && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
             onClick={() => setShowSettings(false)}
           >
             <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               transition={{ duration: 0.2 }}
               className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4"
               onClick={(e) => e.stopPropagation()}
             >
                               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Settings</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(false)}
                    className="w-8 h-8 p-0 hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
               
               <div className="space-y-5">
                 {/* Camera Selection */}
                 <div>
                   <Label className="text-sm font-medium text-gray-700 mb-2 block">
                     Camera
                   </Label>
                   <div className="relative">
                     <select
                       value={selectedDevices.camera}
                       onChange={(e) => handleDeviceChange('camera', e.target.value)}
                       className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                     >
                       {availableDevices.cameras.length === 0 ? (
                         <option value="">No cameras found</option>
                       ) : (
                         availableDevices.cameras.map((device) => (
                           <option key={device.deviceId} value={device.deviceId}>
                             {device.label || `Camera ${device.deviceId.slice(0, 8)}...`}
                           </option>
                         ))
                       )}
                     </select>
                     <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                   </div>
                 </div>

                 {/* Microphone Selection */}
                 <div>
                   <Label className="text-sm font-medium text-gray-700 mb-2 block">
                     Microphone
                   </Label>
                   <div className="relative">
                     <select
                       value={selectedDevices.microphone}
                       onChange={(e) => handleDeviceChange('microphone', e.target.value)}
                       className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                     >
                       {availableDevices.microphones.length === 0 ? (
                         <option value="">No microphones found</option>
                       ) : (
                         availableDevices.microphones.map((device) => (
                           <option key={device.deviceId} value={device.deviceId}>
                             {device.label || `Microphone ${device.deviceId.slice(0, 8)}...`}
                           </option>
                         ))
                       )}
                     </select>
                     <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                   </div>
                 </div>

                 {/* Speaker Selection */}
                 <div>
                   <Label className="text-sm font-medium text-gray-700 mb-2 block">
                     Speaker
                   </Label>
                   <div className="relative">
                     <select
                       value={selectedDevices.speaker}
                       onChange={(e) => handleDeviceChange('speaker', e.target.value)}
                       className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                     >
                       {availableDevices.speakers.length === 0 ? (
                         <option value="">No speakers found</option>
                       ) : (
                         availableDevices.speakers.map((device) => (
                           <option key={device.deviceId} value={device.deviceId}>
                             {device.label || `Speaker ${device.deviceId.slice(0, 8)}...`}
                           </option>
                         ))
                       )}
                     </select>
                     <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                   </div>
                 </div>

                 {/* Quality Settings */}
                 <div>
                   <Label className="text-sm font-medium text-gray-700 mb-3 block">
                     Video Quality
                   </Label>
                   <div className="grid grid-cols-3 gap-2">
                     {['low', 'medium', 'high'].map((quality) => (
                       <Button
                         key={quality}
                         variant={settings.videoQuality === quality ? 'default' : 'outline'}
                         size="sm"
                         onClick={() => setSettings(prev => ({ ...prev, videoQuality: quality as 'low' | 'medium' | 'high' }))}
                         className="text-sm py-2"
                       >
                         {quality.charAt(0).toUpperCase() + quality.slice(1)}
                       </Button>
                     ))}
                   </div>
                 </div>
               </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
};

export default RoomSetup; 