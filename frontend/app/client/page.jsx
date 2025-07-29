'use client';

import React, { useState } from 'react';
import { FaUserCircle, FaArrowRight, FaTimes, FaEnvelope, FaHome, FaProjectDiagram, FaInbox, FaPlus, FaEdit } from 'react-icons/fa';
import ChatModal from '../../component/page';

// Mock initial client data
const initialClientData = {
  name: 'John Doe',
  company: 'TechStartup Inc.',
  bio: 'Founder of TechStartup Inc., focused on innovative SaaS solutions. Looking for talented UX/UI designers to bring our vision to life.',
  avatar: 'https://randomuser.me/api/portraits/men/50.jpg',
  website: 'https://techstartup.com',
};

// Mock projects data (booked or interested projects)
const initialProjectsData = [
  {
    id: '1',
    title: 'SaaS Product Landing Page',
    freelancerName: 'Anya Sharma',
    freelancerBio: 'UX/UI Designer with 7+ years of experience specializing in web applications and SaaS platforms. Passionate about user-centric design, creating intuitive and beautiful interfaces.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    price: '1200',
    image: 'https://source.unsplash.com/random/800x600/?saas-landing-page,web-design',
    description: 'A sleek, conversion-optimized landing page designed for a new SaaS product. This project focused on clear value proposition, engaging animations, and seamless call-to-actions to maximize user engagement. Delivered with fully responsive designs for desktop and mobile, ensuring optimal viewing across all devices.',
    designHighlights: [
      'Modern, minimalist aesthetic',
      'Intuitive navigation and user flow',
      'Optimized for high conversion rates',
      'Custom vector iconography and illustrations',
      'Consistent brand storytelling',
    ],
    technologies: ['Figma', 'HTML5', 'CSS3 (SCSS)', 'JavaScript (React)', 'Webflow'],
  },
];

// Mock inquiries data (freelancers contacted)
const inquiriesData = [
  {
    id: '1',
    freelancerName: 'Anya Sharma',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    message: 'Thanks for reaching out! I’m excited to discuss your SaaS landing page project.',
    timestamp: '2025-07-20 14:35',
    portfolio: 'https://anyasharma.design',
  },
  {
    id: '2',
    freelancerName: 'Michael Lee',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/65.jpg',
    message: 'Your project sounds interesting! Can we discuss the scope and timeline?',
    timestamp: '2025-07-19 10:00',
    portfolio: 'https://michaellee.design',
  },
];

export default function ClientDashboard() {
  const [clientData, setClientData] = useState(initialClientData);
  const [projectsData, setProjectsData] = useState(initialProjectsData);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [bookedProjects, setBookedProjects] = useState({});
  const [activeModal, setActiveModal] = useState(null);
  const [activeSection, setActiveSection] = useState('inquiries');
  const [editProfile, setEditProfile] = useState({
    name: clientData.name,
    company: clientData.company,
    bio: clientData.bio,
    avatar: clientData.avatar,
    website: clientData.website,
  });

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
    setEditProfile({
      name: clientData.name,
      company: clientData.company,
      bio: clientData.bio,
      avatar: clientData.avatar,
      website: clientData.website,
    });
    document.body.style.overflow = '';
  };

  const handleBookProject = (project) => {
    if (bookedProjects[project.id]) {
      alert('This project is already booked!');
      return;
    }
    if (confirm(`Are you sure you want to book "${project.title}" from ${project.freelancerName}?`)) {
      setTimeout(() => {
        alert(`Success! Your booking request for "${project.title}" has been sent to ${project.freelancerName}.`);
        setBookedProjects({ ...bookedProjects, [project.id]: true });
        closeModal();
      }, 500);
    } else {
      alert('Booking cancelled.');
    }
  };

  const handleEditProfile = (e) => {
    e.preventDefault();
    if (!editProfile.name || !editProfile.company || !editProfile.bio || !editProfile.avatar || !editProfile.website) {
      alert('Please fill in all fields.');
      return;
    }
    setClientData(editProfile);
    alert('Profile updated successfully!');
    closeModal();
  };

  const handleInputChange = (e, setState) => {
    const { name, value } = e.target;
    setState(prev => ({ ...prev, [name]: value }));
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return (
          <section id="home" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] flex flex-col items-center justify-center">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4 text-center">Welcome, {clientData.name}!</h2>
            <p className="text-lg text-[#757575] mb-6 text-center max-w-[600px]">
              Connect with talented freelancers and manage your projects seamlessly. Check your inquiries or explore booked projects to get started.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setActiveSection('projects')}
                className="bg-[#00bcd4] text-white px-6 py-3 rounded-full font-semibold text-base inline-flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all"
              >
                View Projects <FaProjectDiagram />
              </button>
              <button
                onClick={() => setActiveSection('inquiries')}
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                View Inquiries <FaInbox />
              </button>
            </div>
          </section>
        );
      case 'projects':
        return (
          <section id="projects" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] overflow-y-auto">
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
                        <span
                          className={`px-4 py-2 rounded-full font-semibold text-sm ${bookedProjects[project.id] ? 'bg-[#ccc] text-[#212121]' : 'bg-[#e0f7fa] text-[#00bcd4]'}`}
                        >
                          {bookedProjects[project.id] ? 'Booked' : 'Available'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#757575] text-lg">No projects booked yet. Explore freelancers to get started!</p>
              )}
            </div>
          </section>
        );
      case 'inquiries':
        return (
          <section id="inquiries" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)]">
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
                      <p className="text-xs text-[#9e9e9e] m-0">Received: {freelancer.timestamp}</p>
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

  return (
    <div className="font-sans text-[#212121] leading-relaxed bg-[#f5f5f5] min-h-screen">
      {/* Header */}
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

      {/* Main Content */}
      <main className="py-12">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar (30%) */}
          <aside className="lg:w-[30%] bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-6 sticky top-20 h-[calc(100vh-80px)] flex flex-col">
            <div className="flex flex-col items-center text-center mb-8">
              <img
                src={clientData.avatar}
                alt={clientData.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] shadow-[0_2px_10px_rgba(0,0,0,0.1)] mb-4"
              />
              <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{clientData.name}</h2>
              <p className="text-lg text-[#757575] mb-2">{clientData.company}</p>
              <p className="text-sm text-[#757575] mb-4">{clientData.bio}</p>
              <div className="flex flex-col gap-3 w-full">
                <a
                  href={clientData.website}
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

          {/* Right Content (70%) */}
          <div className="lg:w-[70%]">{renderSection()}</div>
        </div>
      </main>

      {/* Project Detail Modal */}
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
                  {bookedProjects[selectedProject.id] ? 'Booked' : 'Book Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {activeModal === 'editProfileModal' && (
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
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Avatar URL</label>
                <input
                  type="url"
                  name="avatar"
                  value={editProfile.avatar}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter avatar URL"
                />
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

      {/* Chat Modal */}
      {activeModal === 'chatModal' && selectedFreelancer && (
        <ChatModal client={clientData} freelancer={selectedFreelancer} onClose={closeModal} />
      )}
    </div>
  );
}



//BookMyGrad\frontend\app\client\page.jsx