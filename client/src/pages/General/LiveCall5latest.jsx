import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io(`${import.meta.env.VITE_SOCKET_BASE_URL}/general`, {
    transports: ["websocket"],
    withCredentials: true,
});

export default function LiveCall5latest() {
    const rideId = 'RFSN8K02Z3RI';
    const [callStatus, setCallStatus] = useState(null);
    const [caller, setCaller] = useState(null);
    const [profileImg, setProfileImg] = useState(null);
    const [stream, setStream] = useState(null);
    const audioRef = useRef(null);
    const peerConnection = useRef(null);
    const timerRef = useRef(null);

    // Ensure peer connection is set up
    const ensurePeerConnection = () => {
        if (!peerConnection.current) {
            peerConnection.current = new RTCPeerConnection();

            peerConnection.current.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log("Sending ICE Candidate:", event.candidate);
                    socket.emit("iceCandidate", { rideId, candidate: event.candidate });
                }
            };

            peerConnection.current.ontrack = (event) => {
                console.log("Received remote track:", event.streams);
                if (audioRef.current) {
                    audioRef.current.srcObject = event.streams[0]; // Play remote audio
                }
            };

            peerConnection.current.queuedIceCandidates = [];

            peerConnection.current.onconnectionstatechange = () => {
                console.log("WebRTC Connection State:", peerConnection.current.connectionState);
                if (peerConnection.current.connectionState === "connected") {
                    setCallStatus("Connected");
                }
            };
        }
    };

    // Handle incoming call
    socket.on("incomingCall", (data) => {
        setCaller(data?.message);
        setProfileImg(data?.profileImg);
        setCallStatus("Incoming call");
    });

    // Handle call accepted
    socket.on("callAccepted", async () => {
        setCallStatus("Connected");
        await startVoiceStream();
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

    // Handle WebRTC offer
    socket.on("webrtcOffer", async ({ offer }) => {
        console.log("Received WebRTC offer:", offer);
        ensurePeerConnection();
        if (!peerConnection.current) {
            console.error("PeerConnection not initialized.");
            return;
        }
    
        try {
            // Set the remote description
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(offer));
            console.log("Remote description set successfully.");
    
            // Create and send an answer
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            console.log("Created WebRTC answer:", answer);
    
            // Send the answer back to the caller
            socket.emit("webrtcAnswer", { rideId, answer });
            console.log("WebRTC answer sent to caller.");
    
            // Process any queued ICE candidates
            processQueuedIceCandidates();
        } catch (error) {
            console.error("Error handling WebRTC offer:", error);
        }
    });

    // Handle WebRTC answer
    socket.on("webrtcAnswer", async ({ answer }) => {
        console.log("Received WebRTC answer:", answer);
        ensurePeerConnection();
        if (!peerConnection.current) {
            console.error("PeerConnection not initialized.");
            return;
        }


        try {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
            console.log("Remote description set successfully.");
        } catch (error) {
            console.error("Error setting remote description:", error);
            console.error("Offer:", offer); // Log the offer for debugging
        }
    });

    // Handle ICE candidates
    socket.on("iceCandidate", async ({ candidate }) => {
        console.log("Received ICE candidate:", candidate);
        ensurePeerConnection();
    
        if (!peerConnection.current.remoteDescription || !peerConnection.current.remoteDescription.type) {
            console.warn("Remote description is not set yet. Storing candidate for later.");
            peerConnection.current.queuedIceCandidates.push(candidate);
            return;
        }
    
        try {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("ICE candidate added successfully.");
        } catch (error) {
            console.error("Error adding ICE candidate:", error);
        }
    });

    // Process queued ICE candidates
    const processQueuedIceCandidates = () => {
        if (peerConnection.current?.queuedIceCandidates?.length) {
            console.log("Processing stored ICE candidates...");
            peerConnection.current.queuedIceCandidates.forEach(async (candidate) => {
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                    console.log("Stored ICE candidate added.");
                } catch (error) {
                    console.error("Error adding stored ICE candidate:", error);
                }
            });
            peerConnection.current.queuedIceCandidates = [];
        }
    };

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
        await startVoiceStream();
    };

    // Reject a call
    const rejectCall = () => {
        socket.emit("rejectCall", { rideId });
        setCallStatus("Rejected");
        setTimeout(() => setCallStatus(null), 3000);
    };

    // Start voice stream
    const startVoiceStream = async () => {
        try {
            const userStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(userStream);
            console.log("User media stream started.");
    
            ensurePeerConnection();
    
            userStream.getTracks().forEach((track) => {
                peerConnection.current.addTrack(track, userStream);
                console.log("Added track:", track);
            });
    
            const offer = await peerConnection.current.createOffer();
            console.log("Created WebRTC offer:", offer); // Log the offer
            await peerConnection.current.setLocalDescription(offer);
    
            socket.emit("startWebRTC", { rideId, offer });
        } catch (error) {
            console.error("Error accessing microphone:", error);
        }
    };

    // End the call
    const endCall = () => {
        socket.emit("endCall", { rideId });
    
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
    
        setCallStatus(null);
        setCaller(null);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (peerConnection.current) {
                peerConnection.current.close();
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