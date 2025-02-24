import {
    StreamCall,
    StreamVideo,
    StreamVideoClient,
  } from "@stream-io/video-react-sdk";
  import { MyVideoUI } from "./MyVideoUI";
  
  const apiKey = "vjw8jjkqz6z8";
  const userId = "RFYHRTRXVMDR";
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiUkZZSFJUUlhWTURSIiwidmFsaWRpdHlfaW5fc2Vjb25kcyI6MzYwMCwiaWF0IjoxNzQwMzkyNzExLCJleHAiOjE3NDAzOTYzMTF9.mKFlvQUBPKWL47lvswf2p-JvTgk1DDVCXtWfuRylo4s";
  const user = { id: userId };
  
  const client = new StreamVideoClient({ apiKey, user, token });
  const call = client.call("default", "my-first-call");
  call.join({ create: true });
  
  export const MyApp = () => {
    return (
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <MyVideoUI />
        </StreamCall>
      </StreamVideo>
    );
  };
  