import { useState, useRef, useEffect, use } from 'react'
import { Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import { Mic, MicOff, Video, VideoOff, Send, Camera } from 'lucide-react'
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
import { useNavigate } from 'react-router'
import { MessageSquare } from 'lucide-react';
import { Label } from '@radix-ui/react-label'
import envConfig from '@/config'
const socket: Socket = io(envConfig.backendUrl)

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
      
      setPeers(prev => [...prev, userId])


      setRemoteNames(users)
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
      setPeers(prev => prev.filter(id => id !== userId))
      if (peerConnectionsRef.current[userId]) {
        peerConnectionsRef.current[userId].close()
        delete peerConnectionsRef.current[userId]
      }
    })

 

    socket.on("offer", async ({ offer, from}: SignalingMessage) => {
      console.log("Received offer from:", from, offer)
      if (!from || !offer) return
      const peerConnection = createPeerConnection(from)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      socket.emit("answer", { to: from, answer }) 
    console.log("Sending answer to:", from);
    })

    socket.on("answer", async ({ answer, from }: SignalingMessage) => {
      if (!from || !answer) return
      console.log("Received answer from:", from,name)
      const peerConnection = peerConnectionsRef.current[from]
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
      }
    })
    socket.on("ice-candidate", async ({ candidate, from  }: SignalingMessage) => {
      if (!from || !candidate) return
      console.log("Received ICE candidate from:", from, candidate)
    
      const peerConnection = peerConnectionsRef.current[from]
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      }
    })

    // Chat message handler
    socket.on("chat-message", (message: ChatMessage) => {
      console.log(message)
      setMessages(prev => [...prev, message])
      
    })

   
    return () => {
      socket.off("connect")
      socket.off("user-joined")
      socket.off("user-left")
      socket.off("offer")
      socket.off("answer")
      socket.off("ice-candidate")
      socket.off("chat-message")
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      // Close all peer connections
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close())
    }
  }, [])

  useEffect(()=>{
    if(isConnected && localStreamRef.current && localVideoRef.current){
      localVideoRef.current.srcObject = localStreamRef.current
    }
  },[isConnected])
