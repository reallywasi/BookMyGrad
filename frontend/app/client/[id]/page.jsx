// 'use client';

// import React, { useState, useEffect } from 'react';
// import { FaUserCircle, FaArrowRight, FaTimes, FaEnvelope, FaHome, FaProjectDiagram, FaInbox, FaEdit, FaSearch } from 'react-icons/fa';
// import { useParams, useRouter, useSearchParams } from 'next/navigation';
// import axios from 'axios';
// import ChatModal from '../../../component/page';

// // Centralized API base URL
// const API_BASE_URL = 'http://localhost:8000/api';

// export default function ClientDashboard() {
//   const [clientData, setClientData] = useState(null);
//   const [projectsData, setProjectsData] = useState([]);
//   const [discoverProjects, setDiscoverProjects] = useState([]);
//   const [inquiriesData, setInquiriesData] = useState([]);
//   const [selectedProject, setSelectedProject] = useState(null);
//   const [selectedFreelancer, setSelectedFreelancer] = useState(null);
//   const [activeModal, setActiveModal] = useState(null);
//   const [activeSection, setActiveSection] = useState('home');
//   const [editProfile, setEditProfile] = useState(null);
//   const [bookedProjects, setBookedProjects] = useState({});
//   const [error, setError] = useState('');
//   const { id } = useParams();
//   const router = useRouter();
//   const searchParams = useSearchParams();

//   const fetchClientData = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       if (!token) throw new Error('No authentication token found');
//       const response = await axios.get(`${API_BASE_URL}/clients/me`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (response.data.id !== parseInt(id)) {
//         throw new Error('Unauthorized access');
//       }
//       setClientData(response.data);
//       setEditProfile({
//         name: response.data.name,
//         company: response.data.company,
//         bio: response.data.bio || '',
//         website: response.data.website || '',
//       });
//     } catch (err) {
//       if (err.response?.status === 401) {
//         localStorage.removeItem('token');
//         router.push('/');
//       } else {
//         setError(err.response?.data?.detail || 'Failed to fetch client data');
//       }
//     }
//   };

//   const fetchMessages = async () => {
//     try {
//       const token = localStorage.getItem('token');
//       const response = await axios.get(`${API_BASE_URL}/messages/`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       // Group messages by freelancer for inquiries
//       const freelancers = {};
//       response.data.forEach(msg => {
//         if (msg.sender_type === 'freelancer') {
//           freelancers[msg.sender_id] = {
//             id: msg.sender_id,
//             freelancerName: `Freelancer ${msg.sender_id}`,
//             freelancerAvatar: `https://randomuser.me/api/portraits/men/${msg.sender_id}.jpg`,
//             message: msg.content,
//             timestamp: msg.timestamp,
//             portfolio: `https://freelancer${msg.sender_id}.design`,
//           };
//         }
//       });
//       const inquiries = Object.values(freelancers).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
//       setInquiriesData(inquiries);

//       // Extract projects from client messages
//       const projectMessages = response.data
//         .filter(msg => msg.sender_type === 'client' && msg.content.includes('booking your project'))
//         .map(msg => ({
//           id: msg.id.toString(),
//           title: msg.content.match(/"([^"]+)"/)?.[1] || 'Untitled Project',
//           freelancerName: `Freelancer ${msg.receiver_id}`,
//           freelancerBio: 'Experienced freelancer specializing in creative projects.',
//           freelancerAvatar: `https://randomuser.me/api/portraits/men/${msg.receiver_id}.jpg`,
//           price: (Math.floor(Math.random() * 1000) + 500).toString(),
//           image: `https://source.unsplash.com/random/800x600/?project,design${msg.id}`,
//           description: 'Project booked via message.',
//           designHighlights: ['Custom design', 'Responsive layout'],
//           technologies: ['Figma', 'React'],
//         }));
//       setProjectsData(projectMessages);
//     } catch (err) {
//       setError(err.response?.data?.detail || 'Failed to fetch messages');
//     }
//   };

//   const fetchDiscoverProjects = async () => {
//     try {
//       const response = await axios.get(`${API_BASE_URL}/projects/`);
//       const enrichedProjects = response.data.map(project => ({
//         ...project,
//         price: (Math.floor(Math.random() * 1000) + 500).toString(),
//         image: `https://source.unsplash.com/random/800x600/?project,design${project.id}`,
//         freelancerAvatar: `https://randomuser.me/api/portraits/men/${project.freelancer_id}.jpg`,
//         freelancerName: `Freelancer ${project.freelancer_id}`,
//         freelancerBio: 'Experienced freelancer specializing in creative projects.',
//         designHighlights: project.highlights.split(',').map(h => h.trim()),
//         technologies: project.technology_used.split(',').map(t => t.trim()),
//       }));
//       setDiscoverProjects(enrichedProjects);
//       // Load booked projects from localStorage
//       const storedBooked = JSON.parse(localStorage.getItem('bookedProjects') || '{}');
//       setBookedProjects(storedBooked);
//     } catch (err) {
//       setError(err.response?.data?.detail || 'Failed to fetch projects');
//     }
//   };

