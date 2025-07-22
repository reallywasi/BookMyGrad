import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';

const ChatModal = ({ client, freelancer, onClose }) => {
  const [messages, setMessages] = useState([
    { id: '1', sender: 'freelancer', text: `Hi ${client.clientName}, thanks for your inquiry! I'm excited to discuss your project needs.`, timestamp: '2025-07-20 14:32' },
    { id: '2', sender: 'client', text: 'Hi Anya, I loved your SaaS landing page design. Can you customize it for my startup?', timestamp: '2025-07-20 14:35' },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Simulate client replies
  useEffect(() => {
    const timer = setInterval(() => {
      const mockReplies = [
        'Can you share more details about the customization process?',
        'What’s the timeline for a project like this?',
        'Do you offer any discounts for startups?',
      ];
      const randomReply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
      setMessages(prev => [
        ...prev,
        {
          id: (prev.length + 1).toString(),
          sender: 'client',
          text: randomReply,
          timestamp: new Date().toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessages(prev => [
      ...prev,
      {
        id: (prev.length + 1).toString(),
        sender: 'freelancer',
        text: newMessage,
        timestamp: new Date().toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setNewMessage('');
  };

  return (
    <div
      className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
      onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}
    >
      <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e0e0e0]">
          <div className="flex items-center gap-3">
            <img
              src={client.clientAvatar}
              alt={client.clientName}
              className="w-10 h-10 rounded-full object-cover border-2 border-[#00bcd4]"
            />
            <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a]">{client.clientName}</h3>
          </div>
          <button
            className="bg-transparent border-none text-2xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors"
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden bg-[#f5f5f5]">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'freelancer' ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.sender === 'freelancer'
                    ? 'bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white'
                    : 'bg-[#00bcd4] text-white'
                }`}
              >
                <p className="text-sm mb-1">{message.text}</p>
                <p className="text-xs opacity-70">{message.timestamp}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-[#e0e0e0]">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 p-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
              placeholder="Type your message..."
            />
            <button
              className="bg-[#00bcd4] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 transition-all"
              onClick={handleSendMessage}
            >
              <FaPaperPlane /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;