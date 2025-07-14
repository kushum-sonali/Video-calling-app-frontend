import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react'
import {Input} from "@/components/ui/input"
import { Mic, MicOff, Video, VideoOff, Send, Monitor, Users, Copy, Check, X, PhoneOff } from 'lucide-react'
import { io, Socket } from "socket.io-client"
import { Hand } from 'lucide-react';
import { motion } from "framer-motion";
import "../App.css"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet"
import { useSelector } from 'react-redux'
import { useNavigate, useLocation, useParams } from 'react-router'
import { MessageSquare } from 'lucide-react';
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

// Memoized local video tile component
const LocalVideoTile = memo(({ 
  localVideoRef, 
  name, 
  isCameraOn, 
  isMicOn, 
  isScreenSharing, 
  isHandRaised,
  remoteStreamLength 
}: {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  name: string;
  isCameraOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  remoteStreamLength: number;
}) => (
  <div className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 video-container ${
    remoteStreamLength === 0 ? 'aspect-[4/5] max-w-lg mx-auto' : 'aspect-video'
  }`}>
    <video
      ref={localVideoRef}
      autoPlay
      muted
      playsInline
      className="w-full h-full object-cover local-video"
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
      {isHandRaised && (
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
  </div>
));

// Memoized remote video tile component
const RemoteVideoTile = memo(({ 
  stream, 
  remoteName, 
  isThirdUserInOddGroup 
}: {
  stream: MediaStream;
  remoteName: {key:string,name:string,streamId:string, handRaised:boolean,cameraStatus:boolean,micStatus:boolean} | undefined;
  isThirdUserInOddGroup: boolean;
}) => (
  <div 
    className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 video-container ${
      isThirdUserInOddGroup ? 'aspect-video col-start-1 col-end-3 justify-self-center max-w-md' : 'aspect-video'
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
      {remoteName && (
        <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium border border-white/20">
          {remoteName.name}
        </div>
      )}
    </div>

    {/* Remote Hand Raised & Status Indicators */}
    <div className="absolute top-4 right-4 flex gap-2">
      {remoteName && (
        <div className="flex gap-2">
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
      )}
    </div>
  </div>
));

// Memoized control button component
const VideoControls = memo(({ 
  isCameraOn, 
  isMicOn, 
  isScreenSharing, 
  toggleCamera, 
  toggleMic, 
  toggleScreenShare, 
  handleHandRaised, 
  hangupCall,
  isHandRaised 
}: {
  isCameraOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
  toggleCamera: () => void;
  toggleMic: () => void;
  toggleScreenShare: () => void;
  handleHandRaised: () => void;
  hangupCall: () => void;
  isHandRaised: boolean;
}) => (
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
      onClick={handleHandRaised}
      className={`p-3 rounded-full backdrop-blur-sm border border-white/20 transition-all duration-200 ${
        isHandRaised
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

    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={hangupCall}
      className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white backdrop-blur-sm border border-red-400/50 transition-all duration-200"
    >
      <PhoneOff className="w-5 h-5" />
    </motion.button>
  </div>
));

// Memoized participants button component
const ParticipantsButton = memo(({ 
  remoteNames,
  remoteStream,
  name,
  isCameraOn,
  isMicOn,
  isScreenSharing,
  isHandRaised,
  removeParticipant,
  localStreamRef
}: {
  remoteNames: {key:string,name:string,streamId:string, handRaised:boolean,cameraStatus:boolean,micStatus:boolean}[];
  remoteStream: MediaStream[];
  name: string;
  isCameraOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  removeParticipant: (streamId: string) => void;
  localStreamRef: React.RefObject<MediaStream | null>;
}) => (
  <Sheet>
    <SheetTrigger asChild>
      <motion.div 
        className='relative'
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button className="p-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/20 text-white transition-all duration-200">
          <Users className="w-5 h-5" />
        </button>
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
          {remoteStream.length + 1}
        </div>
      </motion.div>
    </SheetTrigger>
    <SheetContent className="w-full sm:max-w-md bg-gray-900/95 backdrop-blur-sm border-gray-700">
      <SheetHeader>
        <SheetTitle className="text-white">Participants ({remoteStream.length + 1})</SheetTitle>
      </SheetHeader>
      <div className="overflow-y-auto mb-4 h-[calc(100vh-120px)] space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
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
                {isHandRaised && (
                  <span className="text-yellow-400 text-xs bg-yellow-500/20 px-2 py-1 rounded">✋ Hand</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex space-x-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              isCameraOn ? 'bg-green-600' : 'bg-red-500'
            }`}>
              {isCameraOn ? (
                <Video className="w-3 h-3 text-white" />
              ) : (
                <VideoOff className="w-3 h-3 text-white" />
              )}
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              isMicOn ? 'bg-green-600' : 'bg-red-500'
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
            <div key={stream.id} className="flex items-center justify-between p-3 bg-gray-700/50 border border-gray-600/50 rounded-xl group">
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
              <div className="flex items-center space-x-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  remoteName.cameraStatus === true ? 'bg-green-600' : 'bg-red-500'
                }`}>
                  {remoteName.cameraStatus === true ? (
                    <Video className="w-3 h-3 text-white" />
                  ) : (
                    <VideoOff className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  remoteName.micStatus === true ? 'bg-green-600' : 'bg-red-500'
                }`}>
                  {remoteName.micStatus === true ? (
                    <Mic className="w-3 h-3 text-white" />
                  ) : (
                    <MicOff className="w-3 h-3 text-white" />
                  )}
                </div>
                <button
                  onClick={() => removeParticipant(stream.id)}
                  className="w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 ml-2"
                  title="Remove participant"
                >
                  <X className="w-3 h-3 text-red-400 hover:text-white" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <SheetFooter>
      </SheetFooter>
    </SheetContent>
  </Sheet>
));

// Memoized chat button component
const ChatButton = memo(({ 
  onMessagePannel, 
  setOnMesagePannel, 
  notification,
  sendMessage,
  messages,
  newMessage,
  setNewMessage,
  messagesEndRef,
  remoteNames,
  socketId
}: {
  onMessagePannel: boolean;
  setOnMesagePannel: (open: boolean) => void;
  notification: boolean;
  sendMessage: (e: React.FormEvent) => void;
  messages: ChatMessage[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  remoteNames: {key:string,name:string,streamId:string, handRaised:boolean,cameraStatus:boolean,micStatus:boolean}[];
  socketId: string | undefined;
}) => (
  <Sheet onOpenChange={(open) => {
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
              message.sender === socketId
                ? "bg-blue-500 text-white ml-auto"
                : "bg-gray-700 text-white mr-auto"
            }`}
          >
            <div className="text-xs opacity-70 mb-1">
              {message.sender === socketId ? "You" : message.name}
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
        })}
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
      <SheetFooter>
      </SheetFooter>
    </SheetContent>
  </Sheet>
));

