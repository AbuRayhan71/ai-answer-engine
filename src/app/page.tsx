"use client";

import { useState, useEffect } from "react";

type Message = {
  role: "user" | "ai";
  content: string; // Store only plain text here
  sources?: { url: string; description: string }[];
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load conversation from URL
  useEffect(() => {
    const savedConversation = new URLSearchParams(window.location.search).get(
      "conversation"
    );
    if (savedConversation) {
      try {
        const parsedMessages = JSON.parse(decodeURIComponent(savedConversation));
        setMessages(parsedMessages);
      } catch (error) {
        console.error("Failed to parse conversation:", error);
      }
    } else {
      // Initialize with default message if no conversation exists
      setMessages([{ role: "ai", content: "How can I assist you today? 😊" }]);
    }
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      const aiMessage: Message = {
        role: "ai",
        content: data.aiResponse,
        sources: data.citations?.map((citation: { url: string }) => ({
          url: citation.url,
          description: citation.url, // Optional: Adjust this for better readability
        })),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "Oops! Something went wrong. Please try again. 🙇",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    const encodedConversation = encodeURIComponent(JSON.stringify(messages));
    const shareableURL = `${window.location.origin}?conversation=${encodedConversation}`;
    navigator.clipboard.writeText(shareableURL);
    alert("Conversation link copied to clipboard!");
  };

  const formatContentWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) =>
      urlRegex.test(part) ? (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          {part}
        </a>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-gray-100">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-white tracking-wide font-mono">AI Nexus</h1>
          <button
            onClick={handleShare}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-semibold"
          >
            Share Conversation
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-4 ${
                msg.role === "ai" ? "justify-start" : "justify-end flex-row-reverse"
              }`}
            >
              <div
                className={`p-4 rounded-lg shadow-lg max-w-[75%] leading-relaxed text-sm md:text-base font-mono ${
                  msg.role === "ai" ? "bg-blue-500 text-white" : "bg-purple-700 text-white"
                }`}
              >
                <p>{msg.role === "ai" ? formatContentWithLinks(msg.content) : msg.content}</p>
                {msg.sources && (
                  <div className="mt-4">
                    <p className="font-semibold">Sources:</p>
                    <ul className="list-disc pl-5 text-gray-200">
                      {msg.sources.map((source, idx) => (
                        <li key={idx}>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {source.description}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-700 text-gray-200">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Container */}
      <div className="fixed bottom-0 w-full bg-gray-800 p-4 shadow-inner">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1 p-3 rounded-xl bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Type your message..."
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
