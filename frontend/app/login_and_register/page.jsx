
// 'use client';

// import React, { useState } from 'react';
// import { FaTimes, FaBriefcase, FaUserTie } from 'react-icons/fa';
// import { useRouter } from 'next/navigation';
// import axios from 'axios';

// const App = () => {
//   const [activeModal, setActiveModal] = useState(null);
//   const [userType, setUserType] = useState(null);
//   const [loginForm, setLoginForm] = useState({ email: '', password: '', userType: 'freelancer' });
//   const [signupForm, setSignupForm] = useState({
//     email: '',
//     password: '',
//     confirmPassword: '',
//     clientName: '',
//     companyName: '',
//     freelancerFullName: '',
//     freelancerProfession: '',
//     freelancerPortfolio: '',
//     freelancerBio: ''
//   });
//   const [error, setError] = useState('');
//   const router = useRouter();

//   const openModal = (modal) => {
//     setActiveModal(modal);
//     setError('');
//   };
//   const closeModal = () => {
//     setActiveModal(null);
//     setUserType(null);
//     setLoginForm({ email: '', password: '', userType: 'freelancer' });
//     setSignupForm({
//       email: '',
//       password: '',
//       confirmPassword: '',
//       clientName: '',
//       companyName: '',
//       freelancerFullName: '',
//       freelancerProfession: '',
//       freelancerPortfolio: '',
//       freelancerBio: ''
//     });
//     setError('');
//   };

//   const handleLoginSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const formData = new URLSearchParams();
//       formData.append('username', loginForm.email);
//       formData.append('password', loginForm.password);

//       const endpoint = loginForm.userType === 'freelancer' ? '/freelancers/login' : '/clients/login';
//       const response = await axios.post(`http://localhost:8000${endpoint}`, formData, {
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded'
//         }
//       });
//       const { access_token } = response.data;
//       localStorage.setItem('token', access_token);

//       if (loginForm.userType === 'freelancer') {
//         const userResponse = await axios.get('http://localhost:8000/freelancers/me', {
//           headers: { Authorization: `Bearer ${access_token}` }
//         });
//         router.push(`/freelancer/${userResponse.data.id}`);
//       } else {
//         // For clients, fetch client info by querying with email (no /clients/me endpoint)
//         const clientsResponse = await axios.get('http://localhost:8000/clients/register', {
//           headers: { Authorization: `Bearer ${access_token}` }
//         });
//         const client = clientsResponse.data.find(c => c.email === loginForm.email);
//         if (client) {
//           router.push(`/client/${client.id}`);
//         } else {
//           throw new Error('Client not found');
//         }
//       }
//       closeModal();
//     } catch (error) {
//       setError(error.response?.data?.detail || 'Login failed. Please check your credentials.');
//     }
//   };

//   const handleSignupSubmit = async (e) => {
//     e.preventDefault();
//     if (signupForm.password !== signupForm.confirmPassword) {
//       setError('Passwords do not match.');
//       return;
//     }
//     try {
//       const endpoint = userType === 'freelancer' ? '/freelancers/register' : '/clients/register';
//       const payload = userType === 'freelancer' ? {
//         email: signupForm.email,
//         password: signupForm.password,
//         name: signupForm.freelancerFullName,
//         bio: signupForm.freelancerBio,
//         portfolio: signupForm.freelancerPortfolio,
//         profession: signupForm.freelancerProfession
//       } : {
//         email: signupForm.email,
//         password: signupForm.password,
//         name: signupForm.clientName,
//         company: signupForm.companyName || null
//       };
//       await axios.post(`http://localhost:8000${endpoint}`, payload);
//       alert('Signup successful! Please log in.');
//       closeModal();
//       openModal('loginModal');
//     } catch (error) {
//       setError(error.response?.data?.detail || 'Signup failed. Please try again.');
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center p-4">
//       {!activeModal && (
//         <div className="text-center">
//           <h1 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-8">Welcome to CreativeHub</h1>
//           <div className="flex gap-4 justify-center">
//             <button
//               className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-lg hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all"
//               onClick={() => openModal('loginModal')}
//             >
//               Login
//             </button>
//             <button
//               className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-lg hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all"
//               onClick={() => openModal('signupModal')}
//             >
//               Sign Up
//             </button>
//           </div>
//         </div>
//       )}

