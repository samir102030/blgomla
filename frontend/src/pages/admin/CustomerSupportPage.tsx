import React, { useState, useEffect } from "react";
import { useUserStore } from "../../stores/user.store";

interface Conversation {
  _id: string;
  type: "general" | "product";
  participants: Array<{
    user: {
      name: string;
      role: string;
    };
    role: "customer" | "admin" | "vendor";
  }>;
  product?: {
    name: string;
  };
  lastMessage?: {
    content: string;
    createdAt: Date;
  };
  lastMessageAt: Date;
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

const CustomerSupportPage: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Mock data for now - will be replaced with API calls
  useEffect(() => {
    // Fetch conversations
    setConversations([
      {
        _id: "1",
        type: "general",
        participants: [
          { user: { name: "John Doe", role: "customer" }, role: "customer" },
          { user: { name: "Admin", role: "admin" }, role: "admin" },
        ],
        lastMessage: {
          content: "Hello, I need help with my order",
          createdAt: new Date(),
        },
        lastMessageAt: new Date(),
      },
      {
        _id: "2",
        type: "product",
        product: { name: "iPhone 15 Pro" },
        participants: [
          { user: { name: "Jane Smith", role: "customer" }, role: "customer" },
          { user: { name: "Apple Store", role: "vendor" }, role: "vendor" },
        ],
        lastMessage: {
          content: "When will this be back in stock?",
          createdAt: new Date(),
        },
        lastMessageAt: new Date(),
      },
    ]);
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;

    // Mock sending message
    const message: Message = {
      _id: Date.now().toString(),
      sender: {
        _id: user._id,
        name: user.name || "Admin",
        role: user.role,
      },
      content: newMessage,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");
  };

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    // Mock messages for selected conversation
    setMessages([
      {
        _id: "1",
        sender: { name: "John Doe", role: "customer" },
        content: "Hello, I need help with my order",
        createdAt: new Date(Date.now() - 3600000),
      },
      {
        _id: "2",
        sender: { name: "Admin", role: "admin" },
        content:
          "Hi John, I'd be happy to help. What's the issue with your order?",
        createdAt: new Date(Date.now() - 1800000),
      },
    ]);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Conversations List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Customer Support
          </h2>
          <p className="text-sm text-gray-600">Manage customer conversations</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <div
              key={conversation._id}
              onClick={() => selectConversation(conversation)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedConversation?._id === conversation._id
                  ? "bg-blue-50 border-l-4 border-l-blue-500"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {conversation.participants
                      .find((p) => p.role === "customer")
                      ?.user.name.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">
                      {
                        conversation.participants.find(
                          (p) => p.role === "customer"
                        )?.user.name
                      }
                    </p>
                    <p className="text-xs text-gray-500">
                      {conversation.type === "general"
                        ? "General Support"
                        : `Product: ${conversation.product?.name}`}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(conversation.lastMessageAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 truncate">
                {conversation.lastMessage?.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {selectedConversation.participants
                    .find((p) => p.role === "customer")
                    ?.user.name.charAt(0)}
                </div>
                <div className="ml-3">
                  <h3 className="font-medium text-gray-900">
                    {
                      selectedConversation.participants.find(
                        (p) => p.role === "customer"
                      )?.user.name
                    }
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.type === "general"
                      ? "General Support"
                      : `Product: ${selectedConversation.product?.name}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${
                    message.sender._id === user?._id
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender._id === user?._id
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
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
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
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
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-500">
                Choose a customer conversation from the list to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerSupportPage;
