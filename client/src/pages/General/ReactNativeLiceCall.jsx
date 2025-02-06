import React, { useEffect, useState, useRef } from "react";
import { View, Text, Button, Image, PermissionsAndroid, Platform } from "react-native";
import { io } from "socket.io-client";
import { RTCPeerConnection, RTCView, mediaDevices } from "react-native-webrtc";

const socket = io("http://localhost:10000/general", { 
    transports: ["websocket"],
    withCredentials: true 
});

export default function LiveCall({ }) {
    const rideId = 'RFSN8K02Z3RI'
  const [callStatus, setCallStatus] = useState(null);
  const [caller, setCaller] = useState(null);
  const [profileImg, setProfileImg] = useState(null);
  const [stream, setStream] = useState(null);
  const peerConnection = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    socket.on("incomingCall", (data) => {
      setCaller(data?.message);
      setProfileImg(data?.profileImg);
      setCallStatus("Incoming call");
    });

    socket.on("callAccepted", async () => {
      setCallStatus("Connected");
      startVoiceStream();
    });

    socket.on("callRejected", () => {
      setCallStatus("Rejected");
      setTimeout(() => setCallStatus(null), 3000);
    });

    socket.on("callEnded", () => {
      endCall();
    });

    return () => {
      socket.off("incomingCall");
      socket.off("callAccepted");
      socket.off("callRejected");
      socket.off("callEnded");
    };
  }, []);

  const requestAudioPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn("Microphone permission denied");
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const startCall = async () => {
    const permissionGranted = await requestAudioPermission();
    if (!permissionGranted) return;

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
    startVoiceStream();
  };

  const rejectCall = () => {
    socket.emit("rejectCall", { rideId });
    setCallStatus("Rejected");
    setTimeout(() => setCallStatus(null), 3000);
  };

  const startVoiceStream = async () => {
    try {
      const userStream = await mediaDevices.getUserMedia({ audio: true });
      setStream(userStream);

      peerConnection.current = new RTCPeerConnection();
      userStream.getTracks().forEach((track) => peerConnection.current.addTrack(track, userStream));

      socket.emit("startWebRTC", { rideId });
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
    <View style={{ padding: 20, alignItems: "center" }}>
      {callStatus === "Ringing" && <Text>Ringing...</Text>}
      {callStatus === "Incoming call" && (
        <View>
          {profileImg && <Image source={{ uri: profileImg }} style={{ width: 80, height: 80, borderRadius: 40 }} />}
          <Text>{caller}</Text>
          <Button title="Accept" onPress={acceptCall} />
          <Button title="Reject" onPress={rejectCall} />
        </View>
      )}
      {callStatus === "Connected" && (
        <View>
          <Text>Call in Progress...</Text>
          <Button title="End Call" onPress={endCall} />
        </View>
      )}
      {callStatus === "Rejected" && <Text>Call Rejected</Text>}
      {callStatus === "No Answer" && <Text>No Answer</Text>}

      {stream && <RTCView streamURL={stream.toURL()} style={{ width: "100%", height: 200 }} />}
      <Button title="Start Call" onPress={startCall} />
    </View>
  );
}
