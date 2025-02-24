import { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import { CallControls, SpeakerLayout, StreamCall, StreamTheme, StreamVideo, StreamVideoClient } from "@stream-io/video-react-sdk";
import { MyVideoUI } from "./MyVideoUI";
import "@stream-io/video-react-sdk/dist/css/styles.css";

const socket = io(`${import.meta.env.VITE_SOCKET_BASE_URL}/general`, {
    transports: ["websocket"],
    withCredentials: true,
});

export default function LiveCall() {
    const rideId = 'RFSN8K02Z3RI';
    const [callStatus, setCallStatus] = useState(null);
    const [caller, setCaller] = useState(null);
    const [profileImg, setProfileImg] = useState(null);
    const [callId, setCallId] = useState(null);
    const [client, setClient] = useState(null);
    const [call, setCall] = useState(null);
    const audioRef = useRef(null);

    // Initialize Stream.io client
    useEffect(() => {
        socket.on("callerToken", ({ token, callId }) => {
            console.log("Caller Token Received:", token, callId);
            const client = new StreamVideoClient({
                apiKey: import.meta.env.VITE_STREAM_KEY,
                token,
                user: { id: 'RFYHRTRXVMDR' }, // Replace with actual user ID
            });
            setClient(client);
            setCallId(callId);
        });

        socket.on("receiverToken", ({ token, callId }) => {
            console.log("Receiver Token Received:", token, callId);
            const client = new StreamVideoClient({
                apiKey: import.meta.env.VITE_STREAM_KEY,
                token,
                user: { id: 'RFY0V4BM8SPA' }, // Replace with actual user ID
            });
            setClient(client);
            setCallId(callId);
        });

        socket.on("incomingCall", (data) => {
            setCaller(data.message);
            setProfileImg(data.profileImg);
            setCallStatus("Incoming call");
            setCallId(data.callId);
        });

        socket.on("callAccepted", () => {
            setCallStatus("Connected");
        });

        socket.on("callEnded", () => {
            endCall();
        });

        return () => {
            socket.off("callerToken");
            socket.off("receiverToken");
            socket.off("incomingCall");
            socket.off("callAccepted");
            socket.off("callEnded");
        };
    }, []);
    
    // Join call when callId and client are set
    useEffect(() => {
        if (client && callId) {
            const call = client.call("default", callId, { audio: true, video: false });
            setCall(call);

            call.join()
                .then(() => {
                    console.log("Joined call successfully");
                    if (call.mediaStream) {
                        const audioTracks = call.mediaStream.getAudioTracks();
                        if (audioTracks.length > 0) {
                            audioRef.current.srcObject = new MediaStream(audioTracks);
                            audioRef.current.play();
                        } else {
                            console.error("No audio tracks found");
                        }
                    } else {
                        console.error("MediaStream is undefined");
                    }
                })
                .catch((error) => {
                    console.error("Failed to join call:", error);
                });
        }
    }, [client, callId]);

    // Start a call
    const startCall = () => {
        socket.emit("callUser", { rideId });
        setCallStatus("Ringing");
    };

    // Accept a call
    const acceptCall = () => {
        socket.emit("acceptCall", { rideId });
        setCallStatus("Connected");
    };

    // End the call
    const endCall = () => {
        socket.emit("endCall", { rideId });
        if (call) {
            call.leave();
            setCall(null);
        }
        setCallStatus(null);
        setCaller(null);
    };

    return (
        <div className="voice-call">
            {callStatus === "Ringing" && (
                <>
                    <p>Ringing...</p>
                    <button onClick={endCall}>End Call</button>
                </>
            ) }
            {callStatus === "Incoming call" && (
                <div>
                    <img src={profileImg} alt="Caller" className="profileImg" />
                    <p>{caller}</p>
                    <button onClick={acceptCall}>Accept</button>
                    <button onClick={endCall}>Reject</button>
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

            {
                client && call && (
                          <StreamVideo client={client}>
                            <StreamCall call={call}>
                                <StreamTheme>
                                    <SpeakerLayout />
                                    <CallControls />
                                </StreamTheme>
                            </StreamCall>
                          </StreamVideo>
                )
            }
            <audio ref={audioRef} autoPlay playsInline></audio>
            <button onClick={startCall}>Start Call</button>
        </div>
    );
}