// create connection 
  const createPeerConnection = (userId: string) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
    })

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!)
      })
    }
 
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const duplicateCandidate = JSON.stringify(event.candidate);
        const candidate = JSON.parse(duplicateCandidate);
        console.log("Sending ICE candidate to:", userId, candidate)
        socket.emit("ice-candidate", { to: userId, candidate })
      }
    } 

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log("r,n",event)
      //keep only unique streams
      const newStream = event.streams[0]
      
      setRemoteStream(prev => {
        if (prev.some(stream => stream.id === newStream.id)) return prev
        return [...prev, newStream]

      })
      setPeers(prev => {
        if (prev.some(id => id === userId)) return prev
        return [...prev, userId]
      }
      )
      
      
      
    }
    peerConnectionsRef.current[userId] = peerConnection
    return peerConnection
  }

  const joinRoom = async () => {
    if (!roomId) {
      alert("Please enter a room ID")
      return;
    }
    
    console.log("sending stream Id", localStreamRef.current?.id,localStreamRef)
  
    socket.emit("join-room", {roomId, name, streamId:localStreamRef.current?.id,handRaised:false, cameraStatus: localStreamRef.current?.getVideoTracks()[0].enabled,micStatus: localStreamRef.current?.getAudioTracks()[0].enabled})
    setIsConnected(true)
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

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket.id) return

    const message: ChatMessage = {
      name: name,
      sender: socket.id,
      content: newMessage,
      timestamp: Date.now()
    }

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
    
    <div className=" h-screen w-full flex gap-2 justify-center items-center p-4 align-middle">
     <div className="text-xl font-bold text-white absolute top-4 left-4 font-serif bg-pink-700 p-2 rounded-lg shadow-lg flex justify-center items-center"> 
      hello  {user?.userName} <span className="wave text-4xl">👋</span>
     </div>

     {!isConnected && ( 
    
       <motion.div
      initial={{ opacity: 0, y: 50 }}        // Start hidden and moved down
      animate={{ opacity: 1, y: 0 }}         // Animate into place
      transition={{ duration: 0.6, ease: "easeOut" }} // Timing
      whileHover={{ y: -8, scale: 1.02 }}    // Hover effect
      className="flex relative text-white bg-[rgb(17,23,60)] w-2/6 h-3/6 gap-4 flex-col justify-center items-center rounded-lg shadow-black shadow-lg"
    >
        {/* <h2 className="text-2xl font-bold text-center mb-4">Video Chat</h2> */}
        <h2 className="text-2xl absolute flex font-bold text-center mt-0 font-serif  top-1 p-4">VIDEO CHAT</h2>
      <form className='h-50% w-50%  flex justify-center align-middle flex-col' onSubmit={joinRoom}>
        <div className=' h-full w-full flex flex-col justify-center items-center p-2'>  
          <Label htmlFor="roomId" className="text-lg font-semibold mb-2">
           Enter Room ID 
          </Label>
        <Input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="border-2 border-gray-500 p-2 rounded-md w-full focus-visible:ring-0 focus-visible:border-pink-500 placeholder:text-black-500"
          disabled={isConnected}
        /></div>
        <div className=' h-full w-full flex flex-col justify-center items-center p-2'>
          <Label htmlFor="roomId" className="text-lg font-semibold mb-2">
           Enter Your Name 
          </Label>
        <Input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-2 border-gray-500 p-2 rounded-md w-full focus-visible:ring-0 focus-visible:border-pink-500"
        />
       
      </div>
      
      <div className=" h-full w-full flex gap-2 p-4 justify-center items-center">
        <Button onClick={joinRoom} disabled={isConnected}
        className='bg-blue-500 text-white hover:bg-blue-600 w-full'
        >
          {isConnected ? "Joined" : "Join Room"}
        </Button>
        </div>
      </form>
    
        </motion.div>)}
      {isConnected && (

      <div className="flex gap-4 h-full  flex-row  p-4  rounded-lg shadow-lg justify-center items-center align-middle">
        <div className="col-span-2 grid grid-cols-2 gap-4 w-3xl" >
          
            <div className=" relative   rounded-lg flex items-center justify-center border-[3px] border-solid border-red-500 h-96">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full rounded-lg bg-black h-full"
            />
            <div className="absolute bottom-4 left-4 flex gap-2">
              {name && (
                <>
                <div className="text-white bg-blue-500 rounded-full px-2 py-1 text-sm">{`${name}`}</div>
                <div className='text-white bg-blue-500 rounded-full px-2 py-1 text-s'>You</div>
                </>
              )}
              <Button
                variant={isCameraOn ? "default" : "destructive"}
                size="icon"
                onClick={toggleCamera}
              >
                {isCameraOn ? <Video /> : <VideoOff />}
              </Button>
              <Button
                variant={isMicOn ? "default" : "destructive"}
                size="icon"
                onClick={toggleMic}
              >
                {isMicOn ? <Mic /> : <MicOff />}
              </Button>
            
             
              <Button
                variant="default"
                size="icon"
                onClick={handleHandRaided}
           >
                <Hand className={remoteNames.find((remoteName) => (remoteName.handRaised) && (remoteName.streamId==localStreamRef.current?.id)) ? "fill-yellow-500" : "bg-transparent"} />
              </Button>
              
              
              {/* {remoteNames.map((remoteName)=>{
                if(remoteName.streamId === localStreamRef.current?.id){
                  return(
                    <div key={remoteName.key} className="text-white bg-blue-500 rounded-full px-2 py-1 text-sm">(You)</div>
                  )
                }
              })} */}
             
              {isConnected && (
             <Sheet onOpenChange={(open)=>{setOnMesagePannel(open)}}>
           
      <SheetTrigger asChild>
       <div className='relative'>
         <Button ><MessageSquare /></Button>
         {(notification && !onMessagePannel) && (
          <Circle className='absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full' />
         )}
       </div>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Chat Box</SheetTitle>
           </SheetHeader>
           {/* <div className="flex flex-col bg-gray-500  rounded-lg p-4 shadow-lg text-black overflow-hidden  "> */}
          <div className=" overflow-y-auto mb-4  h-[90%] mx-5">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-2 p-2 rounded-lg w-max ${
                  message.sender === socket.id
                    ? "bg-blue-500 text-white"
                    : "bg-white text-black "
                }`}
              >
                <div className="text-sm text-black-500">
                  {message.sender === socket.id ? "You" : `${message.name}`}
                </div>
                <div>{message.content}</div>
                <div className="text-xs text-gray-400">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {remoteNames.map((remoteName) => {
              if (remoteName.handRaised) {
                return (
                  <div key={remoteName.key} className="text-white bg-red-500 rounded-full px-2 py-1 text-sm">{`Hand Raised by ${remoteName.name} ✋`}</div>
                )
              }
              return null
            })
            }
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 w-full ">
            <Input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 mb-0 border rounded flex "
            />
            <Button type="submit" size="icon"
            onClick={sendMessage} 
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        {/* </div> */}
       
        
        <SheetFooter>
        
        </SheetFooter>
      </SheetContent>
    </Sheet>
    
              )}
                
             </div>
            
            
               
            </div>
            {remoteStream.length > 0 &&(
              <div>
          {remoteStream.map((stream, index) => {
            console.log("remote stream",stream)
            return (
            <div key={index} className="relative w-full bg-black   rounded-lg flex items-center justify-center border-[3px] border-solid border-red-500 h-96">
              <video
                autoPlay
                playsInline
                className="w-full rounded-lg bg-black h-full"
                ref={(video) => {
                  if (video) {
                    video.srcObject = stream
                  }
                 
                }}
              />
              <div className="absolute bottom-4 left-4 flex gap-2">
              {remoteNames.map((remoteName) => {
                console.log("REMOTE NAME",remoteName)
                if (remoteName.streamId === stream.id) {
                  return (
                    <>
                    <div key={remoteName.key} className="text-white bg-blue-500 rounded-full px-2 py-1 text-sm">{`${remoteName.name}`}</div>
                    
                 {remoteName.cameraStatus == false && (
                    <div className=' bottom-4 left-2 bg-red-600 flex gap-2 px-2 py-1' ><VideoOff/></div>
                  ) }

                  <Hand className={remoteName.handRaised ? "fill-yellow-500":"bg-transparent" }/>
                   {remoteName.micStatus == false && (
                    <div className=' bottom-4 left-2 bg-red-900 flex gap-2 px-2 py-1' ><MicOff/></div>
                  ) }
                    </>
                  )
                }
                return null
              })}
             
              </div>
            </div>

            )
          }
          )}
          </div>
            )}
        </div>
        </div>
)}

      
       <div className='bottom-4 right-4 absolute flex flex-col gap-2'>
         <Button
          variant="destructive"
          onClick={() => {
            dispatch(logout({}))
            navigate("/")
          }}
        >
          Logout
        </Button>
       </div>
      </div>
  
    </>
  )
}
