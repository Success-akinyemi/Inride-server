import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";

const socket = io(`${import.meta.env.VITE_SOCKET_BASE_URL}/general`, {
    transports: ["websocket"],
    withCredentials: true,
});

export default function LiveCall() {
    const rideId = 'RFSN8K02Z3RI';
    const [callStatus, setCallStatus] = useState(null);
    const [caller, setCaller] = useState(null);
    const [profileImg, setProfileImg] = useState(null);
    const [stream, setStream] = useState(null);
    const audioRef = useRef(null);
    const peerInstance = useRef(null); // PeerJS instance
    const currentCall = useRef(null); // Active call instance
    const timerRef = useRef(null);
    const [receiverPeerId, setReceiverPeerId] = useState(null); // Receiver's peerId

    // Initialize PeerJS
    useEffect(() => {
        const peer = new Peer(); // Generates a unique peerId
        peerInstance.current = peer;

        peer.on("open", (peerId) => {
            console.log("PeerJS connected with ID:", peerId);
            socket.emit("registerPeer", { rideId, peerId }); // Register peerId with the server
        });

        peer.on("call", (call) => {
            // Handle incoming call
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then((stream) => {
                    setStream(stream);
                    call.answer(stream); // Answer the call with the local stream
                    currentCall.current = call;

                    call.on("stream", (remoteStream) => {
                        if (audioRef.current) {
                            audioRef.current.srcObject = remoteStream; // Play remote audio
                        }
                        setCallStatus("Connected");
                    });
                })
                .catch((error) => {
                    console.error("Error accessing microphone:", error);
                });
        });

        peer.on("error", (error) => {
            console.error("PeerJS error:", error);
        });

        return () => {
            if (peerInstance.current) {
                peerInstance.current.destroy();
            }
        };
    }, []);

    // Handle incoming call notification
    socket.on("incomingCall", (data) => {
        setCaller(data?.message);
        setProfileImg(data?.profileImg);
        setCallStatus("Incoming call");
        setReceiverPeerId(data?.callerPeerId); // Store the caller's peerId
    });

    // Handle call accepted
    socket.on("callAccepted", () => {
        setCallStatus("Connected");
    });

    // Handle call rejected
    socket.on("callRejected", () => {
        setCallStatus("Rejected");
        setTimeout(() => setCallStatus(null), 3000);
    });

    // Handle call ended
    socket.on("callEnded", () => {
        endCall();
    });

    // Start a call
    const startCall = () => {
        socket.emit("callUser", { rideId });
        setCallStatus("Ringing");

        timerRef.current = setTimeout(() => {
            if (callStatus === "Ringing") {
                socket.emit("endCall", { rideId });
                setCallStatus("No Answer");
                setTimeout(() => setCallStatus(null), 3000);
            }
        }, 40000);
    };

    // Accept a call
    const acceptCall = async () => {
        setCallStatus("Connected");
        socket.emit("acceptCall", { rideId });

        // Initiate the call using the receiver's peerId
        if (receiverPeerId && peerInstance.current) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then((stream) => {
                    setStream(stream);
                    const call = peerInstance.current.call(receiverPeerId, stream); // Call the receiver
                    currentCall.current = call;

                    call.on("stream", (remoteStream) => {
                        if (audioRef.current) {
                            audioRef.current.srcObject = remoteStream; // Play remote audio
                        }
                    });
                })
                .catch((error) => {
                    console.error("Error accessing microphone:", error);
                });
        }
    };

    // Reject a call
    const rejectCall = () => {
        socket.emit("rejectCall", { rideId });
        setCallStatus("Rejected");
        setTimeout(() => setCallStatus(null), 3000);
    };

    // End the call
    const endCall = () => {
        socket.emit("endCall", { rideId });

        if (currentCall.current) {
            currentCall.current.close();
            currentCall.current = null;
        }

        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }

        setCallStatus(null);
        setCaller(null);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (currentCall.current) {
                currentCall.current.close();
            }
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

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

            <audio ref={audioRef} autoPlay playsInline></audio>

            <button onClick={startCall}>Start Call</button>
        </div>
    );
}