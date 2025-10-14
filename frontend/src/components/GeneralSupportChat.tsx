import React, { useState, useEffect } from "react";
import { useUserStore } from "../stores/user.store";

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

const GeneralSupportChat: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !conversationId) {
      // Mock creating/getting conversation
      setConversationId("general-conversation-id");
      // Mock initial messages
      setMessages([
        {
          _id: "1",
          sender: { name: "Support Team", role: "admin" },
          content: "Hello! How can we help you today?",
          createdAt: new Date(Date.now() - 3600000),
        },
      ]);
    }
  }, [isOpen, conversationId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    const message: Message = {
      _id: Date.now().toString(),
      sender: {
        _id: user._id,
        name: user.name || "Customer",
        role: user.role,
      },
      content: newMessage,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");

    // Mock admin response after a delay
    setTimeout(() => {
      const adminResponse: Message = {
        _id: (Date.now() + 1).toString(),
        sender: { name: "Support Team", role: "admin" },
        content:
          "Thank you for your message. Our support team will assist you shortly!",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, adminResponse]);
    }, 2000);
  };

  // Only show for logged-in users who are customers
  if (!user || user.role !== "customer") {
    return null;
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-colors"
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
              d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-96 h-96 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col">
      {/* Chat Header */}
      <div className="p-4 bg-green-600 text-white rounded-t-lg flex items-center justify-between">
        <div>
          <h3 className="font-medium">General Support</h3>
          <p className="text-sm text-green-100">We're here to help!</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-green-200"
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
        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${
              message.sender._id === user?._id ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                message.sender._id === user?._id
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              <p>{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.sender._id === user?._id
                    ? "text-green-100"
                    : "text-gray-500"
                }`}
              >
                {new Date(message.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
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
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneralSupportChat;