//   useEffect(() => {
//     fetchClientData();
//     fetchMessages();
//     fetchDiscoverProjects();
//     // Handle query parameters for auto-opening chat
//     const tab = searchParams.get('tab');
//     const freelancerId = searchParams.get('freelancer_id');
//     if (tab === 'inquiries' && freelancerId && clientData) {
//       const freelancer = inquiriesData.find(f => f.id === parseInt(freelancerId)) || {
//         id: parseInt(freelancerId),
//         freelancerName: `Freelancer ${freelancerId}`,
//         freelancerAvatar: `https://randomuser.me/api/portraits/men/${freelancerId}.jpg`,
//         portfolio: `https://freelancer${freelancerId}.design`,
//       };
//       setActiveSection('inquiries');
//       setSelectedFreelancer(freelancer);
//       setActiveModal('chatModal');
//     }
//   }, [clientData, inquiriesData, searchParams]);

//   const openModal = (modalType, project = null, freelancer = null) => {
//     setSelectedProject(project);
//     setSelectedFreelancer(freelancer);
//     setActiveModal(modalType);
//     document.body.style.overflow = 'hidden';
//   };

//   const closeModal = () => {
//     setActiveModal(null);
//     setSelectedProject(null);
//     setSelectedFreelancer(null);
//     setEditProfile(clientData ? {
//       name: clientData.name,
//       company: clientData.company,
//       bio: clientData.bio || '',
//       website: clientData.website || '',
//     } : null);
//     setError('');
//     document.body.style.overflow = '';
//   };

//   const handleBookProject = async (project) => {
//     if (!clientData) {
//       alert('Please log in to book a project.');
//       router.push('/');
//       return;
//     }
//     if (bookedProjects[project.id]) {
//       alert('This project is already booked!');
//       return;
//     }
//     if (confirm(`Are you sure you want to contact "${project.freelancerName}" about "${project.title}"?`)) {
//       try {
//         const token = localStorage.getItem('token');
//         await axios.post(
//           `${API_BASE_URL}/messages/`,
//           {
//             receiver_id: project.freelancer_id,
//             receiver_type: 'freelancer',
//             content: `I'm interested in booking your project: "${project.title}". Please let me know the next steps!`,
//           },
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         const updatedBooked = { ...bookedProjects, [project.id]: true };
//         setBookedProjects(updatedBooked);
//         localStorage.setItem('bookedProjects', JSON.stringify(updatedBooked));
//         alert(`Success! Your booking request for "${project.title}" has been sent to ${project.freelancerName}.`);
//         fetchMessages();
//         router.push(`/client/${clientData.id}?tab=inquiries&freelancer_id=${project.freelancer_id}`);
//         closeModal();
//       } catch (err) {
//         setError(err.response?.data?.detail || 'Failed to send booking request');
//       }
//     } else {
//       alert('Booking cancelled.');
//     }
//   };

//   const handleEditProfile = async (e) => {
//     e.preventDefault();
//     if (!editProfile.name || !editProfile.company) {
//       setError('Please fill in all required fields.');
//       return;
//     }
//     try {
//       const token = localStorage.getItem('token');
//       await axios.put(`${API_BASE_URL}/clients/me`, editProfile, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       alert('Profile updated successfully!');
//       fetchClientData();
//       closeModal();
//     } catch (err) {
//       setError(err.response?.data?.detail || 'Failed to update profile');
//     }
//   };

//   const handleInputChange = (e, setState) => {
//     const { name, value } = e.target;
//     setState(prev => ({ ...prev, [name]: value }));
//   };

