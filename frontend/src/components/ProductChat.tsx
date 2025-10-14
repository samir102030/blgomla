import React, { useState, useEffect, useCallback } from "react";
import { useUserStore } from "../stores/user.store";
import { axiosInstance } from "../lib/axios";

interface ProductChatProps {
  productId: string;
  productName: string;
}

interface Message {
  _id: string;
  sender: {
    _id?: string;
    name: string;
    role: string;
  };
  content: string;
  createdAt: Date;
}

interface Conversation {
  _id: string;
  type: string;
  participants: Array<{
    user: {
      _id: string;
      name: string;
      role: string;
    };
    role: string;
  }>;
  product?: string;
  store?: string;
}

const ProductChat: React.FC<ProductChatProps> = ({
  productId,
  productName,
}) => {
  const user = useUserStore((state: any) => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await axiosInstance.get(
        `/chat/conversations/${conversationId}/messages`
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, []);

  const initializeConversation = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.post("/chat/conversations", {
        type: "product",
        productId,
      });
      setConversation(response.data);

      // Fetch messages for this conversation
      await fetchMessages(response.data._id);
    } catch (error) {
      console.error("Error initializing conversation:", error);
      // Fallback to mock data if API fails
      setConversation({ _id: "mock-conversation-id" } as Conversation);
      setMessages([
        {
          _id: "1",
          sender: { name: "Store Support", role: "vendor" },
          content: `Hello! How can I help you with ${productName}?`,
          createdAt: new Date(Date.now() - 3600000),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [productId, productName, fetchMessages]);

  useEffect(() => {
    if (isOpen && !conversation && productId && !loading) {
      initializeConversation();
    }
  }, [isOpen, conversation, productId, loading, initializeConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !conversation) return;

    const tempMessage: Message = {
      _id: Date.now().toString(),
      sender: {
        _id: user._id,
        name: user.name || "Customer",
        role: user.role,
      },
      content: newMessage,
      createdAt: new Date(),
    };

    // Optimistically add message to UI
    setMessages((prev) => [...prev, tempMessage]);
    const messageToSend = newMessage;
    setNewMessage("");

    try {
      const response = await axiosInstance.post(
        `/chat/conversations/${conversation._id}/messages`,
        {
          content: messageToSend,
        }
      );

      // Replace temp message with real message from server
      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempMessage._id ? response.data : msg))
      );
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove temp message on error
      setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id));
      setNewMessage(messageToSend); // Restore the message
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-96 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col">
      {/* Chat Header */}
      <div className="p-4 bg-blue-600 text-white rounded-t-lg flex items-center justify-between">
        <div>
          <h3 className="font-medium">Product Support</h3>
          <p className="text-sm text-blue-100">{productName}</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-blue-200"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading conversation...</div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${
                message.sender._id === user?._id
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  message.sender._id === user?._id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                <p>{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.sender._id === user?._id
                      ? "text-blue-100"
                      : "text-gray-500"
                  }`}
                >
                  {new Date(message.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductChat;