//       {activeModal === 'loginModal' && (
//         <div
//           className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity modal-overlay"
//           onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
//         >
//           <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[450px] relative transform translate-y-0 transition-transform">
//             <button
//               className="absolute top-4 right-4 bg-transparent border-none text-xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
//               onClick={closeModal}
//             >
//               <FaTimes />
//             </button>
//             <div className="p-8 text-center">
//               <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4">Login to CreativeHub</h2>
//               {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
//               <form onSubmit={handleLoginSubmit}>
//                 <div className="mb-5 text-left">
//                   <label className="block text-sm font-semibold text-[#212121] mb-2">User Type</label>
//                   <select
//                     value={loginForm.userType}
//                     onChange={(e) => setLoginForm({ ...loginForm, userType: e.target.value })}
//                     className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0]"
//                   >
//                     <option value="freelancer">Freelancer</option>
//                     <option value="client">Client</option>
//                   </select>
//                 </div>
//                 <div className="mb-5 text-left">
//                   <label htmlFor="loginEmail" className="block text-sm font-semibold text-[#212121] mb-2">
//                     Email Address
//                   </label>
//                   <input
//                     type="email"
//                     id="loginEmail"
//                     placeholder="your.email@example.com"
//                     required
//                     className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]"
//                     value={loginForm.email}
//                     onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
//                   />
//                 </div>
//                 <div className="mb-5 text-left">
//                   <label htmlFor="loginPassword" className="block text-sm font-semibold text-[#212121] mb-2">
//                     Password
//                   </label>
//                   <input
//                     type="password"
//                     id="loginPassword"
//                     placeholder="Enter your password"
//                     required
//                     className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]"
//                     value={loginForm.password}
//                     onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
//                   />
//                 </div>
//                 <button
//                   type="submit"
//                   className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-5 py-3 rounded-full font-semibold text-base w-full hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all"
//                 >
//                   Login
//                 </button>
//                 <p className="mt-6 text-sm text-[#757575]">
//                   Don't have an account?{' '}
//                   <a
//                     href="#"
//                     className="font-semibold text-[#6a1b9a] hover:text-[#9c27b0]"
//                     onClick={(e) => {
//                       e.preventDefault();
//                       closeModal();
//                       openModal('signupModal');
//                     }}
//                   >
//                     Sign Up
//                   </a>
//                 </p>
//               </form>
//             </div>
//           </div>
//         </div>
//       )}

