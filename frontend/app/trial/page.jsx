'use client';

import React, { useState } from 'react';
import { FaTimes, FaBriefcase, FaUserTie, FaEnvelope, FaLock, FaUser, FaBuilding, FaCode, FaLink, FaInfoCircle, FaStar, FaRocket, FaUsers } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const App = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '', userType: 'freelancer' });
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    clientName: '',
    companyName: '',
    freelancerFullName: '',
    freelancerProfession: '',
    freelancerPortfolio: '',
    freelancerBio: ''
  });
  const [error, setError] = useState('');
  const router = useRouter();

  const openModal = (modal) => {
    setActiveModal(modal);
    setError('');
  };

  const closeModal = () => {
    setActiveModal(null);
    setUserType(null);
    setLoginForm({ email: '', password: '', userType: 'freelancer' });
    setSignupForm({
      email: '',
      password: '',
      confirmPassword: '',
      clientName: '',
      companyName: '',
      freelancerFullName: '',
      freelancerProfession: '',
      freelancerPortfolio: '',
      freelancerBio: ''
    });
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new URLSearchParams();
      formData.append('username', loginForm.email);
      formData.append('password', loginForm.password);

      const endpoint = loginForm.userType === 'freelancer' ? '/freelancers/login' : '/clients/login';
      const response = await axios.post(`http://localhost:8000${endpoint}`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);

      if (loginForm.userType === 'freelancer') {
        const userResponse = await axios.get('http://localhost:8000/freelancers/me', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        router.push(`/freelancer/${userResponse.data.id}`);
      } else {
        const clientsResponse = await axios.get('http://localhost:8000/clients/register', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        const client = clientsResponse.data.find(c => c.email === loginForm.email);
        if (client) {
          router.push(`/client/${client.id}`);
        } else {
          throw new Error('Client not found');
        }
      }
      closeModal();
    } catch (error) {
      setError(error.response?.data?.detail || 'Login failed. Please check your credentials.');
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      const endpoint = userType === 'freelancer' ? '/freelancers/register' : '/clients/register';
      const payload = userType === 'freelancer' ? {
        email: signupForm.email,
        password: signupForm.password,
        name: signupForm.freelancerFullName,
        bio: signupForm.freelancerBio,
        portfolio: signupForm.freelancerPortfolio,
        profession: signupForm.freelancerProfession
      } : {
        email: signupForm.email,
        password: signupForm.password,
        name: signupForm.clientName,
        company: signupForm.companyName || null
      };
      await axios.post(`http://localhost:8000${endpoint}`, payload);
      alert('Signup successful! Please log in.');
      closeModal();
      openModal('loginModal');
    } catch (error) {
      setError(error.response?.data?.detail || 'Signup failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-200 via-indigo-100 to-purple-200 flex flex-col md:flex-row font-sans">
      {/* Left Section: Welcome Content */}
      <div className="md:w-1/2 flex items-center justify-center p-8 animate-fade-in">
        <div className="text-center md:text-left max-w-lg">
          <h1 className="font-bold text-4xl md:text-5xl text-[#6a1b9a] mb-6 tracking-tight drop-shadow-lg">
            Discover CreativeHub
          </h1>
          <p className="text-lg text-[#757575] mb-8">
            Join a vibrant community where freelancers and clients connect to bring creative projects to life.
          </p>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <FaStar className="text-3xl text-[#6a1b9a] flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-xl text-[#212121]">Find Top Talent</h3>
                <p className="text-[#757575]">Clients can discover skilled freelancers for any project, from design to development.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <FaRocket className="text-3xl text-[#6a1b9a] flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-xl text-[#212121]">Showcase Your Skills</h3>
                <p className="text-[#757575]">Freelancers can build stunning portfolios and connect with clients worldwide.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <FaUsers className="text-3xl text-[#6a1b9a] flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-xl text-[#212121]">Join the Community</h3>
                <p className="text-[#757575]">Be part of a growing network of creatives and innovators.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section: Login/Signup */}
      <div className="md:w-1/2 flex items-center justify-center p-8">
        {!activeModal && (
          <div className="text-center animate-fade-in">
            <h2 className="font-bold text-3xl text-[#6a1b9a] mb-6 tracking-tight">
              Get Started
            </h2>
            <p className="text-lg text-[#757575] mb-8 max-w-md mx-auto">
              Login or sign up to start your creative journey today.
            </p>
            <div className="flex flex-col gap-4 max-w-xs mx-auto">
              <button
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out transform"
                onClick={() => openModal('loginModal')}
              >
                Login
              </button>
              <button
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out transform"
                onClick={() => openModal('signupModal')}
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {activeModal === 'loginModal' && (
          <div
            className="fixed inset-0 bg-[rgba(0,0,0,0.7)] flex justify-center items-center z-[1001] animate-fade-in modal-overlay"
            onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative transform scale-100 transition-transform duration-300 animate-slide-up">
              <button
                className="absolute top-4 right-4 text-2xl text-[#757575] hover:text-[#6a1b9a] transition-colors z-10"
                onClick={closeModal}
              >
                <FaTimes />
              </button>
              <div className="p-8">
                <h2 className="font-bold text-3xl text-[#6a1b9a] mb-6 text-center tracking-tight">
                  Login to CreativeHub
                </h2>
                {error && (
                  <p className="text-red-500 text-sm mb-6 text-center bg-red-50 p-3 rounded-lg">{error}</p>
                )}
                <div onSubmit={handleLoginSubmit}>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-[#212121] mb-2 flex items-center gap-2">
                      <FaUser className="text-[#6a1b9a]" /> User Type
                    </label>
                    <select
                      value={loginForm.userType}
                      onChange={(e) => setLoginForm({ ...loginForm, userType: e.target.value })}
                      className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] transition-all"
                    >
                      <option value="freelancer">Freelancer</option>
                      <option value="client">Client</option>
                    </select>
                  </div>
                  <div className="mb-6">
                    <label htmlFor="loginEmail" className="block text-sm font-semibold text-[#212121] mb-2 flex items-center gap-2">
                      <FaEnvelope className="text-[#6a1b9a]" /> Email Address
                    </label>
                    <input
                      type="email"
                      id="loginEmail"
                      placeholder="your.email@example.com"
                      required
                      className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] transition-all"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    />
                  </div>
                  <div className="mb-6">
                    <label htmlFor="loginPassword" className="block text-sm font-semibold text-[#212121] mb-2 flex items-center gap-2">
                      <FaLock className="text-[#6a1b9a]" /> Password
                    </label>
                    <input
                      type="password"
                      id="loginPassword"
                      placeholder="Enter your password"
                      required
                      className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] transition-all"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-5 py-3 rounded-full font-semibold text-base shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    Login
                  </button>
                  <p className="mt-6 text-sm text-[#757575] text-center">
                    Don't have an account?{' '}
                    <a
                      href="#"
                      className="font-semibold text-[#6a1b9a] hover:text-[#9c27b0] transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        closeModal();
                        openModal('signupModal');
                      }}
                    >
                      Sign Up
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'signupModal' && (
          <div
            className="fixed inset-0 bg-[rgba(0,0,0,0.7)] flex justify-center items-center z-[1001] animate-fade-in modal-overlay"
            onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden relative flex flex-col transform scale-100 transition-transform duration-300 animate-slide-up">
              <div className="relative p-6 border-b border-gray-200 bg-white">
                <button
                  className="absolute top-5 right-5 text-2xl text-[#757575] hover:text-[#6a1b9a] transition-colors"
                  onClick={closeModal}
                >
                  <FaTimes />
                </button>
                {userType && (
                  <button
                    type="button"
                    className="absolute top-5 left-5 flex items-center text-sm text-[#757575] hover:text-[#6a1b9a] transition-colors"
                    onClick={() => setUserType(null)}
                  >
                    <span className="mr-1">←</span> Back
                  </button>
                )}
                <h2 className="font-bold text-3xl text-[#6a1b9a] text-center tracking-tight">
                  Join CreativeHub
                </h2>
                <p className="text-base text-[#757575] text-center mt-2">
                  Choose your path to creativity
                </p>
              </div>
              <div className="overflow-y-auto px-8 py-6 flex-1">
                {error && (
                  <p className="text-red-500 text-sm mb-6 text-center bg-red-50 p-3 rounded-lg">{error}</p>
                )}
                {!userType && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <button
                      className="flex flex-col items-center p-6 border-2 border-[#e0e0e0] rounded-xl bg-white font-semibold text-base text-[#757575] hover:border-[#9c27b0] hover:text-[#9c27b0] hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                      onClick={() => setUserType('client')}
                    >
                      <FaBriefcase className="text-5xl text-[#6a1b9a] mb-4" />
                      <span className="text-lg">I’m Looking for a Freelancer</span>
                    </button>
                    <button
                      className="flex flex-col items-center p-6 border-2 border-[#e0e0e0] rounded-xl bg-white font-semibold text-base text-[#757575] hover:border-[#9c27b0] hover:text-[#9c27b0] hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                      onClick={() => setUserType('freelancer')}
                    >
                      <FaUserTie className="text-5xl text-[#6a1b9a] mb-4" />
                      <span className="text-lg">I’m a Freelancer</span>
                    </button>
                  </div>
                )}
                {userType && (
                  <div onSubmit={handleSignupSubmit}>
                    <div className="mb-4">
                      <label htmlFor="signupEmail" className="block text-sm font-semibold text-[#212121] mb-2 flex items-center gap-2">
                        <FaEnvelope className="text-[#6a1b9a]" /> Email Address
                      </label>
                      <input
                        type="email"
                        id="signupEmail"
                        placeholder="your.email@example.com"
                        required
                        className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] transition-all"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="signupPassword" className="block text-sm font-semibold text-[#212121] mb-2 flex items-center gap-2">
                        <FaLock className="text-[#6a1b9a]" /> Password
                      </label>
                      <input
                        type="password"
                        id="signupPassword"
                        placeholder="Create a password"
                        required
                        className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] transition-all"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="signupConfirmPassword" className="block text-sm font-semibold text-[#212121] mb-2 flex items-center gap-2">
                        <FaLock className="text-[#6a1b9a]" /> Confirm Password
                      </label>
                      <input
                        type="password"
                        id="signupConfirmPassword"
                        placeholder="Confirm your password"
                        required
                        className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] transition-all"
                        value={signupForm.confirmPassword}
                        onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      />
                    </div>
                    {userType === 'client' && (
                      <div>
                        <div className="mb-4">
                          <label htmlFor="clientName" className="block text-sm font-semibold text-[#212121] mb-2 flex items-center gap-2">
                            <FaUser className="text-[#6a1b9a]" /> Your Name
                          </label>
                          <input
                            type="text"
                            id="clientName"
                            placeholder="e.g., Jane Doe"
                            required
                            className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] transition-all"
                            value={signupForm.clientName}
                            onChange={(e) => setSignupForm({ ...signupForm, clientName: e.target.value })}
                          />
                        </div>
                        <div className="mb-4">
                          <label htmlFor="companyName" className="block text-sm font-semibold text-[#212121] mb-2 flex items-center gap-2">
                            <FaBuilding className="text-[#6a1b9a]" /> Company Name (Optional)
                          </label>
                          <input
                            type="text"
                            id="companyName"
                            placeholder="e.g., Creative Solutions Inc."
                            className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] transition-all"
                            value={signupForm.companyName}
                            onChange={(e) => setSignupForm({ ...signupForm, companyName: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                    {userType === 'freelancer' && (
                      <div>
                        <div className="mb-4">
                          <label htmlFor="freelancerFullName" className="block text-sm font-semibold text-[#212121] mb-2 flex items-center gap-2">
                            <FaUser className="text-[#6a1b9a]" /> Full Name
                          </label>
                          <input
                            type="text"
                            id="freelancerFullName"
                            placeholder="e.g., John Smith"
                            required
                            className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] transition-all"
                            value={signupForm.freelancerFullName}
                            onChange={(e) => setSignupForm({ ...signupForm, freelancerFullName: e.target.value })}
                          />
                        </div>
                        <div className="mb-4">
                          <label htmlFor="freelancerProfession" className="block text-sm font-semibold text-[#212121] mb-2 flex items-center gap-2">
                            <FaCode className="text-[#6a1b9a]" /> Profession/Niche
                          </label>
                          <input
                            type="text"
                            id="freelancerProfession"
                            placeholder="e.g., Web Developer, Graphic Designer"
                            required
                            className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] transition-all"
                            value={signupForm.freelancerProfession}
                            onChange={(e) => setSignupForm({ ...signupForm, freelancerProfession: e.target.value })}
                          />
                        </div>
                        <div className="mb-4">
                          <label htmlFor="freelancerPortfolio" className="block text-sm font-semibold text-[#212121] mb-2 flex items-center gap-2">
                            <FaLink className="text-[#6a1b9a]" /> Portfolio/Website (Optional)
                          </label>
                          <input
                            type="url"
                            id="freelancerPortfolio"
                            placeholder="https://yourportfolio.com"
                            className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] transition-all"
                            value={signupForm.freelancerPortfolio}
                            onChange={(e) => setSignupForm({ ...signupForm, freelancerPortfolio: e.target.value })}
                          />
                        </div>
                        <div className="mb-4">
                          <label htmlFor="freelancerBio" className="block text-sm font-semibold text-[#212121] mb-2 flex items-center gap-2">
                            <FaInfoCircle className="text-[#6a1b9a]" /> Short Bio
                          </label>
                          <textarea
                            id="freelancerBio"
                            rows="4"
                            placeholder="Tell us about your skills and experience..."
                            required
                            className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] transition-all resize-y"
                            value={signupForm.freelancerBio}
                            onChange={(e) => setSignupForm({ ...signupForm, freelancerBio: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                    <button
                      type="submit"
                      className="mt-4 w-full bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-5 py-3 rounded-full font-semibold text-base shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      Create Account
                    </button>
                    <p className="mt-4 text-sm text-[#757575] text-center">
                      Already have an account?{' '}
                      <a
                        href="#"
                        className="font-semibold text-[#6a1b9a] hover:text-[#9c27b0] transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          closeModal();
                          openModal('loginModal');
                        }}
                      >
                        Login
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;