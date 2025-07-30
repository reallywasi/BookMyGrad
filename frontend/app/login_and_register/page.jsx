'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FaTimes, FaBriefcase, FaUserTie, FaEnvelope, FaLock } from 'react-icons/fa';

const App = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '', userType: 'freelancer' });
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    // Client fields (matching ClientCreate Pydantic model)
    clientName: '', // Corresponds to 'name' in ClientCreate
    companyName: '', // Corresponds to 'company' in ClientCreate
    clientBio: '',   // Corresponds to 'bio' in ClientCreate
    clientWebsite: '', // Corresponds to 'website' in ClientCreate
    // Freelancer fields (matching FreelancerCreate Pydantic model)
    freelancerFullName: '', // Corresponds to 'name' in FreelancerCreate
    freelancerProfession: '', // Corresponds to 'profession' in FreelancerCreate
    freelancerPortfolio: '', // Corresponds to 'portfolio' in FreelancerCreate
    freelancerBio: '' // Corresponds to 'bio' in FreelancerCreate
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
      clientBio: '',
      clientWebsite: '',
      freelancerFullName: '',
      freelancerProfession: '',
      freelancerPortfolio: '',
      freelancerBio: ''
    });
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Corrected: Add '/api' prefix to the endpoint
      const endpoint = loginForm.userType === 'freelancer' ? '/api/freelancers/login' : '/api/clients/login';
      const formData = new URLSearchParams();
      formData.append('username', loginForm.email);
      formData.append('password', loginForm.password);

      console.log('Login payload (form data):', formData.toString());
      const response = await axios.post(`http://localhost:8000${endpoint}`, formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      console.log('Login response:', response.data);
      const { access_token, client_id } = response.data; // Backend returns 'client_id' for both user IDs

      if (!access_token) {
        throw new Error('Invalid response from server: missing access_token');
      }

      localStorage.setItem('token', access_token);
      localStorage.setItem('user_id', client_id); // Store the user's ID
      localStorage.setItem('user_type', loginForm.userType); // Store the user type

      alert('Login successful!');
      if (loginForm.userType === 'client') {
        router.push(`/client/${client_id}`);
      } else { // freelancer
        router.push(`/freelancer/${client_id}`);
      }
      closeModal();
    } catch (err) {
      console.error('Login error:', err.response?.data || err.message);
      let errorMessage = 'Login failed. Please check your credentials.';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map(e => e.msg).join(', ');
        } else {
          errorMessage = JSON.stringify(err.response.data.detail);
        }
      }
      setError(errorMessage);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      // Corrected: Add '/api' prefix to the endpoint
      const endpoint = userType === 'freelancer' ? '/api/freelancers/register' : '/api/clients/register';
      const payload = userType === 'freelancer' ? {
        email: signupForm.email,
        password: signupForm.password,
        name: signupForm.freelancerFullName,
        profession: signupForm.freelancerProfession,
        bio: signupForm.freelancerBio || null,
        portfolio: signupForm.freelancerPortfolio || null
      } : {
        email: signupForm.email,
        password: signupForm.password,
        name: signupForm.clientName,
        company: signupForm.companyName || null,
        bio: signupForm.clientBio || null,
        website: signupForm.clientWebsite || null
      };
      console.log('Signup payload:', payload);
      const response = await axios.post(`http://localhost:8000${endpoint}`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Signup response:', response.data);

      alert('Registration successful! Please log in.');
      closeModal();
      openModal('loginModal');

    } catch (err) {
      console.error('Signup error:', err.response?.data || err.message);
      let errorMessage = 'Signup failed. Please try again.';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map(e => e.msg).join(', ');
        } else {
          errorMessage = JSON.stringify(err.response.data.detail);
        }
      }
      setError(errorMessage);
    }
  };

  return (
    <div className="font-sans text-[#212121] leading-relaxed bg-[#f5f5f5] min-h-screen flex items-center justify-center p-4">
      {!activeModal && (
        <div className="text-center">
          <h1 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-8">Welcome to CreativeHub</h1>
          <div className="flex gap-4 justify-center">
            <button
              className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-lg hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all"
              onClick={() => openModal('loginModal')}
            >
              Login
            </button>
            <button
              className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-lg hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all"
              onClick={() => openModal('signupModal')}
            >
              Sign Up
            </button>
          </div>
        </div>
      )}

      {activeModal === 'loginModal' && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity modal-overlay"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[450px] p-8 relative">
            <button
              className="absolute top-4 right-4 text-xl text-[#757575] hover:text-[#6a1b9a] transition-colors"
              onClick={closeModal}
            >
              <FaTimes />
            </button>
            <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-6 text-center">Login to CreativeHub</h2>
            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">User Type</label>
                <select
                  value={loginForm.userType}
                  onChange={(e) => setLoginForm({ ...loginForm, userType: e.target.value })}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                >
                  <option value="freelancer">Freelancer</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2 flex items-center gap-2">
                  <FaEnvelope /> Email
                </label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  required
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2 flex items-center gap-2">
                  <FaLock /> Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  required
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base w-full hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all"
              >
                Login
              </button>
            </form>
            <p className="text-sm text-[#757575] mt-6 text-center">
              Don't have an account?{' '}
              <button
                className="text-[#6a1b9a] font-semibold hover:underline"
                onClick={() => { closeModal(); openModal('signupModal'); }}
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      )}

      {activeModal === 'signupModal' && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] modal-overlay"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[600px] max-h-[90vh] overflow-y-auto p-8 relative">
            <button
              className="absolute top-4 right-4 text-xl text-[#757575] hover:text-[#6a1b9a] transition-colors"
              onClick={closeModal}
            >
              <FaTimes />
            </button>
            {userType && (
              <button
                className="absolute top-4 left-4 flex items-center text-sm text-[#757575] hover:text-[#6a1b9a] transition-colors"
                onClick={() => setUserType(null)}
              >
                <span className="mr-1">←</span> Back
              </button>
            )}
            <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-6 text-center">Join CreativeHub</h2>
            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
            {!userType && (
              <div className="flex flex-col md:flex-row gap-4 mb-6 justify-center">
                <button
                  className="flex-1 p-6 border-2 border-[#e0e0e0] text-[#757575] rounded-xl bg-white font-semibold text-base flex flex-col items-center gap-3 hover:border-[#00bcd4] hover:text-[#00bcd4] transition-all"
                  onClick={() => setUserType('client')}
                >
                  <FaBriefcase className="text-4xl" />
                  <span>I’m Looking for a Freelancer</span>
                </button>
                <button
                  className="flex-1 p-6 border-2 border-[#e0e0e0] text-[#757575] rounded-xl bg-white font-semibold text-base flex flex-col items-center gap-3 hover:border-[#00bcd4] hover:text-[#00bcd4] transition-all"
                  onClick={() => setUserType('freelancer')}
                >
                  <FaUserTie className="text-4xl" />
                  <span>I’m a Freelancer</span>
                </button>
              </div>
            )}
            {userType && (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#6a1b9a] mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="your.email@example.com"
                    required
                    className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#6a1b9a] mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="Create a password"
                    required
                    className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#6a1b9a] mb-1">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Confirm your password"
                    required
                    className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                  />
                </div>
                {userType === 'client' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-[#6a1b9a] mb-1">Your Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Jane Doe"
                        required
                        className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                        value={signupForm.clientName}
                        onChange={(e) => setSignupForm({ ...signupForm, clientName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#6a1b9a] mb-1">Company Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g., Creative Solutions Inc."
                        className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                        value={signupForm.companyName}
                        onChange={(e) => setSignupForm({ ...signupForm, companyName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#6a1b9a] mb-1">Bio (Optional)</label>
                      <textarea
                        placeholder="Tell us about yourself..."
                        className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors resize-y"
                        rows="3"
                        value={signupForm.clientBio}
                        onChange={(e) => setSignupForm({ ...signupForm, clientBio: e.target.value })}
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#6a1b9a] mb-1">Website (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://yourwebsite.com"
                        className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                        value={signupForm.clientWebsite}
                        onChange={(e) => setSignupForm({ ...signupForm, clientWebsite: e.target.value })}
                      />
                    </div>
                  </>
                )}
                {userType === 'freelancer' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-[#6a1b9a] mb-1">Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g., John Smith"
                        required
                        className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                        value={signupForm.freelancerFullName}
                        onChange={(e) => setSignupForm({ ...signupForm, freelancerFullName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#6a1b9a] mb-1">Profession/Niche</label>
                      <input
                        type="text"
                        placeholder="e.g., Web Developer, Graphic Designer"
                        required
                        className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                        value={signupForm.freelancerProfession}
                        onChange={(e) => setSignupForm({ ...signupForm, freelancerProfession: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#6a1b9a] mb-1">Portfolio/Website (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://yourportfolio.com"
                        className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                        value={signupForm.freelancerPortfolio}
                        onChange={(e) => setSignupForm({ ...signupForm, freelancerPortfolio: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#6a1b9a] mb-1">Short Bio</label>
                      <textarea
                        placeholder="Tell us about your skills and experience..."
                        required
                        className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors resize-y"
                        rows="3"
                        value={signupForm.freelancerBio}
                        onChange={(e) => setSignupForm({ ...signupForm, freelancerBio: e.target.value })}
                      ></textarea>
                    </div>
                  </>
                )}
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base w-full hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all"
                >
                  Create Account
                </button>
              </form>
            )}
            <p className="text-sm text-[#757575] mt-4 text-center">
              Already have an account?{' '}
              <button
                className="text-[#6a1b9a] font-semibold hover:underline"
                onClick={() => { closeModal(); openModal('loginModal'); }}
              >
                Login
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;