//   const renderSection = () => {
//     switch (activeSection) {
//       case 'home':
//         return clientData ? (
//           <section id="home" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] flex flex-col items-center justify-center">
//             <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4 text-center">Welcome, {clientData.name}!</h2>
//             <p className="text-lg text-[#757575] mb-6 text-center max-w-[600px]">
//               Connect with talented freelancers and manage your projects seamlessly. Check your inquiries or explore new projects to get started.
//             </p>
//             <div className="flex gap-4">
//               <button
//                 onClick={() => setActiveSection('discover')}
//                 className="bg-[#00bcd4] text-white px-6 py-3 rounded-full font-semibold text-base inline-flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all"
//               >
//                 Discover Projects <FaSearch />
//               </button>
//               <button
//                 onClick={() => setActiveSection('inquiries')}
//                 className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all flex items-center gap-2"
//               >
//                 View Inquiries <FaInbox />
//               </button>
//             </div>
//           </section>
//         ) : (
//           <p className="text-center text-[#757575] text-lg">Loading...</p>
//         );
//       case 'projects':
//         return (
//           <section id="projects" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] overflow-y-auto">
//             {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
//             <div className="flex justify-between items-center mb-6">
//               <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Your Projects</h2>
//             </div>
//             <div className="space-y-8">
//               {projectsData.length > 0 ? (
//                 projectsData.map(project => (
//                   <div
//                     key={project.id}
//                     className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all flex flex-col md:flex-row overflow-hidden"
//                     onClick={() => openModal('projectDetailModal', project)}
//                   >
//                     <div className="md:w-1/3 bg-[#f0f4f8] p-6 flex flex-col items-center md:items-start text-center md:text-left">
//                       <img
//                         src={project.freelancerAvatar}
//                         alt={project.freelancerName}
//                         className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] mb-4"
//                       />
//                       <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a] mb-2">{project.freelancerName}</h3>
//                       <p className="text-sm text-[#757575] mb-4">{project.freelancerBio}</p>
//                     </div>
//                     <div className="md:w-2/3 p-6 flex flex-col">
//                       <img
//                         src={project.image}
//                         alt={project.title}
//                         className="w-full h-[200px] object-cover rounded-lg mb-4 border border-[#e0e0e0]"
//                       />
//                       <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{project.title}</h3>
//                       <p className="text-base text-[#757575] mb-4 flex-grow">{project.description}</p>
//                       <div className="flex flex-wrap gap-2 mb-4">
//                         {project.technologies.map((tech, i) => (
//                           <span key={i} className="bg-[#00bcd4] text-white px-3 py-1 rounded-full text-sm font-semibold">
//                             {tech}
//                           </span>
//                         ))}
//                       </div>
//                       <div className="flex justify-between items-center pt-4 border-t border-[#e0e0e0]">
//                         <span className="text-2xl font-bold text-[#00bcd4]">${project.price}</span>
//                         <span className="bg-[#e0f7fa] text-[#00bcd4] px-4 py-2 rounded-full font-semibold text-sm">
//                           Contacted
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 ))
//               ) : (
//                 <p className="text-center text-[#757575] text-lg">No projects contacted yet. Explore the discover section to find projects!</p>
//               )}
//             </div>
//           </section>
//         );
//       case 'discover':
//         return (
//           <section id="discover" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] overflow-y-auto">
//             {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
//             <div className="flex justify-between items-center mb-6">
//               <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Discover Projects</h2>
//             </div>
//             <div className="space-y-8">
//               {discoverProjects.length > 0 ? (
//                 discoverProjects.map(project => (
//                   <div
//                     key={project.id}
//                     className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all flex flex-col md:flex-row overflow-hidden"
//                     onClick={() => openModal('projectDetailModal', project)}
//                   >
//                     <div className="md:w-1/3 bg-[#f0f4f8] p-6 flex flex-col items-center md:items-start text-center md:text-left">
//                       <img
//                         src={project.freelancerAvatar}
//                         alt={project.freelancerName}
//                         className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] mb-4"
//                       />
//                       <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a] mb-2">{project.freelancerName}</h3>
//                       <p className="text-sm text-[#757575] mb-4">{project.freelancerBio}</p>
//                     </div>
//                     <div className="md:w-2/3 p-6 flex flex-col">
//                       <img
//                         src={project.image}
//                         alt={project.title}
//                         className="w-full h-[200px] object-cover rounded-lg mb-4 border border-[#e0e0e0]"
//                       />
//                       <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{project.title}</h3>
//                       <p className="text-base text-[#757575] mb-4 flex-grow">{project.description}</p>
//                       <div className="flex flex-wrap gap-2 mb-4">
//                         {project.technologies.map((tech, i) => (
//                           <span key={i} className="bg-[#00bcd4] text-white px-3 py-1 rounded-full text-sm font-semibold">
//                             {tech}
//                           </span>
//                         ))}
//                       </div>
//                       <div className="flex justify-between items-center pt-4 border-t border-[#e0e0e0]">
//                         <span className="text-2xl font-bold text-[#00bcd4]">${project.price}</span>
//                         <button
//                           className={`bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all ${bookedProjects[project.id] ? 'bg-[#ccc] cursor-not-allowed transform-none shadow-none' : ''}`}
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             handleBookProject(project);
//                           }}
//                           disabled={bookedProjects[project.id]}
//                         >
//                           {bookedProjects[project.id] ? 'Booked!' : 'Book Now'}
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 ))
//               ) : (
//                 <p className="text-center text-[#757575] text-lg">No projects available.</p>
//               )}
//             </div>
//           </section>
//         );
//       case 'inquiries':
//         return (
//           <section id="inquiries" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)]">
//             {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
//             <div className="flex justify-between items-center mb-6">
//               <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Freelancer Inquiries</h2>
//               <span className="text-sm text-[#757575]">{inquiriesData.length} Inquiries</span>
//             </div>
//             <div className="overflow-y-auto overflow-x-hidden max-h-[calc(100vh-160px)] space-y-6">
//               {inquiriesData.length > 0 ? (
//                 inquiriesData.map(freelancer => (
//                   <div
//                     key={freelancer.id}
//                     className="flex items-center gap-4 p-4 bg-[#f0f4f8] rounded-lg hover:bg-[#e0f7fa] transition-colors"
//                   >
//                     <img
//                       src={freelancer.freelancerAvatar}
//                       alt={freelancer.freelancerName}
//                       className="w-12 h-12 rounded-full object-cover border-2 border-[#9c27b0]"
//                     />
//                     <div className="flex-grow">
//                       <h4 className="font-montserrat font-bold text-lg text-[#6a1b9a] mb-1">{freelancer.freelancerName}</h4>
//                       <p className="text-sm text-[#757575] mb-1 line-clamp-2">{freelancer.message}</p>
//                       <p className="text-xs text-[#9e9e9e] m-0">Received: {new Date(freelancer.timestamp).toLocaleString()}</p>
//                     </div>
//                     <div className="flex gap-2">
//                       <a
//                         href={freelancer.portfolio}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="bg-[#00bcd4] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 transition-all"
//                       >
//                         View Profile <FaArrowRight />
//                       </a>
//                       <button
//                         className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all"
//                         onClick={() => openModal('chatModal', null, freelancer)}
//                       >
//                         Chat
//                       </button>
//                     </div>
//                   </div>
//                 ))
//               ) : (
//                 <p className="text-center text-[#757575] text-lg">No freelancer inquiries yet.</p>
//               )}
//             </div>
//           </section>
//         );
//       default:
//         return null;
//     }
//   };

