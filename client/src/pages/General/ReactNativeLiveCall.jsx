import React, { useState, useRef, useEffect } from "react";
import { View, Text, Button, Image, StyleSheet } from "react-native";
import { io } from "socket.io-client";
import {
  StreamVideo,
  StreamCall,
  CallControls,
  SpeakerLayout,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";
import { Audio } from "expo-av";

const socket = io(`${process.env.SOCKET_BASE_URL}/general`, {
  transports: ["websocket"],
  withCredentials: true,
});

export default function LiveCall() {
  const rideId = "RFSN8K02Z3RI";
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
        apiKey: process.env.STREAM_KEY,
        token,
        user: { id: "RFY0V4BM8SPA" }, // Replace with actual user ID
      });
      setClient(client);
      setCallId(callId);
    });

    socket.on("receiverToken", ({ token, callId }) => {
      console.log("Receiver Token Received:", token, callId);
      const client = new StreamVideoClient({
        apiKey: process.env.STREAM_KEY,
        token,
        user: { id: "RFYHRTRXVMDR" }, // Replace with actual user ID
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

      call
        .join()
        .then(async () => {
          console.log("Joined call successfully");
          const { sound } = await Audio.Sound.createAsync(
            { uri: call.mediaStream.getAudioTracks()[0] },
            { shouldPlay: true }
          );
          audioRef.current = sound;
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
    if (audioRef.current) {
      audioRef.current.unloadAsync();
    }
    setCallStatus(null);
    setCaller(null);
  };

  return (
    <View style={styles.container}>
      {callStatus === "Ringing" && (
        <>
          <Text>Ringing...</Text>
          <Button title="End Call" onPress={endCall} />
        </>
      )}
      {callStatus === "Incoming call" && (
        <View>
          <Image source={{ uri: profileImg }} style={styles.profileImg} />
          <Text>{caller}</Text>
          <Button title="Accept" onPress={acceptCall} />
          <Button title="Reject" onPress={endCall} />
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

      {client && call && (
        <StreamVideo client={client}>
          <StreamCall call={call}>
            <SpeakerLayout />
            <CallControls />
          </StreamCall>
        </StreamVideo>
      )}

      <Button title="Start Call" onPress={startCall} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  profileImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
});

/***
 * 
 * 
 * npm install @stream-io/video-react-native-sdk socket.io-client expo-av
 * 
 * FOR ANDRIOD
 * Add the following permissions to your app.json or AndroidManifest.xml and Info.plist:
 * <uses-permission android:name="android.permission.RECORD_AUDIO" />
 * <uses-permission android:name="android.permission.CAMERA" />
 * 
 * FOR IOS
 * <key>NSMicrophoneUsageDescription</key>
*  <string>We need access to your microphone for audio calls.</string>
*  <key>NSCameraUsageDescription</key>
*  <string>We need access to your camera for video calls.</string>
 */