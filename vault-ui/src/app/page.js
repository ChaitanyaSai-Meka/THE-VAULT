"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, FileText, Plus, Moon, Sun } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "ai", content: "I am The Vault. Upload a document or ask me anything." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });

      const data = await res.json();
      
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: data.response, source: data.source }
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "ai", content: "Error connecting to The Vault." }]);
    }
    setLoading(false);
  };

  const handleTextUpload = async () => {
    const text = prompt("Paste text to add to The Vault's memory:");
    if (!text) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/upload/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", content: data.message }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "ai", content: "Error uploading note." }]);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/upload/pdf`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", content: data.message }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "ai", content: "Error uploading PDF." }]);
    }
    setLoading(false);
  };

  return (
    <div className={`flex flex-col h-screen font-sans transition-colors ${
      isDark ? "bg-black text-white" : "bg-white text-black"
    }`}>
      <header className={`flex items-center justify-between px-6 py-4 border-b ${
        isDark ? "border-gray-800" : "border-gray-200"
      }`}>
        <h1 className="text-xl font-bold tracking-wide">THE VAULT</h1>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? "hover:bg-gray-900" : "hover:bg-gray-100"
            }`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button 
            onClick={handleTextUpload}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
              isDark 
                ? "border border-gray-800 hover:bg-gray-900" 
                : "border border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Plus size={16} />
            Note
          </button>

          <input 
            type="file" 
            accept=".pdf"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
              isDark 
                ? "bg-white text-black hover:bg-gray-100" 
                : "bg-black text-white hover:bg-gray-900"
            }`}
          >
            <FileText size={16} />
            PDF
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
            >
              <div className={`flex items-start gap-2 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex-shrink-0 p-2 rounded-lg ${
                  msg.role === "user" 
                    ? isDark ? "bg-white text-black" : "bg-black text-white"
                    : isDark ? "bg-gray-900" : "bg-gray-100"
                }`}>
                  {msg.role === "user" ? (
                    <User size={16} />
                  ) : (
                    <Bot size={16} />
                  )}
                </div>

                <div className={`p-4 rounded-lg ${
                  msg.role === "user" 
                    ? isDark ? "bg-white text-black" : "bg-black text-white"
                    : isDark ? "bg-gray-900 border border-gray-800" : "bg-gray-50 border border-gray-200"
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  {msg.source && (
                    <div className={`mt-3 pt-2 text-xs border-t ${
                      isDark ? "border-gray-800 text-gray-400" : "border-gray-200 text-gray-600"
                    }`}>
                      <span className="font-medium">Source: </span>
                      <span className="italic">{msg.source}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className={`flex items-center gap-2 ml-10 animate-fadeIn ${
              isDark ? "text-gray-500" : "text-gray-400"
            }`}>
              <Loader2 className="animate-spin" size={16} />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className={`px-4 py-4 border-t ${
        isDark ? "border-gray-800" : "border-gray-200"
      }`}>
        <div className="max-w-3xl mx-auto">
          <div className={`flex items-center gap-2 p-2 rounded-lg border ${
            isDark ? "border-gray-800" : "border-gray-200"
          }`}>
            <input 
              className={`flex-1 bg-transparent px-3 py-2 outline-none text-sm ${
                isDark ? "placeholder-gray-600" : "placeholder-gray-400"
              }`}
              placeholder="Ask The Vault..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button 
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className={`p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isDark 
                  ? "bg-white text-black hover:bg-gray-100" 
                  : "bg-black text-white hover:bg-gray-900"
              }`}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}