//   if (!clientData) {
//     return <p className="text-center text-[#757575] text-lg">Loading...</p>;
//   }

//   return (
//     <div className="font-sans text-[#212121] leading-relaxed bg-[#f5f5f5] min-h-screen">
//       <header className="bg-white py-4 shadow-[0_2px_10px_rgba(0,0,0,0.08)] sticky top-0 z-[1000]">
//         <div className="max-w-[1200px] mx-auto px-6 flex justify-between items-center">
//           <div className="text-3xl font-bold text-[#6a1b9a]">
//             <a href="/" className="text-inherit no-underline">CreativeHub</a>
//           </div>
//           <nav className="md:hidden">
//             <button
//               className="text-[#757575] text-2xl"
//               onClick={() => setActiveSection(activeSection === 'home' ? 'inquiries' : 'home')}
//             >
//               <FaUserCircle />
//             </button>
//           </nav>
//         </div>
//       </header>

//       <main className="py-12">
//         <div className="max-w-[1200px] mx-auto px-6 flex flex-col lg:flex-row gap-8">
//           <aside className="lg:w-[30%] bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-6 sticky top-20 h-[calc(100vh-80px)] flex flex-col">
//             <div className="flex flex-col items-center text-center mb-8">
//               <img
//                 src="https://randomuser.me/api/portraits/men/50.jpg"
//                 alt={clientData.name}
//                 className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] shadow-[0_2px_10px_rgba(0,0,0,0.1)] mb-4"
//               />
//               <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{clientData.name}</h2>
//               <p className="text-lg text-[#757575] mb-2">{clientData.company}</p>
//               <p className="text-sm text-[#757575] mb-4">{clientData.bio || 'No bio provided'}</p>
//               <div className="flex flex-col gap-3 w-full">
//                 <a
//                   href={clientData.website || '#'}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="bg-[#00bcd4] text-white px-6 py-3 rounded-full font-semibold text-base inline-flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all justify-center"
//                 >
//                   View Website <FaArrowRight />
//                 </a>
//                 <button
//                   className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all flex items-center gap-2 justify-center"
//                   onClick={() => openModal('editProfileModal')}
//                 >
//                   Edit Profile <FaEdit />
//                 </button>
//               </div>
//             </div>
//             <nav className="space-y-4 mt-auto">
//               <button
//                 onClick={() => setActiveSection('home')}
//                 className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'home' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
//               >
//                 <FaHome /> Home
//               </button>
//               <button
//                 onClick={() => setActiveSection('discover')}
//                 className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'discover' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
//               >
//                 <FaSearch /> Discover
//               </button>
//               <button
//                 onClick={() => setActiveSection('projects')}
//                 className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'projects' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
//               >
//                 <FaProjectDiagram /> Projects
//               </button>
//               <button
//                 onClick={() => setActiveSection('inquiries')}
//                 className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'inquiries' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
//               >
//                 <FaInbox /> Inquiries
//               </button>
//             </nav>
//           </aside>

//           <div className="lg:w-[70%]">{renderSection()}</div>
//         </div>
//       </main>

