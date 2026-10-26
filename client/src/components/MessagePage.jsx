import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { MessageSquare } from "lucide-react";
import { serverUrl } from "../App";
import ChatList from "./ChatList";
import ChatBox from "./ChatBox";
import { socket } from "../socket";

const MessagePage = () => {
  const { user } = useSelector((state) => state.user);
  const { id } = useParams();

  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const { data } = await axios.get(
        `${serverUrl}/api/message/conversations`,
        { withCredentials: true }
      );
      if (data?.success) {
        setConversations(data.conversations || []);

        // If route has :id, select or create that conversation
        if (id) {
          const found = data.conversations.find((conv) =>
            conv.participants?.some((p) => p._id?.toString() === id.toString())
          );

          if (found) {
            setSelectedChat(found);
          } else {
            const { data: convData } = await axios.post(
              `${serverUrl}/api/message/conversation/${id}`,
              {},
              { withCredentials: true }
            );
            if (convData?.conversation) {
              setSelectedChat(convData.conversation);
              setConversations((prev) => [convData.conversation, ...prev]);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [id]);

  // Online users socket listener
  useEffect(() => {
    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    socket.on("getOnlineUsers", handleOnlineUsers);
    return () => socket.off("getOnlineUsers", handleOnlineUsers);
  }, []);

  // Update conversation list on new message
  useEffect(() => {
    const handleNewMessage = () => {
      fetchConversations();
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, []);

  const getOtherUser = (conversation) => {
    if (!conversation?.participants) return null;
    return conversation.participants.find(
      (p) => p._id?.toString() !== user?._id?.toString()
    );
  };

  return (
    <div className="messages-layout-container">
      {/* Left Chat List Panel */}
      <ChatList
        className={selectedChat ? "mobile-hidden" : ""}
        conversations={conversations}
        setConversations={setConversations}
        currentUser={user}
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        onlineUsers={onlineUsers}
        getOtherUser={getOtherUser}
      />

      {/* Right Chat Box Panel */}
      {selectedChat ? (
        <ChatBox
          key={selectedChat._id}
          conversation={selectedChat}
          currentUser={user}
          otherUser={getOtherUser(selectedChat)}
          onlineUsers={onlineUsers}
          onBack={() => setSelectedChat(null)}
        />
      ) : (
        <div className="no-chat-selected-screen">
          <div className="no-chat-inner">
            <div className="no-chat-icon-circle">
              <MessageSquare size={48} color="#84cc16" />
            </div>
            <h2>Your Direct Messages</h2>
            <p>
              Send private photos and messages to a friend or creator on Lime.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagePage;
