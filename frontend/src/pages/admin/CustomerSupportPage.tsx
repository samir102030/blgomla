import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useUserStore } from "../../stores/user.store";
import { axiosInstance } from "../../lib/axios";

interface Conversation {
  _id: string;
  type: "general" | "product";
  participants: Array<{
    user: {
      _id: string;
      name: string;
      email: string;
      role: string;
      profilePicture?: string;
    };
    role: "customer" | "admin" | "vendor";
  }>;
  product?: {
    _id: string;
    name: string;
    images: string[];
  };
  store?: {
    _id: string;
    name: string;
  };
  lastMessage?: {
    _id: string;
    content: string;
    createdAt: string;
  };
  lastMessageAt: string;
  isActive: boolean;
}

interface Message {
  _id: string;
  sender: {
    _id?: string;
    name: string;
    email: string;
    role: string;
    profilePicture?: string;
  };
  content: string;
  createdAt: string;
  messageType: string;
  isRead: boolean;
  readAt?: string;
  attachments: any[];
}

const CustomerSupportPage: React.FC = () => {
  const { t } = useTranslation();
  const user = useUserStore((state) => state.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/chat/conversations");
        setConversations(response.data);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchConversations();
    }
  }, [user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user || sending) return;

    setSending(true);
    const messageToSend = newMessage;
    setNewMessage("");

    try {
      const response = await axiosInstance.post(
        `/chat/conversations/${selectedConversation._id}/messages`,
        {
          content: messageToSend,
        }
      );

      // Add the new message to the messages list
      setMessages((prev) => [...prev, response.data]);

      // Update the conversation's last message
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === selectedConversation._id
            ? {
                ...conv,
                lastMessage: response.data,
                lastMessageAt: new Date().toISOString(),
              }
            : conv
        )
      );
    } catch (error) {
      console.error("Error sending message:", error);
      // Restore the message if sending failed
      setNewMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    try {
      const response = await axiosInstance.get(
        `/chat/conversations/${conversation._id}/messages`
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] md:h-screen bg-gray-50 dark:bg-slate-950">
      {/* Conversations List */}
      <div className={`w-full md:w-1/3 bg-white dark:bg-slate-900 border-b md:border-b-0 md:border-r border-gray-200 dark:border-slate-800 flex flex-col ${selectedConversation ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-gray-200 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t("customerSupport.title")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {t("customerSupport.subtitle")}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500 dark:text-slate-400">
                {t("customerSupport.loadingConversations")}
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500 dark:text-slate-400">
                {t("customerSupport.noConversations")}
              </div>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => selectConversation(conversation)}
                className={`p-4 border-b border-gray-100 dark:border-slate-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/60 ${
                  selectedConversation?._id === conversation._id
                    ? "bg-[var(--brand-primary)]/10 border-l-4 border-l-blue-500 dark:bg-[var(--brand-primary)]/10 dark:border-l-blue-400"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
                      {conversation.participants
                        .find((p) => p.role === "customer")
                        ?.user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {
                          conversation.participants.find(
                            (p) => p.role === "customer"
                          )?.user.name
                        }
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {conversation.type === "general"
                          ? t("customerSupport.generalSupport")
                          : `${t("customerSupport.product")}: ${conversation.product?.name}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    {conversation.lastMessageAt
                      ? new Date(
                          conversation.lastMessageAt
                        ).toLocaleTimeString()
                      : ""}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                  {conversation.lastMessage?.content || t("customerSupport.noMessages")}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${selectedConversation ? "flex" : "hidden md:flex"}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-1 text-gray-600 dark:text-slate-400"
                  aria-label="Back"
                >
                  <svg className="w-5 h-5 ltr:rotate-0 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="w-10 h-10 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-white font-medium shrink-0">
                  {selectedConversation.participants
                    .find((p) => p.role === "customer")
                    ?.user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {
                      selectedConversation.participants.find(
                        (p) => p.role === "customer"
                      )?.user.name
                    }
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {selectedConversation.type === "general"
                      ? t("customerSupport.generalSupport")
                      : `${t("customerSupport.product")}: ${selectedConversation.product?.name}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                // Find the participant's role in the conversation
                const participant = selectedConversation.participants.find(
                  (p) => p.user._id === message.sender._id
                );
                const senderRole = participant?.role || message.sender.role;
                const isCurrentUser = message.sender._id === user?._id;

                // Determine message styling based on sender role
                const getMessageStyle = () => {
                  if (isCurrentUser) {
                    return "bg-[var(--brand-primary)] text-white dark:bg-[var(--brand-accent)]"; // Admin messages (current user)
                  }
                  switch (senderRole) {
                    case "customer":
                      return "bg-green-100 text-gray-900 border-l-4 border-green-500 dark:bg-emerald-500/15 dark:text-emerald-100 dark:border-emerald-400";
                    case "vendor":
                      return "bg-[var(--brand-primary)]/10 text-gray-900 border-l-4 border-[var(--brand-primary)] dark:bg-[var(--brand-primary)]/15 dark:text-white/90 dark:border-[var(--brand-primary)]";
                    case "admin":
                      return "bg-[var(--brand-primary)]/10 text-gray-900 border-l-4 border-[var(--brand-primary)] dark:bg-[var(--brand-primary)]/15 dark:text-white/90 dark:border-[var(--brand-primary)]";
                    default:
                      return "bg-gray-200 text-gray-900 dark:bg-slate-800 dark:text-slate-100";
                  }
                };

                const getRoleLabel = () => {
                  switch (senderRole) {
                    case "customer":
                      return t("customerSupport.roleCustomer");
                    case "vendor":
                      return t("customerSupport.roleStore");
                    case "admin":
                      return t("customerSupport.roleAdmin");
                    default:
                      return t("customerSupport.roleUnknown");
                  }
                };

                return (
                  <div
                    key={message._id}
                    className={`flex ${
                      isCurrentUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${getMessageStyle()}`}
                    >
                      {!isCurrentUser && (
                        <div className="flex items-center mb-1">
                          <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
                            {getRoleLabel()}: {message.sender.name}
                          </span>
                        </div>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isCurrentUser
                            ? "text-white/90"
                            : "text-gray-500 dark:text-slate-400"
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={t("customerSupport.typeMessage")}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] bg-white dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:border-slate-700"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-md hover:bg-[var(--brand-accent)] disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[var(--brand-accent)] dark:hover:bg-[var(--brand-primary)]"
                >
                  {sending ? t("customerSupport.sending") : t("customerSupport.send")}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400 dark:text-slate-500"
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
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t("customerSupport.selectConversation")}
              </h3>
              <p className="text-gray-500 dark:text-slate-400">
                {t("customerSupport.chooseConversation")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerSupportPage;
