import { useState, useRef, useEffect, use } from 'react'
import { Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import { Mic, MicOff, Video, VideoOff, Send, Camera, Monitor, Users } from 'lucide-react'
import { io, Socket } from "socket.io-client"
import { Hand } from 'lucide-react';
import { motion } from "framer-motion";
import  {useDispatch} from 'react-redux'
import { Circle } from 'lucide-react';
import { logout } from "../../store/UserSlice"
// import "./App.css"
import "../App.css"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet"
import { useSelector } from 'react-redux'
import { useNavigate, useLocation, useParams } from 'react-router'
import { MessageSquare } from 'lucide-react';
import { Label } from '@radix-ui/react-label'
import envConfig from '@/config'



const socket: Socket = io(envConfig.socketUrl)

interface SignalingMessage {
  from?: string
  to?: string
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
  name?: string
}

interface ChatMessage {
  name:string,
  sender: string
  content: string
  timestamp: number
}



// interface HandRaised {
//   sender: string
//   content: string
//   timestamp: number
// }

export function VideoChat() {
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [roomId, setRoomId] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [peers, setPeers] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteStreamRef = useRef<HTMLVideoElement>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<{ [key: string]: RTCPeerConnection }>({})
  const [remoteNames, setRemoteNames] = useState<{key:string,name:string,streamId:string, handRaised:boolean,cameraStatus:boolean,micStatus:boolean}[]>([])
  const [name, setName] = useState<string>("")
  const [notification, setNotification] = useState<boolean>(false)
  const [remoteStream, setRemoteStream] = useState<MediaStream[]>([])
  const [onMessagePannel,setOnMesagePannel]= useState<boolean>(false)
  // Scroll to bottom of messages when new messages arrive

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const params = useParams();
  const { user } = useSelector((state: any) => state.user) 
 console.log( "user from redux", user)

  useEffect(() => {
    if(messages.length > 0){
    console.log("messgaes", messages)
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
   if(!onMessagePannel){
    setNotification(true)
    }
     if(onMessagePannel){
    setNotification(false)
    }

  }}, [messages])

{console.log("on message pannel", onMessagePannel)
  console.log("notication", notification)
}

  useEffect(() => {
    // Initialize media stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      })
      .catch(err => {
        console.error("Error accessing media devices:", err)
      })

    // Socket event handlers
    socket.on("connect", () => {
      console.log("Connected to signaling server")
    })

    socket.on("user-joined", async (result) => {
      const {userId, users} = result;

      console.log("User joined:", userId, users)
      
      // Only add if not already in peers
      setPeers(prev => {
        if (prev.includes(userId)) return prev;
        return [...prev, userId];
      });

             // Clean and update remote names (remove duplicates)
       if (users && Array.isArray(users)) {
         console.log("Updating remote names with:", users);
         setRemoteNames(users);
       }
      
      const peerConnection = createPeerConnection(userId) ;
      // Create and send offer to the new user 
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer) 
      socket.emit("offer", { to: userId, offer })
      console.log("Sending offer to:", userId)
    })


    socket.on("handRaised", ({users}) => {
      console.log(`Hand raised by ${users.name}: ${users.handRaised}`)
      setRemoteNames(prev => prev.map(remoteName => {
        if (remoteName.streamId === users.streamId) {
          return { ...remoteName, handRaised: users.handRaised }
        }
        return remoteName
      }))
    })


    socket.on("camera-status", ({ users }) => {
      console.log(`Camera status of ${users.name}: ${users.cameraStatus}`)
      setRemoteNames(prev => prev.map(remoteName => {
        if (remoteName.streamId === users.streamId) {
          return { ...remoteName, cameraStatus: users.cameraStatus }
        }
        return remoteName
      }))
    })
    socket.on("mic-status", ({ users }) => {
      console.log(`Mic status of ${users.name}: ${users.micStatus}`)
      setRemoteNames(prev => prev.map(remoteName => {
        if (remoteName.streamId === users.streamId) {
          return { ...remoteName, micStatus: users.micStatus }
        }
        return remoteName
      }))
    })

    socket.on("all-users", ({ users }) => {
      if (!users) return;
      const userList = users.map(([socketId, { name, streamId }]: [string, { name: string, streamId: string}]) => ({
        userId: socketId,
        name,
        streamId,
      }));
    
      console.log("All users in the room:", userList);
      // Optional: If you want to update peers immediately
      // setPeers(userList.map(u => u.userId));
    });
    


    socket.on("user-left", (userId: string) => {
      console.log("User left:", userId)
      
      // Remove from peers
      setPeers(prev => prev.filter(id => id !== userId))
      
      // Clean up peer connection
      if (peerConnectionsRef.current[userId]) {
        peerConnectionsRef.current[userId].close()
        delete peerConnectionsRef.current[userId]
      }
      
      // Remove user's stream from remote streams
      setRemoteStream(prev => {
        const userStreamId = remoteNames.find(rn => rn.key === userId)?.streamId;
        return prev.filter(stream => stream.id !== userStreamId);
      })
      
      // Clean up remote names
      setRemoteNames(prev => prev.filter(remoteName => remoteName.key !== userId))
    })

 

    socket.on("offer", async ({ offer, from}: SignalingMessage) => {
      console.log("Received offer from:", from, offer)
      if (!from || !offer) return
      
      try {
        let peerConnection = peerConnectionsRef.current[from]
        if (!peerConnection) {
          peerConnection = createPeerConnection(from)
        }
        
        // Check if we can set remote description
        if (peerConnection.signalingState === "stable" || peerConnection.signalingState === "have-local-offer") {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
          const answer = await peerConnection.createAnswer()
          await peerConnection.setLocalDescription(answer)
          socket.emit("answer", { to: from, answer }) 
          console.log("Sending answer to:", from);
        } else {
          console.warn("Cannot set remote description, peer connection state:", peerConnection.signalingState)
        }
      } catch (error) {
        console.error("Error handling offer:", error)
      }
    })

    socket.on("answer", async ({ answer, from }: SignalingMessage) => {
      if (!from || !answer) return
      console.log("Received answer from:", from, name)
      
      try {
        const peerConnection = peerConnectionsRef.current[from]
        if (peerConnection) {
          // Check if we can set remote description
          if (peerConnection.signalingState === "have-local-offer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
            console.log("Successfully set remote description for answer from:", from)
          } else {
            console.warn("Cannot set remote description for answer, peer connection state:", peerConnection.signalingState)
          }
        } else {
          console.warn("No peer connection found for:", from)
        }
      } catch (error) {
        console.error("Error handling answer:", error)
      }
    })
    socket.on("ice-candidate", async ({ candidate, from  }: SignalingMessage) => {
      if (!from || !candidate) return
      console.log("Received ICE candidate from:", from, candidate)
    
      try {
        const peerConnection = peerConnectionsRef.current[from]
        if (peerConnection && peerConnection.remoteDescription) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
          console.log("Successfully added ICE candidate from:", from)
        } else {
          console.warn("Cannot add ICE candidate, no peer connection or remote description for:", from)
        }
      } catch (error) {
        console.error("Error handling ICE candidate:", error)
      }
    })

    // Chat message handler
    socket.on("chat-message", (message: ChatMessage) => {
      console.log("Received chat message:", message)
      setMessages(prev => {
        console.log("Adding message to chat, current messages:", prev.length)
        return [...prev, message]
      })
    })

   
    return () => {
      socket.off("connect")
      socket.off("user-joined")
      socket.off("user-left")
      socket.off("offer")
      socket.off("answer")
      socket.off("ice-candidate")
      socket.off("chat-message")
      socket.off("handRaised")
      socket.off("camera-status")
      socket.off("mic-status")
      socket.off("all-users")
      
      // Stop local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop()
          console.log("Stopped local track:", track.kind)
        })
      }
      
      // Close all peer connections
      Object.entries(peerConnectionsRef.current).forEach(([userId, pc]) => {
        console.log("Closing peer connection for:", userId)
        pc.close()
      })
      
      // Clear all peer connections
      peerConnectionsRef.current = {}
    }
  }, [])

  useEffect(()=>{
    if(isConnected && localStreamRef.current && localVideoRef.current){
      localVideoRef.current.srcObject = localStreamRef.current
    }
  },[isConnected])

  // Auto-join room from URL params and navigation state
  useEffect(() => {
    const roomData = location.state as any;
    const roomIdFromUrl = params.roomId;
    
    if (roomIdFromUrl && !isConnected) {
      console.log('Auto-joining room with ID from URL:', roomIdFromUrl);
      setRoomId(roomIdFromUrl);
      
      // Get name and settings from navigation state if available, otherwise use defaults
      const userName = roomData?.name || user?.userName || 'Anonymous';
      const settings = roomData?.settings || {};
      
      setName(userName);
      
      // Small delay to ensure media stream is ready
      setTimeout(() => {
        joinRoom(roomIdFromUrl, userName, settings);
      }, 1000);
    } else if (!roomIdFromUrl && !isConnected) {
      // No room ID in URL, redirect back to room setup
      navigate('/room-setup');
    }
  }, [params.roomId, location.state, isConnected, navigate, user]);