const VideoChat = memo(() => {
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
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<{ [key: string]: RTCPeerConnection }>({})
  const [remoteNames, setRemoteNames] = useState<{key:string,name:string,streamId:string, handRaised:boolean,cameraStatus:boolean,micStatus:boolean}[]>([])
  const [name, setName] = useState<string>("")
  const [notification, setNotification] = useState<boolean>(false)
  const [remoteStream, setRemoteStream] = useState<MediaStream[]>([])
  const [onMessagePannel,setOnMesagePannel]= useState<boolean>(false)
  const [isCopied, setIsCopied] = useState<boolean>(false)
  const [isUrlCopied, setIsUrlCopied] = useState<boolean>(false)
  const [isInvitationCopied, setIsInvitationCopied] = useState<boolean>(false)
  // Scroll to bottom of messages when new messages arrive

  const navigate = useNavigate();
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
        
        // Check actual track status and update state
        const videoTrack = stream.getVideoTracks()[0]
        const audioTrack = stream.getAudioTracks()[0]
        
        if (videoTrack) {
          // Ensure video track is enabled by default
          videoTrack.enabled = true
          setIsCameraOn(true)
          console.log("Initial camera status:", true)
        }
        
        if (audioTrack) {
          // Ensure audio track is enabled by default
          audioTrack.enabled = true
          setIsMicOn(true)
          console.log("Initial mic status:", true)
        }
      })
      .catch(err => {
        console.error("Error accessing media devices:", err)
        // Set to false if media access fails
        setIsCameraOn(false)
        setIsMicOn(false)
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

  // Handle video element resize when layout changes
  useEffect(() => {
    // Remove the problematic video resize effect that was causing issues
    // The CSS transitions and grid layout should handle resizing naturally
  }, [remoteStream.length])

  // Sync React state with actual track state periodically
  useEffect(() => {
    if (!isConnected || !localStreamRef.current) return;

    const syncMediaState = () => {
      const videoTrack = localStreamRef.current?.getVideoTracks()[0]
      const audioTrack = localStreamRef.current?.getAudioTracks()[0]
      
      if (videoTrack && isCameraOn !== videoTrack.enabled) {
        console.log("Syncing camera state:", videoTrack.enabled)
        setIsCameraOn(videoTrack.enabled)
        socket.emit("camera-status", { 
          name, 
          cameraStatus: videoTrack.enabled, 
          streamId: localStreamRef.current?.id,
          roomId: roomId
        })
      }
      
      if (audioTrack && isMicOn !== audioTrack.enabled) {
        console.log("Syncing mic state:", audioTrack.enabled)
        setIsMicOn(audioTrack.enabled)
        socket.emit("mic-status", { 
          name, 
          micStatus: audioTrack.enabled, 
          streamId: localStreamRef.current?.id,
          roomId: roomId
        })
      }
    }

    // Check every 2 seconds
    const interval = setInterval(syncMediaState, 2000)
    
    return () => clearInterval(interval)
  }, [isConnected, isCameraOn, isMicOn, name, roomId])

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
        joinRoom(roomIdFromUrl, userName);
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

  const joinRoom = async (roomId: string, name: string) => {
    if (!roomId) {
      alert("Please enter a room ID")
      return;
    }
    
    console.log("sending stream Id", localStreamRef.current?.id,localStreamRef)
  
    // Get current track states for accurate initial status
    const videoTrack = localStreamRef.current?.getVideoTracks()[0]
    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    
    // Ensure tracks are enabled by default and sync with state
    let currentCameraStatus = true
    let currentMicStatus = true
    
    if (videoTrack) {
      videoTrack.enabled = true
      currentCameraStatus = true
      setIsCameraOn(true)
    }
    
    if (audioTrack) {
      audioTrack.enabled = true
      currentMicStatus = true
      setIsMicOn(true)
    }
    
    socket.emit("join-room", {
      roomId, 
      name, 
      streamId: localStreamRef.current?.id,
      handRaised: false, 
      cameraStatus: currentCameraStatus,
      micStatus: currentMicStatus
    })
    setIsConnected(true)
    setRoomId(roomId)
    setName(name)
    
    console.log("Joined room with camera:", currentCameraStatus, "mic:", currentMicStatus)
  }



  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        const newCameraStatus = !videoTrack.enabled
        videoTrack.enabled = newCameraStatus
        setIsCameraOn(newCameraStatus)
        socket.emit("camera-status", { 
          name, 
          cameraStatus: newCameraStatus, 
          streamId: localStreamRef.current?.id,
          roomId: roomId
        })
        console.log("Camera toggled to:", newCameraStatus)
      }
    }
  }, [name, roomId])

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        const newMicStatus = !audioTrack.enabled
        audioTrack.enabled = newMicStatus
        setIsMicOn(newMicStatus)
        socket.emit("mic-status", { 
          name, 
          micStatus: newMicStatus, 
          streamId: localStreamRef.current?.id,
          roomId: roomId
        })
        console.log("Mic toggled to:", newMicStatus)
      }
    }
  }, [name, roomId])

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

  const sendMessage = useCallback((e: React.FormEvent) => {
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
  }, [newMessage, name])
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
 
  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy room ID:', err)
    }
  }, [roomId])

  const copyInvitationUrl = useCallback(async () => {
    try {
      const invitationUrl = `${window.location.origin}/video-chat/${roomId}`
      await navigator.clipboard.writeText(invitationUrl)
      setIsUrlCopied(true)
      setTimeout(() => setIsUrlCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy invitation URL:', err)
    }
  }, [roomId])

  const copyFullInvitation = async () => {
    try {
      const invitationUrl = `${window.location.origin}/video-chat/${roomId}`
      const currentTime = new Date().toLocaleString()
      
      const fullInvitation = `🎥 You're invited to join a video call!

${name} is inviting you to a video meeting.

📅 Meeting Details:
• Host: ${name}
• Time: ${currentTime}
• Room ID: ${roomId}

🔗 Join Meeting:
Click the link below to join instantly:
${invitationUrl}

📱 Or join manually:
1. Go to: ${window.location.origin}/room-setup
2. Enter Room ID: ${roomId}
3. Click "Join Room"

💡 Tips:
• Make sure your camera and microphone are working
• Use Chrome, Firefox, or Safari for the best experience
• Join from a quiet location for better audio quality

See you in the meeting! 👋`

      await navigator.clipboard.writeText(fullInvitation)
      setIsInvitationCopied(true)
      setTimeout(() => setIsInvitationCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy full invitation:', err)
    }
  }

  const removeParticipant = (streamId: string) => {
    // Find the participant to remove
    const participantToRemove = remoteNames.find(rn => rn.streamId === streamId);
    if (!participantToRemove) return;

    // Emit remove participant event to server
    socket.emit("remove-participant", {
      roomId: roomId,
      streamId: streamId,
      name: participantToRemove.name
    });

    // Remove from local state immediately for better UX
    setRemoteNames(prev => prev.filter(rn => rn.streamId !== streamId));
    setRemoteStream(prev => prev.filter(stream => stream.id !== streamId));
    
    // Close peer connection
    const userIdToRemove = participantToRemove.key;
    if (peerConnectionsRef.current[userIdToRemove]) {
      peerConnectionsRef.current[userIdToRemove].close();
      delete peerConnectionsRef.current[userIdToRemove];
    }
    
    // Remove from peers
    setPeers(prev => prev.filter(id => id !== userIdToRemove));
  }

  const hangupCall = useCallback(() => {
    // Stop all local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("Stopped local track:", track.kind);
      });
    }

    // Close all peer connections
    Object.entries(peerConnectionsRef.current).forEach(([userId, pc]) => {
      console.log("Closing peer connection for:", userId);
      pc.close();
    });

    // Clear all peer connections
    peerConnectionsRef.current = {};

    // Emit leave room event to server
    socket.emit("leave-room", {
      roomId: roomId,
      name: name,
      streamId: localStreamRef.current?.id
    });

    // Reset all states
    setIsConnected(false);
    setRemoteStream([]);
    setRemoteNames([]);
    setPeers([]);
    setMessages([]);
    
    // Redirect to room setup
    navigate("/room-setup");
  }, [roomId, name, navigate])

  // Memoized grid layout calculation with better stability
  const gridLayoutClasses = useMemo(() => {
    const totalUsers = remoteStream.length + 1;
    if (totalUsers === 1) return 'grid-cols-1 place-items-center';
    if (totalUsers === 2) return 'grid-cols-2 place-items-center';
    if (totalUsers === 3) return 'grid-cols-2';
    if (totalUsers === 4) return 'grid-cols-2';
    if (totalUsers <= 6) return 'grid-cols-3';
    return 'grid-cols-3';
  }, [remoteStream.length])

  // Memoized hand raised state
  const isHandRaised = useMemo(() => {
    return remoteNames.some((remoteName) => 
      remoteName.handRaised && remoteName.streamId === localStreamRef.current?.id
    );
  }, [remoteNames])
 


 

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
         <div className="h-full pt-24 pb-32 px-4 md:px-6 flex items-center justify-center">
           <div className="w-full max-w-[1200px] h-full flex items-center justify-center">
             <div className={`grid gap-6 w-full h-full max-h-[600px] p-4 auto-rows-fr ${gridLayoutClasses}`}>
               {/* Local Video */}
               <LocalVideoTile
                 key="local-video"
                 localVideoRef={localVideoRef}
                 name={name}
                 isCameraOn={isCameraOn}
                 isMicOn={isMicOn}
                 isScreenSharing={isScreenSharing}
                 isHandRaised={isHandRaised}
                 remoteStreamLength={remoteStream.length}
               />
             
               {/* Remote Videos */}
               {remoteStream.map((stream, index) => {
                 const totalUsers = remoteStream.length + 1;
                 const isThirdUserInOddGroup = totalUsers === 3 && index === 1;
                 const remoteName = remoteNames.find(rn => rn.streamId === stream.id);
                 
                 return (
                   <RemoteVideoTile
                     key={`remote-${stream.id}`}
                     stream={stream}
                     remoteName={remoteName}
                     isThirdUserInOddGroup={isThirdUserInOddGroup}
                   />
                 );
               })}
             </div>
           </div>
         </div>

         {/* Waiting for Users Popup - Only show when truly alone */}
         {remoteStream.length === 0 && isConnected && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
             <div className="bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 max-w-md mx-4 text-center space-y-6">
               <div className="w-16 h-16 mx-auto">
                 <div className="relative">
                   <div className="w-16 h-16 border-4 border-blue-500/30 rounded-full"></div>
                   <div className="absolute inset-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                 </div>
               </div>
               <div>
                 <h3 className="text-white text-xl font-semibold mb-2">Waiting for others to join...</h3>
                 <p className="text-gray-400 text-sm mb-4">Share the invitation with others to start the meeting</p>
                 
                 {/* Full Invitation Message */}
                 <div className="bg-gray-700/50 rounded-lg p-3 mb-3">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-gray-300 text-xs mb-1">Invite others</p>
                       <p className="text-gray-400 text-sm">Copy the full invitation</p>
                     </div>
                     <button
                       onClick={copyFullInvitation}
                       className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors duration-200 flex items-center gap-2 flex-shrink-0"
                     >
                       {isInvitationCopied ? (
                         <>
                           <Check className="w-4 h-4 text-green-400" />
                           <span className="text-green-400 text-sm">Copied!</span>
                         </>
                       ) : (
                         <>
                           <Copy className="w-4 h-4 text-green-400" />
                           <span className="text-green-400 text-sm">Copy Invitation</span>
                         </>
                       )}
                     </button>
                   </div>
                 </div>

                 {/* Individual Copy Options */}
                 <div className="bg-gray-700/50 rounded-lg p-3 space-y-3">
                   <div>
                     <p className="text-gray-300 text-xs mb-1">Room ID</p>
                     <div className="flex items-center justify-between">
                       <p className="text-blue-400 font-mono text-lg font-semibold">{roomId}</p>
                       <button
                         onClick={copyRoomId}
                         className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors duration-200 flex items-center gap-2 flex-shrink-0"
                       >
                         {isCopied ? (
                           <>
                             <Check className="w-4 h-4 text-green-400" />
                             <span className="text-green-400 text-sm">Copied!</span>
                           </>
                         ) : (
                           <>
                             <Copy className="w-4 h-4 text-blue-400" />
                             <span className="text-blue-400 text-sm">Copy ID</span>
                           </>
                         )}
                       </button>
                     </div>
                   </div>
                   <div>
                     <p className="text-gray-300 text-xs mb-1">Direct Link</p>
                     <div className="flex items-center justify-between">
                       <p className="text-blue-400 font-mono text-sm break-all mr-2">
                         {`${window.location.origin}/video-chat`}
                       </p>
                       <button
                         onClick={copyInvitationUrl}
                         className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors duration-200 flex items-center gap-2 flex-shrink-0"
                       >
                         {isUrlCopied ? (
                           <>
                             <Check className="w-4 h-4 text-green-400" />
                             <span className="text-green-400 text-sm">Copied!</span>
                           </>
                         ) : (
                           <>
                             <Copy className="w-4 h-4 text-blue-400" />
                             <span className="text-blue-400 text-sm">Copy URL</span>
                           </>
                         )}
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         )}

         {/* Bottom Control Bar */}
         <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/20 backdrop-blur-sm border-t border-white/10">
           <div className="flex items-center justify-between px-6 py-4">
             {/* Left side - Room Info */}
             <div className="flex items-center space-x-2 text-gray-300">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-sm">Connected to Room {roomId}</span>
             </div>
             
             {/* Center - Video Controls and Chat */}
             <div className="flex items-center space-x-3">
               <VideoControls
                 isCameraOn={isCameraOn}
                 isMicOn={isMicOn}
                 isScreenSharing={isScreenSharing}
                 toggleCamera={toggleCamera}
                 toggleMic={toggleMic}
                 toggleScreenShare={toggleScreenShare}
                 handleHandRaised={handleHandRaided}
                 hangupCall={hangupCall}
                 isHandRaised={isHandRaised}
               />
               
               {/* Chat Button */}
               {isConnected && (
                 <ChatButton
                   onMessagePannel={onMessagePannel}
                   setOnMesagePannel={setOnMesagePannel}
                   notification={notification}
                   sendMessage={sendMessage}
                   messages={messages}
                   newMessage={newMessage}
                   setNewMessage={setNewMessage}
                   messagesEndRef={messagesEndRef}
                   remoteNames={remoteNames}
                   socketId={socket.id || ''}
                 />
               )}
               
               {/* Participants Button */}
               {isConnected && (
                 <ParticipantsButton
                   remoteNames={remoteNames}
                   remoteStream={remoteStream}
                   name={name}
                   isCameraOn={isCameraOn}
                   isMicOn={isMicOn}
                   isScreenSharing={isScreenSharing}
                   isHandRaised={isHandRaised}
                   removeParticipant={removeParticipant}
                   localStreamRef={localStreamRef}
                 />
               )}
             </div>
             
             {/* Right side - Change Room Button */}
             <div className="flex items-center space-x-3">
               <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => navigate("/room-setup")}
                 className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg text-white transition-all duration-200"
               >
                 Change Room
               </motion.button>
             </div>
           </div>
         </div>
       </>
     )}

      </div>
  
    </>
  )
}, () => {
  // Custom comparison to prevent re-renders
  // Since this component has no props, it should never re-render from parent
  return true;
});

export { VideoChat };