//       {activeModal === 'projectDetailModal' && selectedProject && (
//         <div
//           className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
//           onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
//         >
//           <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[900px] max-h-[90vh] overflow-y-auto relative transform translate-y-0 transition-transform">
//             <button
//               className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
//               onClick={closeModal}
//             >
//               <FaTimes />
//             </button>
//             <div className="w-full h-[350px] overflow-hidden border-b border-[#e0e0e0]">
//               <img src={selectedProject.image} alt={selectedProject.title} className="w-full h-full object-cover" />
//             </div>
//             <div className="p-8 text-center">
//               <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4">{selectedProject.title}</h2>
//               <p className="text-base text-[#212121] mb-6">{selectedProject.description}</p>
//               {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
//               <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
//               <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Design Highlights</h3>
//               <ul className="list-none p-0 mb-6 text-left">
//                 {selectedProject.designHighlights.map((highlight, i) => (
//                   <li key={i} className="bg-[#f0f4f8] border-l-4 border-[#00bcd4] p-3 mb-2 rounded text-base text-[#212121]">
//                     {highlight}
//                   </li>
//                 ))}
//               </ul>
//               <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Technologies Used</h3>
//               <div className="flex flex-wrap gap-2 mb-6 justify-start">
//                 {selectedProject.technologies.map((tech, i) => (
//                   <span key={i} className="bg-[#00bcd4] text-white px-4 py-2 rounded-full text-sm font-semibold">
//                     {tech}
//                   </span>
//                 ))}
//               </div>
//               <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
//               <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">About the Freelancer</h3>
//               <div className="flex items-center gap-5 mb-8">
//                 <img
//                   src={selectedProject.freelancerAvatar}
//                   alt={selectedProject.freelancerName}
//                   className="w-20 h-20 rounded-full object-cover border-2 border-[#9c27b0] shadow-[0_2px_10px_rgba(0,0,0,0.1)]"
//                 />
//                 <div>
//                   <h4 className="font-montserrat font-bold text-xl text-[#6a1b9a] m-0">{selectedProject.freelancerName}</h4>
//                   <p className="text-sm text-[#757575] mt-1 mb-0">{selectedProject.freelancerBio}</p>
//                 </div>
//               </div>
//               <div className="border-t border-[#e0e0e0] pt-6 flex flex-col md:flex-row justify-between items-center gap-5 mt-8">
//                 <span className="text-3xl font-bold text-[#00bcd4]">${selectedProject.price}</span>
//                 <button
//                   className={`bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full md:w-auto ${bookedProjects[selectedProject.id] ? 'bg-[#ccc] cursor-not-allowed transform-none shadow-none' : ''}`}
//                   onClick={() => handleBookProject(selectedProject)}
//                   disabled={bookedProjects[selectedProject.id]}
//                 >
//                   {bookedProjects[selectedProject.id] ? 'Booked!' : 'Book Now'}
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {activeModal === 'editProfileModal' && editProfile && (
//         <div
//           className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
//           onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
//         >
//           <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[600px] max-h-[90vh] overflow-y-auto relative p-8">
//             <button
//               className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
//               onClick={closeModal}
//             >
//               <FaTimes />
//             </button>
//             <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a] mb-6 text-center">Edit Profile</h2>
//             {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
//             <div className="space-y-6">
//               <div>
//                 <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Name</label>
//                 <input
//                   type="text"
//                   name="name"
//                   value={editProfile.name}
//                   onChange={(e) => handleInputChange(e, setEditProfile)}
//                   className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
//                   placeholder="Enter your name"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Company</label>
//                 <input
//                   type="text"
//                   name="company"
//                   value={editProfile.company}
//                   onChange={(e) => handleInputChange(e, setEditProfile)}
//                   className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
//                   placeholder="Enter your company"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Bio</label>
//                 <textarea
//                   name="bio"
//                   value={editProfile.bio}
//                   onChange={(e) => handleInputChange(e, setEditProfile)}
//                   className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
//                   rows="4"
//                   placeholder="Enter your bio"
//                 ></textarea>
//               </div>
//               <div>
//                 <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Website URL</label>
//                 <input
//                   type="url"
//                   name="website"
//                   value={editProfile.website}
//                   onChange={(e) => handleInputChange(e, setEditProfile)}
//                   className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
//                   placeholder="Enter website URL"
//                 />
//               </div>
//               <button
//                 className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full"
//                 onClick={handleEditProfile}
//               >
//                 Save Profile
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {activeModal === 'chatModal' && selectedFreelancer && clientData && (
//         <ChatModal client={clientData} freelancer={selectedFreelancer} onClose={closeModal} />
//       )}
//     </div>
//   );
// }






'use client';

import React, { useState, useEffect } from 'react';
import { FaUserCircle, FaArrowRight, FaTimes, FaEnvelope, FaHome, FaProjectDiagram, FaInbox, FaEdit, FaSearch } from 'react-icons/fa';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import ChatModal from '../../../component/page';

// Centralized API base URL
const API_BASE_URL = 'http://localhost:8000/api';

export default function ClientDashboard() {
  const [clientData, setClientData] = useState(null);
  const [projectsData, setProjectsData] = useState([]);
  const [discoverProjects, setDiscoverProjects] = useState([]);
  const [inquiriesData, setInquiriesData] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [activeSection, setActiveSection] = useState('home');
  const [editProfile, setEditProfile] = useState(null);
  const [bookedProjects, setBookedProjects] = useState({});
  const [error, setError] = useState('');
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchClientData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      const response = await axios.get(`${API_BASE_URL}/clients/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.id !== parseInt(id)) {
        throw new Error('Unauthorized access');
      }
      setClientData(response.data);
      setEditProfile({
        name: response.data.name,
        company: response.data.company,
        bio: response.data.bio || '',
        website: response.data.website || '',
      });
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch client data');
      }
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/messages/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Group messages by freelancer for inquiries
      const freelancers = {};
      response.data.forEach(msg => {
        if (msg.sender_type === 'freelancer') {
          freelancers[msg.sender_id] = {
            id: msg.sender_id,
            freelancerName: `Freelancer ${msg.sender_id}`,
            freelancerAvatar: `https://randomuser.me/api/portraits/men/${msg.sender_id}.jpg`,
            message: msg.content,
            timestamp: msg.timestamp,
            portfolio: `https://freelancer${msg.sender_id}.design`,
          };
        }
      });
      const inquiries = Object.values(freelancers).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setInquiriesData(inquiries);

      // Extract projects from client messages
      const projectMessages = response.data
        .filter(msg => msg.sender_type === 'client' && msg.content.includes('booking your project'))
        .map(msg => ({
          id: msg.id.toString(),
          title: msg.content.match(/"([^"]+)"/)?.[1] || 'Untitled Project',
          freelancerName: `Freelancer ${msg.receiver_id}`,
          freelancerBio: 'Experienced freelancer specializing in creative projects.',
          freelancerAvatar: `https://randomuser.me/api/portraits/men/${msg.receiver_id}.jpg`,
          price: (Math.floor(Math.random() * 1000) + 500).toString(),
          image: `https://source.unsplash.com/random/800x600/?project,design${msg.id}`,
          description: 'Project booked via message.',
          designHighlights: ['Custom design', 'Responsive layout'],
          technologies: ['Figma', 'React'],
        }));
      setProjectsData(projectMessages);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch messages');
    }
  };

  const fetchDiscoverProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/`);
      const enrichedProjects = response.data.map(project => ({
        ...project,
        price: (Math.floor(Math.random() * 1000) + 500).toString(),
        image: `https://source.unsplash.com/random/800x600/?project,design${project.id}`,
        freelancerAvatar: `https://randomuser.me/api/portraits/men/${project.freelancer_id}.jpg`,
        freelancerName: `Freelancer ${project.freelancer_id}`,
        freelancerBio: 'Experienced freelancer specializing in creative projects.',
        designHighlights: project.highlights.split(',').map(h => h.trim()),
        technologies: project.technology_used.split(',').map(t => t.trim()),
      }));
      setDiscoverProjects(enrichedProjects);
      // Load booked projects from localStorage
      const storedBooked = JSON.parse(localStorage.getItem('bookedProjects') || '{}');
      setBookedProjects(storedBooked);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch projects');
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchClientData();
    fetchMessages();
    fetchDiscoverProjects();
  }, []); // Empty dependency array to run only once on mount

  // Handle query parameters for auto-opening chat
  useEffect(() => {
    const tab = searchParams.get('tab');
    const freelancerId = searchParams.get('freelancer_id');
    if (tab === 'inquiries' && freelancerId && clientData && inquiriesData.length > 0) {
      const freelancer = inquiriesData.find(f => f.id === parseInt(freelancerId)) || {
        id: parseInt(freelancerId),
        freelancerName: `Freelancer ${freelancerId}`,
        freelancerAvatar: `https://randomuser.me/api/portraits/men/${freelancerId}.jpg`,
        portfolio: `https://freelancer${freelancerId}.design`,
      };
      setActiveSection('inquiries');
      setSelectedFreelancer(freelancer);
      setActiveModal('chatModal');
    }
  }, [searchParams, clientData, inquiriesData]);

  const openModal = (modalType, project = null, freelancer = null) => {
    setSelectedProject(project);
    setSelectedFreelancer(freelancer);
    setActiveModal(modalType);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedProject(null);
    setSelectedFreelancer(null);
    setEditProfile(clientData ? {
      name: clientData.name,
      company: clientData.company,
      bio: clientData.bio || '',
      website: clientData.website || '',
    } : null);
    setError('');
    document.body.style.overflow = '';
  };

  const handleBookProject = async (project) => {
    if (!clientData) {
      alert('Please log in to book a project.');
      router.push('/');
      return;
    }
    if (bookedProjects[project.id]) {
      alert('This project is already booked!');
      return;
    }
    if (confirm(`Are you sure you want to contact "${project.freelancerName}" about "${project.title}"?`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.post(
          `${API_BASE_URL}/messages/`,
          {
            receiver_id: project.freelancer_id,
            receiver_type: 'freelancer',
            content: `I'm interested in booking your project: "${project.title}". Please let me know the next steps!`,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const updatedBooked = { ...bookedProjects, [project.id]: true };
        setBookedProjects(updatedBooked);
        localStorage.setItem('bookedProjects', JSON.stringify(updatedBooked));
        alert(`Success! Your booking request for "${project.title}" has been sent to ${project.freelancerName}.`);
        fetchMessages(); // Refresh messages to update inquiries
        router.push(`/client/${clientData.id}?tab=inquiries&freelancer_id=${project.freelancer_id}`);
        closeModal();
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to send booking request');
      }
    } else {
      alert('Booking cancelled.');
    }
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    if (!editProfile.name || !editProfile.company) {
      setError('Please fill in all required fields.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/clients/me`, editProfile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Profile updated successfully!');
      fetchClientData(); // Refresh client data after update
      closeModal();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  const handleInputChange = (e, setState) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return clientData ? (
          <section id="home" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] flex flex-col items-center justify-center">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4 text-center">Welcome, {clientData.name}!</h2>
            <p className="text-lg text-[#757575] mb-6 text-center max-w-[600px]">
              Connect with talented freelancers and manage your projects seamlessly. Check your inquiries or explore new projects to get started.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setActiveSection('discover')}
                className="bg-[#00bcd4] text-white px-6 py-3 rounded-full font-semibold text-base inline-flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all"
              >
                Discover Projects <FaSearch />
              </button>
              <button
                onClick={() => setActiveSection('inquiries')}
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                View Inquiries <FaInbox />
              </button>
            </div>
          </section>
        ) : (
          <p className="text-center text-[#757575] text-lg">Loading...</p>
        );
      case 'projects':
        return (
          <section id="projects" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] overflow-y-auto">
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Your Projects</h2>
            </div>
            <div className="space-y-8">
              {projectsData.length > 0 ? (
                projectsData.map(project => (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all flex flex-col md:flex-row overflow-hidden"
                    onClick={() => openModal('projectDetailModal', project)}
                  >
                    <div className="md:w-1/3 bg-[#f0f4f8] p-6 flex flex-col items-center md:items-start text-center md:text-left">
                      <img
                        src={project.freelancerAvatar}
                        alt={project.freelancerName}
                        className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] mb-4"
                      />
                      <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a] mb-2">{project.freelancerName}</h3>
                      <p className="text-sm text-[#757575] mb-4">{project.freelancerBio}</p>
                    </div>
                    <div className="md:w-2/3 p-6 flex flex-col">
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-[200px] object-cover rounded-lg mb-4 border border-[#e0e0e0]"
                      />
                      <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{project.title}</h3>
                      <p className="text-base text-[#757575] mb-4 flex-grow">{project.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.technologies.map((tech, i) => (
                          <span key={i} className="bg-[#00bcd4] text-white px-3 py-1 rounded-full text-sm font-semibold">
                            {tech}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-[#e0e0e0]">
                        <span className="text-2xl font-bold text-[#00bcd4]">${project.price}</span>
                        <span className="bg-[#e0f7fa] text-[#00bcd4] px-4 py-2 rounded-full font-semibold text-sm">
                          Contacted
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#757575] text-lg">No projects contacted yet. Explore the discover section to find projects!</p>
              )}
            </div>
          </section>
        );
      case 'discover':
        return (
          <section id="discover" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] overflow-y-auto">
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Discover Projects</h2>
            </div>
            <div className="space-y-8">
              {discoverProjects.length > 0 ? (
                discoverProjects.map(project => (
                  <div
                    key={project.id}
                    className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all flex flex-col md:flex-row overflow-hidden"
                    onClick={() => openModal('projectDetailModal', project)}
                  >
                    <div className="md:w-1/3 bg-[#f0f4f8] p-6 flex flex-col items-center md:items-start text-center md:text-left">
                      <img
                        src={project.freelancerAvatar}
                        alt={project.freelancerName}
                        className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] mb-4"
                      />
                      <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a] mb-2">{project.freelancerName}</h3>
                      <p className="text-sm text-[#757575] mb-4">{project.freelancerBio}</p>
                    </div>
                    <div className="md:w-2/3 p-6 flex flex-col">
                      <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-[200px] object-cover rounded-lg mb-4 border border-[#e0e0e0]"
                      />
                      <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{project.title}</h3>
                      <p className="text-base text-[#757575] mb-4 flex-grow">{project.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.technologies.map((tech, i) => (
                          <span key={i} className="bg-[#00bcd4] text-white px-3 py-1 rounded-full text-sm font-semibold">
                            {tech}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-[#e0e0e0]">
                        <span className="text-2xl font-bold text-[#00bcd4]">${project.price}</span>
                        <button
                          className={`bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all ${bookedProjects[project.id] ? 'bg-[#ccc] cursor-not-allowed transform-none shadow-none' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBookProject(project);
                          }}
                          disabled={bookedProjects[project.id]}
                        >
                          {bookedProjects[project.id] ? 'Booked!' : 'Book Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#757575] text-lg">No projects available.</p>
              )}
            </div>
          </section>
        );
      case 'inquiries':
        return (
          <section id="inquiries" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)]">
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Freelancer Inquiries</h2>
              <span className="text-sm text-[#757575]">{inquiriesData.length} Inquiries</span>
            </div>
            <div className="overflow-y-auto overflow-x-hidden max-h-[calc(100vh-160px)] space-y-6">
              {inquiriesData.length > 0 ? (
                inquiriesData.map(freelancer => (
                  <div
                    key={freelancer.id}
                    className="flex items-center gap-4 p-4 bg-[#f0f4f8] rounded-lg hover:bg-[#e0f7fa] transition-colors"
                  >
                    <img
                      src={freelancer.freelancerAvatar}
                      alt={freelancer.freelancerName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#9c27b0]"
                    />
                    <div className="flex-grow">
                      <h4 className="font-montserrat font-bold text-lg text-[#6a1b9a] mb-1">{freelancer.freelancerName}</h4>
                      <p className="text-sm text-[#757575] mb-1 line-clamp-2">{freelancer.message}</p>
                      <p className="text-xs text-[#9e9e9e] m-0">Received: {new Date(freelancer.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={freelancer.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#00bcd4] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 transition-all"
                      >
                        View Profile <FaArrowRight />
                      </a>
                      <button
                        className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all"
                        onClick={() => openModal('chatModal', null, freelancer)}
                      >
                        Chat
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#757575] text-lg">No freelancer inquiries yet.</p>
              )}
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  if (!clientData) {
    return <p className="text-center text-[#757575] text-lg">Loading...</p>;
  }

  return (
    <div className="font-sans text-[#212121] leading-relaxed bg-[#f5f5f5] min-h-screen">
      <header className="bg-white py-4 shadow-[0_2px_10px_rgba(0,0,0,0.08)] sticky top-0 z-[1000]">
        <div className="max-w-[1200px] mx-auto px-6 flex justify-between items-center">
          <div className="text-3xl font-bold text-[#6a1b9a]">
            <a href="/" className="text-inherit no-underline">CreativeHub</a>
          </div>
          <nav className="md:hidden">
            <button
              className="text-[#757575] text-2xl"
              onClick={() => setActiveSection(activeSection === 'home' ? 'inquiries' : 'home')}
            >
              <FaUserCircle />
            </button>
          </nav>
        </div>
      </header>

      <main className="py-12">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-[30%] bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-6 sticky top-20 h-[calc(100vh-80px)] flex flex-col">
            <div className="flex flex-col items-center text-center mb-8">
              <img
                src="https://randomuser.me/api/portraits/men/50.jpg"
                alt={clientData.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] shadow-[0_2px_10px_rgba(0,0,0,0.1)] mb-4"
              />
              <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{clientData.name}</h2>
              <p className="text-lg text-[#757575] mb-2">{clientData.company}</p>
              <p className="text-sm text-[#757575] mb-4">{clientData.bio || 'No bio provided'}</p>
              <div className="flex flex-col gap-3 w-full">
                <a
                  href={clientData.website || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#00bcd4] text-white px-6 py-3 rounded-full font-semibold text-base inline-flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all justify-center"
                >
                  View Website <FaArrowRight />
                </a>
                <button
                  className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all flex items-center gap-2 justify-center"
                  onClick={() => openModal('editProfileModal')}
                >
                  Edit Profile <FaEdit />
                </button>
              </div>
            </div>
            <nav className="space-y-4 mt-auto">
              <button
                onClick={() => setActiveSection('home')}
                className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'home' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
              >
                <FaHome /> Home
              </button>
              <button
                onClick={() => setActiveSection('discover')}
                className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'discover' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
              >
                <FaSearch /> Discover
              </button>
              <button
                onClick={() => setActiveSection('projects')}
                className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'projects' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
              >
                <FaProjectDiagram /> Projects
              </button>
              <button
                onClick={() => setActiveSection('inquiries')}
                className={`flex items-center gap-3 w-full text-left font-semibold text-base ${activeSection === 'inquiries' ? 'text-[#6a1b9a]' : 'text-[#757575]'} hover:text-[#6a1b9a] transition-colors`}
              >
                <FaInbox /> Inquiries
              </button>
            </nav>
          </aside>

          <div className="lg:w-[70%]">{renderSection()}</div>
        </div>
      </main>

      {activeModal === 'projectDetailModal' && selectedProject && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[900px] max-h-[90vh] overflow-y-auto relative transform translate-y-0 transition-transform">
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
              onClick={closeModal}
            >
              <FaTimes />
            </button>
            <div className="w-full h-[350px] overflow-hidden border-b border-[#e0e0e0]">
              <img src={selectedProject.image} alt={selectedProject.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-8 text-center">
              <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4">{selectedProject.title}</h2>
              <p className="text-base text-[#212121] mb-6">{selectedProject.description}</p>
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Design Highlights</h3>
              <ul className="list-none p-0 mb-6 text-left">
                {selectedProject.designHighlights.map((highlight, i) => (
                  <li key={i} className="bg-[#f0f4f8] border-l-4 border-[#00bcd4] p-3 mb-2 rounded text-base text-[#212121]">
                    {highlight}
                  </li>
                ))}
              </ul>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Technologies Used</h3>
              <div className="flex flex-wrap gap-2 mb-6 justify-start">
                {selectedProject.technologies.map((tech, i) => (
                  <span key={i} className="bg-[#00bcd4] text-white px-4 py-2 rounded-full text-sm font-semibold">
                    {tech}
                  </span>
                ))}
              </div>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">About the Freelancer</h3>
              <div className="flex items-center gap-5 mb-8">
                <img
                  src={selectedProject.freelancerAvatar}
                  alt={selectedProject.freelancerName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#9c27b0] shadow-[0_2px_10px_rgba(0,0,0,0.1)]"
                />
                <div>
                  <h4 className="font-montserrat font-bold text-xl text-[#6a1b9a] m-0">{selectedProject.freelancerName}</h4>
                  <p className="text-sm text-[#757575] mt-1 mb-0">{selectedProject.freelancerBio}</p>
                </div>
              </div>
              <div className="border-t border-[#e0e0e0] pt-6 flex flex-col md:flex-row justify-between items-center gap-5 mt-8">
                <span className="text-3xl font-bold text-[#00bcd4]">${selectedProject.price}</span>
                <button
                  className={`bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full md:w-auto ${bookedProjects[selectedProject.id] ? 'bg-[#ccc] cursor-not-allowed transform-none shadow-none' : ''}`}
                  onClick={() => handleBookProject(selectedProject)}
                  disabled={bookedProjects[selectedProject.id]}
                >
                  {bookedProjects[selectedProject.id] ? 'Booked!' : 'Book Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'editProfileModal' && editProfile && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity"
          onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}
        >
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[600px] max-h-[90vh] overflow-y-auto relative p-8">
            <button
              className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10"
              onClick={closeModal}
            >
              <FaTimes />
            </button>
            <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a] mb-6 text-center">Edit Profile</h2>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={editProfile.name}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Company</label>
                <input
                  type="text"
                  name="company"
                  value={editProfile.company}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter your company"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={editProfile.bio}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  rows="4"
                  placeholder="Enter your bio"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Website URL</label>
                <input
                  type="url"
                  name="website"
                  value={editProfile.website}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter website URL"
                />
              </div>
              <button
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full"
                onClick={handleEditProfile}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'chatModal' && selectedFreelancer && clientData && (
        <ChatModal client={clientData} freelancer={selectedFreelancer} onClose={closeModal} />
      )}
    </div>
  );
}