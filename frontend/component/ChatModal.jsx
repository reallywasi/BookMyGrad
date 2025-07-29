'use client';

import React, { useState, useEffect } from 'react';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';
import axios from 'axios';

export default function ChatModal({ client, freelancer, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState('');

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      const response = await axios.get('http://localhost:8000/messages/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter messages between the client and the specific freelancer
      const filteredMessages = response.data.filter(
        msg =>
          (msg.sender_type === 'client' && msg.sender_id === client.id && msg.receiver_type === 'freelancer' && msg.receiver_id === freelancer.id) ||
          (msg.sender_type === 'freelancer' && msg.sender_id === freelancer.id && msg.receiver_type === 'client' && msg.receiver_id === client.id)
      );
      setMessages(filteredMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch messages');
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [client, freelancer]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      setError('Message cannot be empty');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      await axios.post(
        'http://localhost:8000/messages/',
        {
          receiver_id: freelancer.id,
          receiver_type: 'freelancer',
          content: newMessage,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send message');
    }
  };

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
        <div className="p-6 border-b border-[#e0e0e0]">
          <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] m-0">Chat with {freelancer.freelancerName}</h2>
        </div>
        <div className="flex-grow p-6 overflow-y-auto max-h-[50vh]">
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    msg.sender_type === 'client'
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
            <p className="text-center text-[#757575] text-sm">No messages yet.</p>
          )}
        </div>
        <div className="p-6 border-t border-[#e0e0e0] flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
            placeholder="Type your message..."
          />
          <button
            className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white p-3 rounded-full hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] transition-all"
            onClick={handleSendMessage}
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
}