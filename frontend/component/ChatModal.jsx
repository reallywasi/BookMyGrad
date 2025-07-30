'use client';

import React, { useState, useEffect } from 'react';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';
import axios from 'axios';

export default function ChatModal({ client, freelancer, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');
  const [userType, setUserType] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserType(payload.type);
        setUserId(payload.sub); // Should now be id as per backend update
      } catch (err) {
        setError('Invalid authentication token');
      }
    } else {
      setError('No authentication token found');
    }
  }, []);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      if (!freelancer?.id || !client?.id) {
        throw new Error('Invalid chat participants: missing ID');
      }
      const otherPartyId = userType === 'client' ? freelancer.id : client.id;
      const otherPartyType = userType === 'client' ? 'freelancer' : 'client';
      const response = await axios.get('http://localhost:8000/messages/', {
        headers: { Authorization: `Bearer ${token}` },
        params: { other_party_id: otherPartyId, other_party_type: otherPartyType },
      });
      setMessages(response.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
    } catch (err) {
      const errorDetail = err.response?.data?.detail || err.response?.data?.msg || err.message || 'Failed to fetch messages';
      setError(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
    }
  };

  useEffect(() => {
    if (userType && freelancer?.id && client?.id) {
      fetchMessages();
    }
  }, [userType, client, freelancer]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) {
      setError('Message cannot be empty');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      if (!freelancer?.id || !client?.id) throw new Error('Invalid chat participants');
      const messageData = {
        receiver_id: userType === 'client' ? freelancer.id : client.id,
        receiver_type: userType === 'client' ? 'freelancer' : 'client',
        content: newMessage,
      };
      await axios.post('http://localhost:8000/messages/', messageData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewMessage('');
      setError('');
      fetchMessages();
    } catch (err) {
      const errorDetail = err.response?.data?.detail || err.response?.data?.msg || err.message || 'Failed to send message';
      setError(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
    }
  };

  useEffect(() => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
      onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}
    >
      <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[600px] max-h-[80vh] overflow-y-auto relative flex flex-col">
        <button
          className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
          onClick={onClose}
        >
          <FaTimes />
        </button>
        <div className="p-6 border-b border-[#e0e0e0] bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white rounded-t-xl">
          <h2 className="font-montserrat font-bold text-2xl m-0">
            Chat with {userType === 'client' ? (freelancer.name || 'Freelancer') : client.name}
          </h2>
        </div>
        <div id="chat-container" className="flex-grow p-6 overflow-y-auto max-h-[50vh]">
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 flex ${msg.sender_type === userType ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    msg.sender_type === userType
                      ? 'bg-[#6a1b9a] text-white'
                      : 'bg-[#f0f4f8] text-[#212121]'
                  }`}
                >
                  <p className="text-sm mb-1">{msg.content}</p>
                  <p className="text-xs text-[#9e9e9e] m-0">
                    {new Date(msg.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-[#757575] text-sm">No messages yet. Start the conversation!</p>
          )}
        </div>
        <div className="p-6 border-t border-[#e0e0e0] flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
            placeholder="Type your message..."
            disabled={!userType}
          />
          <button
            className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white p-3 rounded-full hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] transition-all"
            onClick={handleSendMessage}
            disabled={!userType || !newMessage.trim()}
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
}