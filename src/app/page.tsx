"use client";

import { useState } from "react";

type Message = {
  role: "user" | "ai";
  content: string;
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hi there! How can I assist you today? 😊" },
  ]);
  const [isLoading, setIsLoading] = useState(false);

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
      const aiMessage: Message = { role: "ai", content: data.aiResponse };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "Oops! Something went wrong. Please try again. 😓",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 shadow-md">
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="text-2xl font-bold text-center">Research GPT</h1>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto py-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "ai" ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`px-4 py-3 rounded-3xl max-w-[75%] text-sm whitespace-pre-wrap ${
                  msg.role === "ai"
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-green-600 text-white shadow-md"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 px-4 py-3 rounded-3xl bg-indigo-600 text-white shadow-md">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Container */}
      <div className="fixed bottom-0 w-full bg-gray-800 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-full bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Type your message here..."
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="px-6 py-3 rounded-full bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:bg-gray-500 transition"
          >
            {isLoading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