// create connection 
  const createPeerConnection = (userId: string) => {
    // Check if connection already exists
    if (peerConnectionsRef.current[userId]) {
      console.log("Peer connection already exists for:", userId)
      return peerConnectionsRef.current[userId]
    }

    console.log("Creating new peer connection for:", userId)
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
    })

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        try {
          peerConnection.addTrack(track, localStreamRef.current!)
          console.log("Added track to peer connection:", track.kind)
        } catch (error) {
          console.error("Error adding track:", error)
        }
      })
    }
 
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        try {
          const duplicateCandidate = JSON.stringify(event.candidate);
          const candidate = JSON.parse(duplicateCandidate);
          console.log("Sending ICE candidate to:", userId, candidate)
          socket.emit("ice-candidate", { to: userId, candidate })
        } catch (error) {
          console.error("Error handling ICE candidate:", error)
        }
      }
    } 

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log("Received remote track from:", userId, event)
      try {
        const newStream = event.streams[0]
        
        setRemoteStream(prev => {
          if (prev.some(stream => stream.id === newStream.id)) return prev
          console.log("Adding new remote stream:", newStream.id)
          return [...prev, newStream]
        })
        
        setPeers(prev => {
          if (prev.some(id => id === userId)) return prev
          return [...prev, userId]
        })
      } catch (error) {
        console.error("Error handling remote stream:", error)
      }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log("Connection state changed for", userId, ":", peerConnection.connectionState)
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        console.log("Cleaning up failed connection for:", userId)
        // Clean up failed connection
        if (peerConnectionsRef.current[userId]) {
          peerConnectionsRef.current[userId].close()
          delete peerConnectionsRef.current[userId]
        }
      }
    }

    peerConnectionsRef.current[userId] = peerConnection
    return peerConnection
  }

  const joinRoom = async (roomId: string, name: string, settings: any) => {
    if (!roomId) {
      alert("Please enter a room ID")
      return;
    }
    
    console.log("sending stream Id", localStreamRef.current?.id,localStreamRef)
  
    socket.emit("join-room", {roomId, name, streamId:localStreamRef.current?.id,handRaised:false, cameraStatus: localStreamRef.current?.getVideoTracks()[0].enabled,micStatus: localStreamRef.current?.getAudioTracks()[0].enabled})
    setIsConnected(true)
    setRoomId(roomId)
    setName(name)
    
    // Add a welcome message to test chat
    setTimeout(() => {
      const welcomeMessage: ChatMessage = {
        name: 'System',
        sender: 'system',
        content: `Welcome to room ${roomId}! 🎉`,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, welcomeMessage])
    }, 500)
  }



  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      videoTrack.enabled = !videoTrack.enabled
      setIsCameraOn(!isCameraOn)
      const cameraStatus= videoTrack.enabled ? true : false
      socket.emit("camera-status", { name, cameraStatus, streamId:localStreamRef.current?.id })
      console.log("Camera status", cameraStatus)
    }
  }

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      audioTrack.enabled = !audioTrack.enabled
      setIsMicOn(!isMicOn)
      const micStatus = audioTrack.enabled ? true : false
      socket.emit("mic-status", { name, micStatus, streamId:localStreamRef.current?.id })
      console.log("Mic status", micStatus)
    }
  }

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
        
        // Replace video track in peer connections
        const videoTrack = screenStream.getVideoTracks()[0]
        
        // Update local stream and video element
        if (localStreamRef.current) {
          const oldVideoTrack = localStreamRef.current.getVideoTracks()[0]
          localStreamRef.current.removeTrack(oldVideoTrack)
          localStreamRef.current.addTrack(videoTrack)
          
          // Update video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current
          }
          
          // Update all peer connections
          Object.values(peerConnectionsRef.current).forEach((peerConnection) => {
            const sender = peerConnection.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            )
            if (sender) {
              sender.replaceTrack(videoTrack)
            }
          })
        }
        
        // Listen for screen share end
        videoTrack.onended = () => {
          stopScreenShare()
        }
        
        setIsScreenSharing(true)
        console.log("Screen sharing started")
      } else {
        stopScreenShare()
      }
    } catch (error) {
      console.error("Error toggling screen share:", error)
      alert("Screen sharing not supported or permission denied")
    }
  }

  const stopScreenShare = async () => {
    try {
      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      
      const videoTrack = cameraStream.getVideoTracks()[0]
      const audioTrack = cameraStream.getAudioTracks()[0]
      
      // Update local stream
      if (localStreamRef.current) {
        // Remove old tracks
        localStreamRef.current.getTracks().forEach(track => {
          if (track.kind === 'video' || track.kind === 'audio') {
            localStreamRef.current?.removeTrack(track)
            track.stop()
          }
        })
        
        // Add new tracks
        localStreamRef.current.addTrack(videoTrack)
        localStreamRef.current.addTrack(audioTrack)
        
        // Update video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current
        }
        
        // Update all peer connections
        Object.values(peerConnectionsRef.current).forEach((peerConnection) => {
          const videoSender = peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          )
          const audioSender = peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'audio'
          )
          
          if (videoSender) {
            videoSender.replaceTrack(videoTrack)
          }
          if (audioSender) {
            audioSender.replaceTrack(audioTrack)
          }
        })
      }
      
      setIsScreenSharing(false)
      console.log("Screen sharing stopped")
    } catch (error) {
      console.error("Error stopping screen share:", error)
    }
  }

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket.id) {
      console.log("Cannot send message - missing content or socket not connected", {
        newMessage: newMessage.trim(),
        socketId: socket.id,
        socketConnected: socket.connected
      })
      return
    }

    const message: ChatMessage = {
      name: name,
      sender: socket.id,
      content: newMessage,
      timestamp: Date.now()
    }

    console.log("Sending chat message:", message)
    socket.emit("chat-message", message)
    setNewMessage("")
  }
  const handleHandRaided = () => {
    
  if(!socket.id)return;

  const handRaised= remoteNames.some((remoteName) => remoteName.handRaised && remoteName.streamId === localStreamRef.current?.id)
    if(handRaised){
    setRemoteNames((prev) =>
      prev.map((remoteName) =>
        remoteName.streamId === localStreamRef.current?.id
          ? { ...remoteName, handRaised: false }
          : remoteName
      )
    )
  }
  console.log("hand raised", handRaised)
  socket.emit("handRaised", {name , handRaised:!handRaised, streamId:localStreamRef.current?.id})
  }
 


 

  return (
    <>
    
    <div className="h-screen w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
     {!isConnected && ( 
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-white text-xl font-medium">Setting up your room...</p>
            <p className="text-gray-400 text-sm">Please wait while we connect you</p>
          </div>
        </div>
      )}
     {isConnected && (
       <>
         {/* Top Bar */}
         <div className="absolute top-0 left-0 right-0 z-10 bg-black/20 backdrop-blur-sm border-b border-white/10">
           <div className="flex items-center justify-between px-6 py-4">
             <div className="flex items-center space-x-4">
               <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 rounded-full shadow-lg"> 
                 <span className="text-white font-medium">Hello {user?.userName}</span>
                 <span className="ml-2 text-2xl">👋</span>
               </div>
               <div className="hidden md:flex items-center space-x-2 text-gray-300">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                 <span className="text-sm">Room: {roomId}</span>
               </div>
             </div>
             <div className="flex items-center space-x-2">
               <div className="text-gray-300 text-sm">
                 {new Date().toLocaleTimeString()}
               </div>
             </div>
           </div>
         </div>

         {/* Main Content Area with proper spacing */}
         <div className="h-full pt-24 pb-20 px-4 md:px-6 flex items-start justify-center">
           <div className="w-full max-w-[1400px] grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6 h-full">
             
             {/* Video Area - Takes full width on mobile, 3/4 on desktop */}
             <div className="xl:col-span-3 flex flex-col order-2 xl:order-1">
               <div className={`grid gap-4 flex-1 min-h-0 p-4 ${
                 // Total users = local + remote
                 (() => {
                   const totalUsers = remoteStream.length + 1;
                   if (totalUsers === 1) return 'grid-cols-1';
                   if (totalUsers === 2) return 'grid-cols-2 auto-rows-fr';
                   if (totalUsers === 3) return 'grid-cols-2 auto-rows-fr';
                   if (totalUsers === 4) return 'grid-cols-2 auto-rows-fr';
                   if (totalUsers === 5 || totalUsers === 6) return 'grid-cols-3 auto-rows-fr';
                   return 'grid-cols-3 auto-rows-fr';
                 })()
               }`}>
          
            {/* Local Video */}
            <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Video Overlay Info */}
              <div className="absolute top-4 left-4 flex gap-2">
              {name && (
                <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium border border-white/20">
                  {name} (You)
                </div>
              )}
              </div>

              {/* Status Indicators */}
              <div className="absolute top-4 right-4 flex gap-2">
                {remoteNames.find((remoteName) => (remoteName.handRaised) && (remoteName.streamId==localStreamRef.current?.id)) && (
                  <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                    ✋ Hand Raised
                  </div>
                )}
                {isScreenSharing && (
                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    📺 Sharing Screen
                  </div>
                )}
                {!isCameraOn && (
                  <div className="bg-red-500/90 backdrop-blur-sm p-2 rounded-full">
                    <VideoOff className="w-4 h-4 text-white" />
                  </div>
                )}
                {!isMicOn && (
                  <div className="bg-red-500/90 backdrop-blur-sm p-2 rounded-full">
                    <MicOff className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              
              {/* Control Panel Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                <div className="flex items-center justify-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleCamera}
                    className={`p-3 rounded-full backdrop-blur-sm border border-white/20 transition-all duration-200 ${
                      isCameraOn 
                        ? 'bg-white/20 hover:bg-white/30 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleMic}
                    className={`p-3 rounded-full backdrop-blur-sm border border-white/20 transition-all duration-200 ${
                      isMicOn 
                        ? 'bg-white/20 hover:bg-white/30 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleHandRaided}
                    className={`p-3 rounded-full backdrop-blur-sm border border-white/20 transition-all duration-200 ${
                      remoteNames.find((remoteName) => (remoteName.handRaised) && (remoteName.streamId==localStreamRef.current?.id))
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-black' 
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    <Hand className="w-5 h-5" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleScreenShare}
                    className={`p-3 rounded-full backdrop-blur-sm border border-white/20 transition-all duration-200 ${
                      isScreenSharing 
                        ? 'bg-green-500 hover:bg-green-600 text-white' 
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    <Monitor className="w-5 h-5" />
                  </motion.button>
             
                   {isConnected && (
                     <Sheet onOpenChange={(open)=>{
                       console.log("Chat sheet open state changed:", open)
                       setOnMesagePannel(open)
                     }}>
                       <SheetTrigger asChild>
                         <motion.div 
                           className='relative'
                           whileHover={{ scale: 1.05 }}
                           whileTap={{ scale: 0.95 }}
                         >
                           <button className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/20 text-white transition-all duration-200">
                             <MessageSquare className="w-5 h-5" />
                           </button>
                           {(notification && !onMessagePannel) && (
                            <div className='absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white' />
                           )}
                         </motion.div>
                       </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-gray-900/95 backdrop-blur-sm border-gray-700">
        <SheetHeader>
          <SheetTitle className="text-white">Chat</SheetTitle>
           </SheetHeader>
          <div className="overflow-y-auto mb-4 h-[calc(100vh-200px)] space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
            {messages.map((message, index) => (
              <div
                key={`${message.sender}-${message.timestamp}-${index}`}
                className={`p-3 rounded-2xl max-w-[80%] ${
                  message.sender === socket.id
                    ? "bg-blue-500 text-white ml-auto"
                    : "bg-gray-700 text-white mr-auto"
                }`}
              >
                <div className="text-xs opacity-70 mb-1">
                  {message.sender === socket.id ? "You" : message.name}
                </div>
                <div className="text-sm">{message.content}</div>
                <div className="text-xs opacity-50 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {remoteNames.map((remoteName) => {
              if (remoteName.handRaised) {
                return (
                  <div key={remoteName.key} className="p-3 rounded-2xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 text-sm text-center">
                    ✋ {remoteName.name} raised their hand
                  </div>
                )
              }
              return null
            })
            }
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="flex gap-3 w-full pt-4 border-t border-gray-700">
            <Input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl transition-colors"
            >
              <Send className="h-4 w-4" />
            </motion.button>
          </form>
        {/* </div> */}
       
        
        <SheetFooter>
        
        </SheetFooter>
      </SheetContent>
                     </Sheet>
                   )}
                 </div>
               </div>
            </div>
            {/* Remote Videos */}
            {remoteStream.length > 0 &&
              remoteStream.map((stream, index) => {
                console.log("remote stream",stream)
                const totalUsers = remoteStream.length + 1;
                const isThirdUserInOddGroup = totalUsers === 3 && index === 1; // Third user (index 1 in remote, but 3rd overall)
                
                return (
                  <div 
                    key={stream.id} 
                    className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 aspect-video ${
                      isThirdUserInOddGroup ? 'col-start-1 col-end-3 justify-self-center max-w-md' : ''
                    }`}
                  >
                    <video
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                      ref={(video) => {
                        if (video) {
                          video.srcObject = stream
                        }
                      }}
                    />
                    
                    {/* Remote Video Info */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      {remoteNames.map((remoteName) => {
                        console.log("REMOTE NAME",remoteName)
                        if (remoteName.streamId === stream.id) {
                          return (
                            <div key={remoteName.key} className="bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium border border-white/20">
                              {remoteName.name}
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>

                    {/* Remote Hand Raised & Status Indicators */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      {remoteNames.map((remoteName) => {
                        if (remoteName.streamId === stream.id) {
                          return (
                            <div key={`${remoteName.key}-status`} className="flex gap-2">
                              {remoteName.handRaised && (
                                <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                                  ✋
                                </div>
                              )}
                              {remoteName.cameraStatus === false && (
                                <div className="bg-red-500/90 backdrop-blur-sm p-2 rounded-full">
                                  <VideoOff className="w-4 h-4 text-white" />
                                </div>
                              )}
                              {remoteName.micStatus === false && (
                                <div className="bg-red-500/90 backdrop-blur-sm p-2 rounded-full">
                                  <MicOff className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                          )
                        }
                        return null
                      })}
                    </div>
                  </div>
                )
              })
            }
                </div>
              </div>

              {/* Participants Panel - Full width on mobile, 1/4 on desktop */}
              <div className="xl:col-span-1 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4 flex flex-col order-1 xl:order-2 h-fit xl:h-full max-h-96 xl:max-h-none">
                <h3 className="text-white font-semibold text-lg mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Participants ({remoteStream.length + 1})
                </h3>
                
                <div className="space-y-3 flex-1">
                  {/* Local User - Always show once */}
                  <div className="flex items-center justify-between p-3 bg-blue-500/20 border border-blue-500/50 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {name ? name.charAt(0).toUpperCase() : 'Y'}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{name} (You)</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {isScreenSharing && (
                            <span className="text-green-400 text-xs bg-green-500/20 px-2 py-1 rounded">Screen</span>
                          )}
                          {remoteNames.find((remoteName) => (remoteName.handRaised) && (remoteName.streamId==localStreamRef.current?.id)) && (
                            <span className="text-yellow-400 text-xs bg-yellow-500/20 px-2 py-1 rounded">✋ Hand</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isCameraOn ? 'bg-gray-600' : 'bg-red-500'
                      }`}>
                        {isCameraOn ? (
                          <Video className="w-3 h-3 text-white" />
                        ) : (
                          <VideoOff className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isMicOn ? 'bg-gray-600' : 'bg-red-500'
                      }`}>
                        {isMicOn ? (
                          <Mic className="w-3 h-3 text-white" />
                        ) : (
                          <MicOff className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Remote Users - Only show users with active streams */}
                  {remoteStream.map((stream) => {
                    const remoteName = remoteNames.find(rn => rn.streamId === stream.id);
                    if (!remoteName) return null;
                    
                    return (
                      <div key={stream.id} className="flex items-center justify-between p-3 bg-gray-700/50 border border-gray-600/50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {remoteName.name ? remoteName.name.charAt(0).toUpperCase() : 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{remoteName.name}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              {remoteName.handRaised && (
                                <span className="text-yellow-400 text-xs bg-yellow-500/20 px-2 py-1 rounded">✋ Hand</span>
                              )}
                              <span className="text-green-400 text-xs">Connected</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            remoteName.cameraStatus ? 'bg-gray-600' : 'bg-red-500'
                          }`}>
                            {remoteName.cameraStatus ? (
                              <Video className="w-3 h-3 text-white" />
                            ) : (
                              <VideoOff className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            remoteName.micStatus ? 'bg-gray-600' : 'bg-red-500'
                          }`}>
                            {remoteName.micStatus ? (
                              <Mic className="w-3 h-3 text-white" />
                            ) : (
                              <MicOff className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Actions */}
                <div className="border-t border-gray-600/50 pt-4 mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={toggleMic}
                      className={`p-2 rounded-lg text-xs font-medium transition-all ${
                        isMicOn 
                          ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      {isMicOn ? <Mic className="w-3 h-3 mx-auto" /> : <MicOff className="w-3 h-3 mx-auto" />}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={toggleCamera}
                      className={`p-2 rounded-lg text-xs font-medium transition-all ${
                        isCameraOn 
                          ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      {isCameraOn ? <Video className="w-3 h-3 mx-auto" /> : <VideoOff className="w-3 h-3 mx-auto" />}
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </div>
       </>
     )}

      
         {/* Bottom Control Bar */}
         <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/20 backdrop-blur-sm border-t border-white/10">
           <div className="flex items-center justify-between px-6 py-4">
             <div className="flex items-center space-x-2 text-gray-300">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-sm">Connected to Room {roomId}</span>
             </div>
             <div className="flex items-center space-x-3">
               <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => navigate("/room-setup")}
                 className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg text-white transition-all duration-200"
               >
                 Change Room
               </motion.button>
               <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => {
                   dispatch(logout({}))
                   navigate("/signup")
                 }}
                 className="px-4 py-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-sm border border-red-400/50 rounded-lg text-white transition-all duration-200"
               >
                 Logout
               </motion.button>
             </div>
           </div>
         </div>
      </div>
  
    </>
  )
}
