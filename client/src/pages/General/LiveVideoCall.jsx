import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:10000/general", { 
    transports: ["websocket"],
    withCredentials: true 
});

export default function LiveVideoCall() {
  const rideId = 'RFSN8K02Z3RI';
  const [callStatus, setCallStatus] = useState(null);
  const [caller, setCaller] = useState(null);
  const [profileImg, setProfileImg] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  //SOCKETS
  socket.on("incomingVideoCall", (data) => {
    console.log('INCOMING CALL', data)
    setCaller(data?.message);
    setProfileImg(data?.profileImg);
    setCallStatus("Incoming call");
  });

  socket.on("videoCallAccepted", async () => {
    setCallStatus("Connected");
    await startWebRTC();
  });

  socket.on("rejectVideoCall", () => {
    setCallStatus("Rejected");
    setTimeout(() => setCallStatus(null), 3000);
  });

  socket.on("videoCallEnded", () => {
    endCall();
  });

  socket.on("videoCallOffer", async (offer) => {
    if (!peerConnection.current) {
      await startWebRTC();
    }
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);
    socket.emit("answerVideoCall", { rideId, answer });
  });

  socket.on("answerVideoCall", async (answer) => {
    await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on("videoCallIceCandidate", async (candidate) => {
    if (peerConnection.current) {
      await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  });

  useEffect(() => {
    socket.on("incomingVideoCall", (data) => {
      setCaller(data?.message);
      setProfileImg(data?.profileImg);
      setCallStatus("Incoming call");
    });

    socket.on("videoCallAccepted", async () => {
      setCallStatus("Connected");
      await startWebRTC();
    });

    socket.on("videoCallRejected", () => {
      setCallStatus("Rejected");
      setTimeout(() => setCallStatus(null), 3000);
    });

    socket.on("rejectVideoCall", () => {
      endCall();
    });

    socket.on("videoCallOffer", async (offer) => {
      if (!peerConnection.current) {
        await startWebRTC();
      }
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);
      socket.emit("answerVideoCall", { rideId, answer });
    });

    socket.on("answerVideoCall", async (answer) => {
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("videoCallIceCandidate", async (candidate) => {
      if (peerConnection.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      socket.off("incomingVideoCall");
      socket.off("videoCallAccepted");
      socket.off("videoCallRejected");
      socket.off("videoCallEnded");
      socket.off("videoCallOffer");
      socket.off("answerVideoCall");
      socket.off("videoCallIceCandidate");
    };
  }, []);

  const startCall = () => {
    socket.emit("videocallUser", { rideId });
    setCallStatus("Ringing");
  };

  socket.on('videocallUser', (data) => {
    console.log('videocallUser', data)
  })

  const acceptCall = async () => {
    setCallStatus("Connected");
    socket.emit("acceptVideoCall", { rideId });
    await startWebRTC();
  };

  const rejectCall = () => {
    socket.emit("rejectVideoCall", { rideId });
    setCallStatus("Rejected");
    setTimeout(() => setCallStatus(null), 3000);
  };

  const startWebRTC = async () => {
    if (peerConnection.current) return; // Prevent duplicate WebRTC connections

    try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        localVideoRef.current.srcObject = localStream.current;

        peerConnection.current = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        localStream.current.getTracks().forEach((track) => peerConnection.current.addTrack(track, localStream.current));

        peerConnection.current.ontrack = (event) => {
            remoteVideoRef.current.srcObject = event.streams[0];
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("videoCallIceCandidate", { rideId, candidate: event.candidate });
            }
        };

        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        socket.emit("videoCallOffer", { rideId, offer });

    } catch (error) {
        console.error("Error accessing camera/microphone:", error);
    }
};


const endCall = () => {
    socket.emit("endVideoCall", { rideId });

    if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
    }

    if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
    }

    setCallStatus(null);
    setCaller(null);
};

  return (
    <div className="video-call">
      {callStatus === "Incoming call" && (
        <div>
          <img src={profileImg} alt="Caller" className="profileImg" />
          <p>{caller}</p>
          <button onClick={acceptCall}>Accept</button>
          <button onClick={rejectCall}>Reject</button>
        </div>
      )}
      {callStatus === "Connected" && (
        <div>
          <p>Video Call in Progress...</p>
          <video ref={localVideoRef} autoPlay muted></video>
          <video ref={remoteVideoRef} autoPlay></video>
          <button onClick={endCall}>End Call</button>
        </div>
      )}
      <button onClick={startCall}>Start Call</button>
    </div>
  );
}
