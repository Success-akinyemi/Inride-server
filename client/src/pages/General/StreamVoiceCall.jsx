import {
    StreamCall,
    StreamVideo,
    StreamVideoClient,
  } from "@stream-io/video-react-sdk";
  import { MyVideoUI } from "./MyVideoUI";
  
  const apiKey = "vjw8jjkqz6z8";
  const userId = "1368151";
  const token = "ujb9j6yrdtrrsxyk9us2t7hh9c6v26n6axz67mcbktc9mxnn28f4pmf3khfxzmbw";
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
  