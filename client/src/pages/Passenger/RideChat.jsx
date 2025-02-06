import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const RideChat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Connect to passenger namespace
  const socket = io("http://localhost:10000/passenger", {
    transports: ["websocket"],
    withCredentials: true,
  });

  useEffect(() => {
    // Listen for new chat messages
    socket.on("chatWithPassenger", (data) => {
      console.log("New message from driver:", data);
      setMessages(data.message); // Replace chat history with latest messages
    });

    socket.on("chatWithDriver", (data) => {
      console.log("New message from passenger:", data);
      setMessages(data.message); // Replace chat history with latest messages
    });

    return () => {
      socket.off("chatWithPassenger");
      socket.off("chatWithDriver");
    };
  }, []);

  // Handle file selection
  const handleFileChange = (event) => {
    if (event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setMessage(""); // Prevent message input when file is selected
    }
  };

  // Handle text input
  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    setSelectedFile(null); // Prevent file selection when typing a message
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Convert file to buffer
  const getFileBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result); // This is the buffer
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsArrayBuffer(file); // Read the file as an array buffer
    });
  };

  // Send message or file via Socket.IO
  const sendMessage = async () => {
    if (!message.trim() && !selectedFile) {
      alert("Enter a message or select a file.");
      return;
    }
  
    let fileData = null;
    if (selectedFile) {
      const buffer = await getFileBuffer(selectedFile);
      fileData = {
        buffer, // The file buffer
        mimetype: selectedFile.type, // File MIME type (e.g., image/png, video/mp4)
        name: selectedFile.name, // Original file name
      };
    }
  
    const chatData = {
      rideId: 'RFSN8K02Z3RI',
      message: selectedFile ? "" : message.trim(),
      file: fileData, // Send file as an object
    };
  
    socket.emit("chatWithDriver", chatData);
  
    setMessage("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  socket.on("chatWithPassenger", (data) => {
    console.log("New message from driver:", data);
    setMessages(data.message); // Replace chat history with latest messages
  });

  socket.on("chatWithDriver", (data) => {
    console.log("New message from passenger:", data);
    setMessages(data.message); // Replace chat history with latest messages
  });

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto" }}>
      <div
        style={{
          height: "300px",
          overflowY: "scroll",
          border: "1px solid #ccc",
          padding: "10px",
        }}
      >
        {messages?.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: "10px",
              padding: "5px",
              background: "#f1f1f1",
              borderRadius: "5px",
            }}
          >
            <strong>{msg?.from}:</strong> {msg.message}
            {msg?.mediaLink && (
              <img
                src={msg?.mediaLink}
                alt=""
                style={{ width: "100px", marginTop: "5px" }}
              />
            )}
          </div>
        ))}
      </div>

      <input
        type="text"
        placeholder="Type your message..."
        value={message}
        onChange={handleMessageChange}
        disabled={selectedFile !== null} // Disable input if file is selected
        style={{
          width: "100%",
          padding: "10px",
          marginTop: "10px",
          borderRadius: "5px",
          border: "1px solid #ccc",
        }}
      />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={message.trim() !== ""} // Disable file input if message is entered
        style={{ marginTop: "10px" }}
      />

      <button
        onClick={sendMessage}
        style={{
          marginTop: "10px",
          padding: "10px",
          width: "100%",
          background: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
        }}
      >
        Send
      </button>
    </div>
  );
};

export default RideChat;
