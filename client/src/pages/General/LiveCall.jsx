import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const socket = io(`${import.meta.env.VITE_SOCKET_BASE_URL}/general`, {
    transports: ["websocket"],
    withCredentials: true
});

export default function LiveCall() {
    const rideId = 'RFSN8K02Z3RI';
    const [callStatus, setCallStatus] = useState(null);
    const [caller, setCaller] = useState(null);
    const [profileImg, setProfileImg] = useState(null);
    const [stream, setStream] = useState(null);
    const audioRef = useRef(null);
    const peerConnection = useRef(null);
    const timerRef = useRef(null);

    socket.on("incomingCall", (data) => {
        setCaller(data?.message);
        setProfileImg(data?.profileImg);
        setCallStatus("Incoming call");
    });

    socket.on("callAccepted", async () => {
        setCallStatus("Connected");
        await startVoiceStream();
    });

    socket.on("callRejected", () => {
        setCallStatus("Rejected");
        setTimeout(() => setCallStatus(null), 3000);
    });

    socket.on("callEnded", () => {
        endCall();
    });

    // ✅ Listen for WebRTC signaling messages
    socket.on("webrtcOffer", async ({ offer }) => {
        try {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            socket.emit("webrtcAnswer", { rideId, answer });
        } catch (error) {
            console.error("Error handling WebRTC offer:", error);
        }
    });
    
    socket.on("webrtcAnswer", async ({ answer }) => {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    });
    
    socket.on("iceCandidate", ({ candidate }) => {
        console.log('CANDIDATE', candidate)
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    });






/**
 * 
useEffect(() => {
    const handleIncomingCall = (data) => {
        setCaller(data?.message);
        setProfileImg(data?.profileImg);
        setCallStatus("Incoming call");
    };

    const handleCallAccepted = async () => {
        setCallStatus("Connected");
        await startVoiceStream();
    };

    const handleCallRejected = () => {
        setCallStatus("Rejected");
        setTimeout(() => setCallStatus(null), 3000);
    };

    const handleCallEnded = () => {
        endCall();
    };

    socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callRejected", handleCallRejected);
    socket.on("callEnded", handleCallEnded);

    // ✅ Listen for WebRTC signaling messages
    socket.on("webrtcOffer", async ({ offer }) => {
        try {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            socket.emit("webrtcAnswer", { rideId, answer });
        } catch (error) {
            console.error("Error handling WebRTC offer:", error);
        }
    });

    socket.on("webrtcAnswer", async ({ answer }) => {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("iceCandidate", ({ candidate }) => {
        console.log('CANDIDATE', candidate)
        peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
    });

    return () => {
        socket.off("incomingCall", handleIncomingCall);
        socket.off("callAccepted", handleCallAccepted);
        socket.off("callRejected", handleCallRejected);
        socket.off("callEnded", handleCallEnded);
        socket.off("webrtcOffer");
        socket.off("webrtcAnswer");
        socket.off("iceCandidate");
    };
}, []);
*/

    const startCall = () => {
        const data = { rideId };
        socket.emit("callUser", data);

        setCallStatus("Ringing");

        timerRef.current = setTimeout(() => {
            if (callStatus === "Ringing") {
                socket.emit("endCall", data);
                setCallStatus("No Answer");
                setTimeout(() => setCallStatus(null), 3000);
            }
        }, 40000);
    };

    const acceptCall = async () => {
        setCallStatus("Connected");
        socket.emit("acceptCall", { rideId });
        await startVoiceStream();
    };

    const rejectCall = () => {
        socket.emit("rejectCall", { rideId });
        setCallStatus("Rejected");
        setTimeout(() => setCallStatus(null), 3000);
    };

    const startVoiceStream = async () => {
        try {
            const userStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(userStream);
            audioRef.current.srcObject = userStream;

            // Create a new WebRTC peer connection
            peerConnection.current = new RTCPeerConnection();

            // Add local audio track to WebRTC connection
            userStream.getTracks().forEach((track) => peerConnection.current.addTrack(track, userStream));

            // Send ICE candidates to the other peer
            peerConnection.current.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit("iceCandidate", { rideId, candidate: event.candidate });
                }
            };

            // Handle incoming audio stream from remote user
            peerConnection.current.ontrack = (event) => {
                audioRef.current.srcObject = event.streams[0];
            };

            // Create WebRTC offer
            const offer = await peerConnection.current.createOffer();
            await peerConnection.current.setLocalDescription(offer);

            // Send offer to the other user via Socket.IO
            socket.emit("startWebRTC", { rideId, offer });

        } catch (error) {
            console.error("Error accessing microphone:", error);
        }
    };

    const endCall = () => {
        socket.emit("endCall", { rideId });

        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }

        setCallStatus(null);
        setCaller(null);
    };

    return (
        <div className="voice-call">
            {callStatus === "Ringing" && <p>Ringing...</p>}
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
                    <p>Call in Progress...</p>
                    <button onClick={endCall}>End Call</button>
                </div>
            )}
            {callStatus === "Rejected" && <p>Call Rejected</p>}
            {callStatus === "No Answer" && <p>No Answer</p>}

            <audio ref={audioRef} autoPlay></audio>

            <button onClick={startCall}>Start Call</button>
        </div>
    );
}