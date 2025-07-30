'use client';

import React, { useState, useEffect } from 'react';
import { FaUserCircle, FaArrowRight, FaTimes, FaEnvelope, FaHome, FaProjectDiagram, FaInbox, FaPlus, FaEdit } from 'react-icons/fa';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

export default function FreelancerDashboard() {
  const [freelancerData, setFreelancerData] = useState(null);
  const [projectsData, setProjectsData] = useState([]);
  const [contactsData, setContactsData] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [activeSection, setActiveSection] = useState('home');
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    highlights: '',
    technology_used: '',
  });
  const [editProfile, setEditProfile] = useState(null);
  const [error, setError] = useState('');
  const { id } = useParams();
  const router = useRouter();

  const fetchFreelancerData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      const response = await axios.get('http://localhost:8000/api/freelancers/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.id !== parseInt(id)) {
        throw new Error('Unauthorized access');
      }
      setFreelancerData(response.data);
      setEditProfile({
        name: response.data.name,
        profession: response.data.profession,
        bio: response.data.bio,
        portfolio: response.data.portfolio,
      });
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        router.push('/');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch freelancer data');
      }
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/freelancers/me/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjectsData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch projects');
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const clients = await axios.get('http://localhost:8000/api/clients', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const messagesPromises = clients.data.map(async (client) => {
        const response = await axios.get('http://localhost:8000/api/messages/', { // CORRECTED LINE 72
          headers: { Authorization: `Bearer ${token}` },
          params: { other_party_id: client.id, other_party_type: 'client' },
        });
        const latestMessage = response.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
        return latestMessage ? {
          id: client.id,
          clientName: client.name,
          clientAvatar: 'https://randomuser.me/api/portraits/men/50.jpg',
          message: latestMessage.content,
          timestamp: latestMessage.timestamp,
        } : null;
      });
      const messages = (await Promise.all(messagesPromises)).filter(Boolean);
      setContactsData(messages);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch messages');
    }
  };

  useEffect(() => {
    fetchFreelancerData();
    fetchProjects();
    fetchMessages();
  }, []);

  const openModal = (modalType, project = null) => {
    setSelectedProject(project);
    setActiveModal(modalType);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedProject(null);
    setNewProject({ title: '', description: '', highlights: '', technology_used: '' });
    setEditProfile(freelancerData ? {
      name: freelancerData.name,
      profession: freelancerData.profession,
      bio: freelancerData.bio,
      portfolio: freelancerData.portfolio,
    } : null);
    setError('');
    document.body.style.overflow = '';
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProject.title || !newProject.description || !newProject.highlights || !newProject.technology_used) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/projects/', newProject, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Project added successfully!');
      fetchProjects();
      closeModal();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add project');
    }
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    if (!editProfile.name || !editProfile.profession || !editProfile.bio || !editProfile.portfolio) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:8000/api/freelancers/me', editProfile, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Profile updated successfully!');
      fetchFreelancerData();
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
        return freelancerData ? (
          <section id="home" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] flex flex-col items-center justify-center">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4 text-center">Welcome, {freelancerData.name}!</h2>
            <p className="text-lg text-[#757575] mb-6 text-center max-w-[600px]">
              Manage your projects and connect with clients seamlessly. Check your inquiries or explore your projects to get started.
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
        ) : (
          <p className="text-center text-[#757575] text-lg">Loading...</p>
        );
      case 'projects':
        return (
          <section id="projects" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)] overflow-y-auto">
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Your Projects</h2>
              <button
                className="bg-[#00bcd4] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 transition-all"
                onClick={() => openModal('addProjectModal')}
              >
                <FaPlus /> Add Project
              </button>
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
                        src={'https://randomuser.me/api/portraits/women/44.jpg'}
                        alt={freelancerData?.name || 'Freelancer'}
                        className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] mb-4"
                      />
                      <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a] mb-2">{freelancerData?.name || 'Freelancer'}</h3>
                      <p className="text-sm text-[#757575] mb-4">{freelancerData?.bio || ''}</p>
                    </div>
                    <div className="md:w-2/3 p-6 flex flex-col">
                      <img
                        src={'https://source.unsplash.com/random/800x600/?project,design'}
                        alt={project.title}
                        className="w-full h-[200px] object-cover rounded-lg mb-4 border border-[#e0e0e0]"
                      />
                      <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{project.title}</h3>
                      <p className="text-base text-[#757575] mb-4 flex-grow">{project.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.technology_used.split(',').map((tech, i) => (
                          <span key={i} className="bg-[#00bcd4] text-white px-3 py-1 rounded-full text-sm font-semibold">
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#757575] text-lg">No projects listed yet. Add a project to get started!</p>
              )}
            </div>
          </section>
        );
      case 'inquiries':
        return (
          <section id="inquiries" className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-8 w-full h-[calc(100vh-80px)]">
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a]">Client Inquiries</h2>
              <span className="text-sm text-[#757575]">{contactsData.length} Inquiries</span>
            </div>
            <div className="overflow-y-auto overflow-x-hidden max-h-[calc(100vh-160px)] space-y-6">
              {contactsData.length > 0 ? (
                contactsData.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-4 p-4 bg-[#f0f4f8] rounded-lg hover:bg-[#e0f7fa] transition-colors"
                  >
                    <img
                      src={contact.clientAvatar}
                      alt={contact.clientName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#9c27b0]"
                    />
                    <div className="flex-grow">
                      <h4 className="font-montserrat font-bold text-lg text-[#6a1b9a] mb-1">{contact.clientName}</h4>
                      <p className="text-sm text-[#757575] mb-1 line-clamp-2">{contact.message}</p>
                      <p className="text-xs text-[#9e9e9e] m-0">Received: {new Date(contact.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={`mailto:${contact.clientName.toLowerCase().replace(' ', '.')}@example.com?subject=Re: Project Inquiry`}
                        className="bg-[#00bcd4] text-white px-4 py-2 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 transition-all"
                      >
                        Reply <FaEnvelope />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[#757575] text-lg">No client inquiries yet.</p>
              )}
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  if (!freelancerData) {
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
          <aside className="lg:w-[30%] bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] p-6 sticky top-20 h-[calc(100vh-50px)] flex flex-col">
            <div className="flex flex-col items-center text-center mb-6">
              <img
                src={'https://randomuser.me/api/portraits/women/44.jpg'}
                alt={freelancerData.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] shadow-[0_2px_10px_rgba(0,0,0,0.1)] mb-4"
              />
              <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{freelancerData.name}</h2>
              <p className="text-lg text-[#757575] mb-2">{freelancerData.profession}</p>
              <p className="text-sm text-[#757575] mb-4">{freelancerData.bio}</p>
              <div className="flex flex-col gap-3 w-full">
                <a
                  href={freelancerData.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#00bcd4] text-white px-6 py-3 rounded-full font-semibold text-base inline-flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all justify-center"
                >
                  View Portfolio <FaArrowRight />
                </a>
                <button
                  className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all flex items-center gap-2 justify-center"
                  onClick={() => openModal('editProfileModal')}
                >
                  Edit Profile <FaEdit />
                </button>
              </div>
            </div>
            <nav className="space-y-2 mt-auto">
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
              <img src={'https://source.unsplash.com/random/800x600/?project,design'} alt={selectedProject.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-8 text-center">
              <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-4">{selectedProject.title}</h2>
              <p className="text-base text-[#212121] mb-6">{selectedProject.description}</p>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className= "font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Design Highlights</h3>
              <ul className="list-none p-0 mb-6 text-left">
                {selectedProject.highlights.split(',').map((highlight, i) => (
                  <li key={i} className="bg-[#f0f4f8] border-l-4 border-[#00bcd4] p-3 mb-2 rounded text-base text-[#212121]">
                    {highlight.trim()}
                  </li>
                ))}
              </ul>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Technologies Used</h3>
              <div className="flex flex-wrap gap-2 mb-6 justify-start">
                {selectedProject.technology_used.split(',').map((tech, i) => (
                  <span key={i} className="bg-[#00bcd4] text-white px-4 py-2 rounded-full text-sm font-semibold">
                    {tech.trim()}
                  </span>
                ))}
              </div>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">About the Creator</h3>
              <div className="flex items-center gap-5 mb-8">
                <img
                  src={'https://randomuser.me/api/portraits/women/44.jpg'}
                  alt={freelancerData?.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-[#9c27b0] shadow-[0_2px_10px_rgba(0,0,0,0.1)]"
                />
                <div>
                  <h4 className="font-montserrat font-bold text-xl text-[#6a1b9a] m-0">{freelancerData?.name}</h4>
                  <p className="text-sm text-[#757575] mt-1 mb-0">{freelancerData?.bio}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'addProjectModal' && (
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
            <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a] mb-6 text-center">Add New Project</h2>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Project Title</label>
                <input
                  type="text"
                  name="title"
                  value={newProject.title}
                  onChange={(e) => handleInputChange(e, setNewProject)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter project title"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Description</label>
                <textarea
                  name="description"
                  value={newProject.description}
                  onChange={(e) => handleInputChange(e, setNewProject)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  rows="4"
                  placeholder="Enter project description"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Highlights (comma-separated)</label>
                <input
                  type="text"
                  name="highlights"
                  value={newProject.highlights}
                  onChange={(e) => handleInputChange(e, setNewProject)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="e.g., Custom design, Responsive layout"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Technologies (comma-separated)</label>
                <input
                  type="text"
                  name="technology_used"
                  value={newProject.technology_used}
                  onChange={(e) => handleInputChange(e, setNewProject)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="e.g., Figma, HTML5, CSS3"
                />
              </div>
              <button
                className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full"
                onClick={handleAddProject}
              >
                Add Project
              </button>
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
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Profession</label>
                <input
                  type="text"
                  name="profession"
                  value={editProfile.profession}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter your profession"
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
                <label className="block text-sm font-semibold text-[#6a1b9a] mb-2">Portfolio URL</label>
                <input
                  type="url"
                  name="portfolio"
                  value={editProfile.portfolio}
                  onChange={(e) => handleInputChange(e, setEditProfile)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-lg focus:outline-none focus:border-[#00bcd4] transition-colors"
                  placeholder="Enter portfolio URL"
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
    </div>
  );
}