//       {activeModal === 'signupModal' && (
//         <div
//           className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] modal-overlay"
//           onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
//         >
//           <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[600px] max-h-[90vh] overflow-hidden relative flex flex-col">
//             <div className="relative p-6 border-b border-gray-200 z-10 bg-white">
//               <button
//                 className="absolute top-5 right-5 text-xl text-[#757575] hover:text-[#6a1b9a] transition-colors"
//                 onClick={closeModal}
//               >
//                 <FaTimes />
//               </button>
//               {userType && (
//                 <button
//                   type="button"
//                   className="absolute top-5 left-5 flex items-center text-sm text-[#757575] hover:text-[#6a1b9a] transition-colors"
//                   onClick={() => setUserType(null)}
//                 >
//                   <span className="mr-1">←</span> Back
//                 </button>
//               )}
//               <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] text-center">Join CreativeHub</h2>
//               <p className="text-base text-[#757575] text-center">Choose your path to creativity.</p>
//             </div>
//             <div className="overflow-y-auto px-8 py-6 flex-1">
//               {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
//               {!userType && (
//                 <div className="flex flex-col md:flex-row gap-3 mb-5 justify-center">
//                   <button
//                     className="flex-1 p-6 border-2 border-[#e0e0e0] text-[#757575] rounded-xl bg-white font-semibold text-base flex flex-col items-center gap-3 hover:border-[#00bcd4] hover:text-[#00bcd4] transition-all"
//                     onClick={() => setUserType('client')}
//                   >
//                     <FaBriefcase className="text-4xl" />
//                     <span>I’m Looking for a Freelancer</span>
//                   </button>
//                   <button
//                     className="flex-1 p-6 border-2 border-[#e0e0e0] text-[#757575] rounded-xl bg-white font-semibold text-base flex flex-col items-center gap-3 hover:border-[#00bcd4] hover:text-[#00bcd4] transition-all"
//                     onClick={() => setUserType('freelancer')}
//                   >
//                     <FaUserTie className="text-4xl" />
//                     <span>I’m a Freelancer</span>
//                   </button>
//                 </div>
//               )}
//               {userType && (
//                 <form onSubmit={handleSignupSubmit}>
//                   <div className="mb-3 text-left">
//                     <label htmlFor="signupEmail" className="block text-sm font-semibold text-[#212121] mb-1">
//                       Email Address
//                     </label>
//                     <input
//                       type="email"
//                       id="signupEmail"
//                       placeholder="your.email@example.com"
//                       required
//                       className="w-full p-2 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0]"
//                       value={signupForm.email}
//                       onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
//                     />
//                   </div>
//                   <div className="mb-3 text-left">
//                     <label htmlFor="signupPassword" className="block text-sm font-semibold text-[#212121] mb-1">
//                       Password
//                     </label>
//                     <input
//                       type="password"
//                       id="signupPassword"
//                       placeholder="Create a password"
//                       required
//                       className="w-full p-2 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0]"
//                       value={signupForm.password}
//                       onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
//                     />
//                   </div>
//                   <div className="mb-3 text-left">
//                     <label htmlFor="signupConfirmPassword" className="block text-sm font-semibold text-[#212121] mb-1">
//                       Confirm Password
//                     </label>
//                     <input
//                       type="password"
//                       id="signupConfirmPassword"
//                       placeholder="Confirm your password"
//                       required
//                       className="w-full p-2 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0]"
//                       value={signupForm.confirmPassword}
//                       onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
//                     />
//                   </div>
//                   {userType === 'client' && (
//                     <div className="text-left">
//                       <div className="mb-3">
//                         <label htmlFor="clientName" className="block text-sm font-semibold text-[#212121] mb-1">
//                           Your Name
//                         </label>
//                         <input
//                           type="text"
//                           id="clientName"
//                           placeholder="e.g., Jane Doe"
//                           required
//                           className="w-full p-2 border border-[#e0e0e0] rounded-lg"
//                           value={signupForm.clientName}
//                           onChange={(e) => setSignupForm({ ...signupForm, clientName: e.target.value })}
//                         />
//                       </div>
//                       <div className="mb-3">
//                         <label htmlFor="companyName" className="block text-sm font-semibold text-[#212121] mb-1">
//                           Company Name (Optional)
//                         </label>
//                         <input
//                           type="text"
//                           id="companyName"
//                           placeholder="e.g., Creative Solutions Inc."
//                           className="w-full p-2 border border-[#e0e0e0] rounded-lg"
//                           value={signupForm.companyName}
//                           onChange={(e) => setSignupForm({ ...signupForm, companyName: e.target.value })}
//                         />
//                       </div>
//                     </div>
//                   )}
//                   {userType === 'freelancer' && (
//                     <div className="text-left">
//                       <div className="mb-3">
//                         <label htmlFor="freelancerFullName" className="block text-sm font-semibold text-[#212121] mb-1">
//                           Full Name
//                         </label>
//                         <input
//                           type="text"
//                           id="freelancerFullName"
//                           placeholder="e.g., John Smith"
//                           required
//                           className="w-full p-2 border border-[#e0e0e0] rounded-lg"
//                           value={signupForm.freelancerFullName}
//                           onChange={(e) => setSignupForm({ ...signupForm, freelancerFullName: e.target.value })}
//                         />
//                       </div>
//                       <div className="mb-3">
//                         <label htmlFor="freelancerProfession" className="block text-sm font-semibold text-[#212121] mb-1">
//                           Profession/Niche
//                         </label>
//                         <input
//                           type="text"
//                           id="freelancerProfession"
//                           placeholder="e.g., Web Developer, Graphic Designer"
//                           required
//                           className="w-full p-2 border border-[#e0e0e0] rounded-lg"
//                           value={signupForm.freelancerProfession}
//                           onChange={(e) => setSignupForm({ ...signupForm, freelancerProfession: e.target.value })}
//                         />
//                       </div>
//                       <div className="mb-3">
//                         <label htmlFor="freelancerPortfolio" className="block text-sm font-semibold text-[#212121] mb-1">
//                           Portfolio/Website (Optional)
//                         </label>
//                         <input
//                           type="url"
//                           id="freelancerPortfolio"
//                           placeholder="https://yourportfolio.com"
//                           className="w-full p-2 border border-[#e0e0e0] rounded-lg"
//                           value={signupForm.freelancerPortfolio}
//                           onChange={(e) => setSignupForm({ ...signupForm, freelancerPortfolio: e.target.value })}
//                         />
//                       </div>
//                       <div className="mb-3">
//                         <label htmlFor="freelancerBio" className="block text-sm font-semibold text-[#212121] mb-1">
//                           Short Bio
//                         </label>
//                         <textarea
//                           id="freelancerBio"
//                           rows="2"
//                           placeholder="Tell us about your skills and experience..."
//                           required
//                           className="w-full p-2 border border-[#e0e0e0] rounded-lg resize-y"
//                           value={signupForm.freelancerBio}
//                           onChange={(e) => setSignupForm({ ...signupForm, freelancerBio: e.target.value })}
//                         ></textarea>
//                       </div>
//                     </div>
//                   )}
//                   <button
//                     type="submit"
//                     className="mt-4 bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-5 py-3 rounded-full font-semibold text-base w-full hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all"
//                   >
//                     Create Account
//                   </button>
//                   <p className="mt-4 text-sm text-[#757575] text-center">
//                     Already have an account?{' '}
//                     <a
//                       href="#"
//                       className="font-semibold text-[#6a1b9a] hover:text-[#9c27b0]"
//                       onClick={(e) => {
//                         e.preventDefault();
//                         closeModal();
//                         openModal('loginModal');
//                       }}
//                     >
//                       Login
//                     </a>
//                   </p>
//                 </form>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default App;











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
    clientName: '',
    companyName: '',
    clientBio: '',
    clientWebsite: '',
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
      const formData = new FormData();
      formData.append('username', loginForm.email);
      formData.append('password', loginForm.password);

      const endpoint = loginForm.userType === 'freelancer' ? '/freelancers/login' : '/clients/login';
      const response = await axios.post(`http://localhost:8000${endpoint}`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const { access_token, client_id } = response.data;
      localStorage.setItem('token', access_token);
      alert('Login successful!');
      router.push(loginForm.userType === 'freelancer' ? `/freelancer/${client_id}` : `/client/${client_id}`);
      closeModal();
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
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
        company: signupForm.companyName || null,
        bio: signupForm.clientBio || null,
        website: signupForm.clientWebsite || null
      };
      const response = await axios.post(`http://localhost:8000${endpoint}`, payload);
      if (userType === 'client') {
        const { access_token, client_id } = response.data;
        localStorage.setItem('token', access_token);
        alert('Signup successful!');
        router.push(`/client/${client_id}`);
        closeModal();
      } else {
        alert('Signup successful! Please log in.');
        closeModal();
        openModal('loginModal');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
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