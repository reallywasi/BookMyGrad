'use client';

import React, { useState, useEffect } from 'react';
import Highlighter from 'react-highlight-words';
import { FaSearch, FaLightbulb, FaThLarge, FaQuoteRight, FaQuestionCircle, FaUpload, FaSignOutAlt, FaEye, FaHandPointer, FaComments, FaRocket, FaPaintBrush, FaCode, FaMobileAlt, FaPencilAlt, FaVideo, FaCamera, FaMicrophone, FaLayerGroup, FaArrowRight, FaQuoteLeft, FaTimes, FaChevronDown, FaUserCircle } from 'react-icons/fa';
import { Loader2, UserCircle2 } from 'lucide-react';
import Link from 'next/link';

const projectsData = [
  {
    id: '1',
    title: 'SaaS Product Landing Page',
    freelancerName: 'Anya Sharma',
    freelancerBio: 'UX/UI Designer with 7+ years of experience specializing in web applications and SaaS platforms. Passionate about user-centric design, creating intuitive and beautiful interfaces.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    price: '1200',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'A sleek, conversion-optimized landing page designed for a new SaaS product. This project focused on clear value proposition, engaging animations, and seamless call-to-actions to maximize user engagement. Delivered with fully responsive designs for desktop and mobile, ensuring optimal viewing across all devices.',
    designHighlights: [
      'Modern, minimalist aesthetic',
      'Intuitive navigation and user flow',
      'Optimized for high conversion rates',
      'Custom vector iconography and illustrations',
      'Consistent brand storytelling'
    ],
    technologies: ['Figma', 'HTML5', 'CSS3 (SCSS)', 'JavaScript (React)', 'Webflow']
  },
  {
    id: '2',
    title: 'E-commerce Mobile App UI/UX',
    freelancerName: 'David Lee',
    freelancerBio: 'Mobile UI/UX expert with a focus on creating delightful and efficient user experiences for iOS and Android applications. I prioritize user research and testing to deliver truly impactful designs.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    price: '950',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'A complete UI/UX design for a modern e-commerce mobile application. This comprehensive project includes detailed user flows, wireframes, high-fidelity mockups, and interactive prototypes for both iOS and Android platforms. Designed for a seamless and intuitive shopping experience, from browsing to checkout.',
    designHighlights: [
      'Smooth and fast checkout flow',
      'Personalized product recommendations engine',
      'Integrated dark mode compatibility',
      'Delicate animated transitions for engagement',
      'Accessibility-first design principles'
    ],
    technologies: ['Adobe XD', 'Sketch', 'Principle', 'Material Design', 'Human Interface Guidelines']
  },
  {
    id: '3',
    title: 'Complete Brand Identity & Logo',
    freelancerName: 'Chloe Kim',
    freelancerBio: 'Brand strategist and graphic designer dedicated to crafting unique and memorable brand identities that resonate with target audiences. My passion is building brands from the ground up.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/67.jpg',
    price: '1800',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'A comprehensive brand identity package covering logo design, typography, color palette, brand guidelines, and supporting visual assets. This project aims to create a strong, cohesive, and impactful brand presence for a new startup.',
    designHighlights: [
      'Unique and scalable logo mark',
      'Versatile brand guidelines documentation',
      'Custom typography pairing',
      'Strategic color psychology application',
      'Brand mood board and visual direction'
    ],
    technologies: ['Adobe Illustrator', 'Adobe Photoshop', 'InDesign', 'Procreate (for initial sketches)']
  }
];

export default function Page() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [bookedProjects, setBookedProjects] = useState({});
  const [activeFaqs, setActiveFaqs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [freelancers, setFreelancers] = useState([]);
  const [filteredFreelancers, setFilteredFreelancers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({
    type: '',
    message: '',
    visible: false,
  });
  const showNotification = (type, message, duration = 6000) => {
    setNotification({ type, message, visible: true });
    setTimeout(() => {
      setNotification({ type: '', message: '', visible: false });
    }, duration);
  };
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const categories = [
    'Graphic Design',
    'Web Development',
    'UI/UX Design',
    'Writing and Translation',
    'Video and Animation',
    'Photography',
    'Audio and Music',
    '3D & CAD',
    'Marketing',
    'Business Services'
  ];

  // Fetch freelancers from backend based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFreelancers([]);
      setLoading(false);
      return;
    }

    const fetchFreelancers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:8000/api/freelancers?profession=${encodeURIComponent(searchQuery)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setFilteredFreelancers(data);
      } catch (error) {
        console.error('Fetch error:', error.message);
        showNotification('error', 'Failed to fetch freelancers. Please try again.');
        setFilteredFreelancers([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchFreelancers, 500); // Debounce to avoid rapid API calls
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const openModal = (modalName) => {
    setActiveModal(modalName);
  };

  const closeModal = () => {
    setActiveModal(null);
    document.body.style.overflow = '';
  };

  const handleProjectClick = (project) => {
    if (event.target.classList.contains('book-btn')) return;
    setSelectedProject(project);
    openModal('projectDetailModal');
  };

  const handleBookProject = (project) => {
    if (bookedProjects[project.id]) {
      showNotification("info", "This project is already booked!");
      return;
    }
    if (confirm(`Are you sure you want to book "${project.title}" from ${project.freelancerName}?`)) {
      setTimeout(() => {
        showNotification("success", `Booking request for "${project.title}" sent! The freelancer will contact you shortly.`);
        setBookedProjects({ ...bookedProjects, [project.id]: true });
        if (activeModal === 'projectDetailModal') closeModal();
      }, 500);
    } else {
      alert('Booking cancelled.');
    }
  };

  const toggleFaq = (index) => {
    setActiveFaqs(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  const handleLogout = async () => {
    try {
      setCurrentUser(null);
      setShowLogoutDialog(true);
      setTimeout(() => {
        setShowLogoutDialog(false);
      }, 6000);
    } catch (error) {
      console.error('Logout failed:', error.message);
    }
  };

  return (
    <div className="font-sans text-[#212121] leading-relaxed bg-[#f5f5f5] min-h-screen">
      {/* Header */}
      <header className="bg-white py-4 shadow-[0_2px_10px_rgba(0,0,0,0.08)] sticky top-0 z-[1000]">
        <div className="max-w-[1200px] mx-auto px-6 flex justify-between items-center flex-wrap">
          <div className="text-3xl font-bold text-[#6a1b9a]">
            <a href="#" className="text-inherit no-underline">CreativeHub</a>
          </div>
          <nav className={`md:flex md:flex-row md:items-center ${mobileMenuOpen ? 'flex flex-col items-start w-full bg-white p-5 shadow-[0_5px_15px_rgba(0,0,0,0.05)] border-t border-[#eee]' : 'hidden md:flex'}`}>
            <ul className="flex flex-col md:flex-row w-full md:w-auto">
              <li className="md:mr-8 my-2 md:my-0 w-full md:w-auto">
                <a href="discover" className="text-[#757575] font-semibold text-base flex items-center gap-2 hover:text-[#6a1b9a]" onClick={() => setMobileMenuOpen(false)}>
                  <FaSearch /> Discover
                </a>
              </li>
              <li className="md:mr-8 my-2 md:my-0 w-full md:w-auto">
                <a href="#hiw" className="text-[#757575] font-semibold text-base flex items-center gap-2 hover:text-[#6a1b9a]" onClick={() => setMobileMenuOpen(false)}>
                  <FaLightbulb /> How It Works
                </a>
              </li>
              <li className="relative md:mr-8 my-2 md:my-0 w-full md:w-auto group">
                <div className="text-[#757575] font-semibold text-base flex items-center gap-2 hover:text-[#6a1b9a] cursor-pointer">
                  <FaThLarge />
                  Categories
                </div>
                <ul className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded-md w-56 z-50 opacity-0 group-hover:opacity-100 group-hover:visible invisible transition-opacity duration-200">
                  {categories.map((category) => (
                    <li key={category}>
                      <a
                        href={`#${category.toLowerCase().replace(/ & /g, '-')}`}
                        className="block px-4 py-2 text-sm text-[#424242] hover:bg-[#f3e5f5] hover:text-[#6a1b9a] transition-colors"
                      >
                        {category}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
            <div className="flex flex-col md:flex-row gap-4 md:ml-8 mt-5 md:mt-0 w-full md:w-auto">
              <a href="#" className="bg-[#00bcd4] text-white px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all" onClick={() => setMobileMenuOpen(false)}>
                <FaUpload /> Post Project
              </a>
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all"
                  >
                    <FaUserCircle />
                    {currentUser.displayName || currentUser.email || 'User'}
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded font-semibold shadow-md p-4 z-10 w-[200px]">
                      <p className="text-gray-800 font-medium mb-2">
                        {currentUser.displayName || currentUser.email || 'User'}
                      </p>
                      <button
                        onClick={handleLogout}
                        className="text-red-500 hover:text-red-700 text-sm flex items-center gap-2"
                      >
                        <FaSignOutAlt /> Log Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login_and_register" className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all" onClick={() => setMobileMenuOpen(false)}>
                  <FaUserCircle /> Sign Up / Login
                </Link>
              )}
            </div>
          </nav>
          <div className="md:hidden flex flex-col gap-1.5 cursor-pointer" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <span className="w-6 h-0.5 bg-[#212121] rounded"></span>
            <span className="w-6 h-0.5 bg-[#212121] rounded"></span>
            <span className="w-6 h-0.5 bg-[#212121] rounded"></span>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification.visible && (
        <div className="fixed top-6 right-6 z-[2000]">
          <div className={`bg-white border-2 rounded-xl shadow-xl px-6 py-4 flex items-center gap-3 animate-slideDown ${
            notification.type === 'success'
              ? 'border-green-500'
              : notification.type === 'error'
              ? 'border-red-500'
              : 'border-[#6a1b9a]'
          }`}>
            <svg className={`w-6 h-6 ${
              notification.type === 'success'
                ? 'text-green-500'
                : notification.type === 'error'
                ? 'text-red-500'
                : 'text-purple-600'
            }`} fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              {notification.type === 'error' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              )}
            </svg>
            <span className="text-[#212121] font-medium text-sm">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#e0f7fa] to-[#e8eaf6] py-24 text-center text-[#212121] relative overflow-hidden">
          <div className="absolute top-[-50px] left-[-50px] w-48 h-48 bg-[rgba(0,188,212,0.1)] rounded-full blur-[80px]"></div>
          <div className="absolute bottom-[-70px] right-[-70px] w-64 h-64 bg-[rgba(106,27,154,0.1)] rounded-full blur-[100px]"></div>
          <div className="max-w-[800px] mx-auto px-6 relative z-10">
            <h1 className="font-montserrat font-bold text-5xl md:text-6xl text-[#6a1b9a] mb-6 leading-tight">Your Vision, Our Creative Talent.</h1>
            <p className="text-lg md:text-xl text-[#757575] mb-10">Unlock boundless creativity. Explore unique projects, connect with top-tier freelancers, and bring your ideas to life.</p>
            <div className="flex flex-col md:flex-row max-w-[650px] mx-auto mb-5 bg-white rounded-full shadow-[0_8px_25px_rgba(0,0,0,0.15)] border border-[#e0e0e0] overflow-hidden">
              <input
                type="text"
                placeholder="Search for designers, developers, writers..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-grow border-none p-4 md:p-5 text-base md:text-lg outline-none bg-transparent text-[#212121] placeholder-[#757575] placeholder-opacity-70 md:rounded-l-full"
              />
              <button className="bg-gradient-to-r from-[#00bcd4] to-[#4dd0e1] text-white p-4 md:p-5 text-base md:text-lg font-semibold hover:translate-x-1 transition-transform">
                Search
              </button>
            </div>
            <div className="text-sm text-[#757575]">
              <span className="font-semibold mr-2">Popular:</span>
              {['Web Design', 'Branding', 'Illustration', 'Video Editing'].map(item => (
                <a key={item} href="#" className="text-[#6a1b9a] underline mr-3 hover:text-[#9c27b0]">{item}</a>
              ))}
            </div>
            <div className="mt-8 max-w-[700px] mx-auto text-left">
              {loading && (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="animate-spin text-[#6a1b9a]" size={32} />
                </div>
              )}
              {!loading && searchQuery.trim() !== '' && filteredFreelancers.length === 0 && (
                <div className="text-center py-6 text-[#757575] font-medium text-lg">
                  No results found for "<span className="font-semibold">{searchQuery}</span>"
                </div>
              )}
              {!loading && filteredFreelancers.length > 0 && (
                <div className="bg-white shadow-md rounded-lg p-4">
                  {filteredFreelancers.map(f => (
                    <div key={f.id} className="flex items-center justify-between py-4 border-b border-gray-200 last:border-none">
                      <div className="flex items-center gap-4">
                        <UserCircle2 className="w-12 h-12 text-gray-400" />
                        <div>
                          <p className="font-semibold text-[#212121]">{f.name}</p>
                          <p className="text-sm text-[#757575]">
                            <Highlighter
                              searchWords={[searchQuery]}
                              autoEscape={true}
                              textToHighlight={f.profession || ''}
                              highlightClassName="bg-yellow-200 font-semibold text-[#6a1b9a]"
                            />
                          </p>
                        </div>
                      </div>
                      <a
                        href={`/profile/${f.id}`}
                        className="bg-[#6a1b9a] text-white px-4 py-2 text-sm rounded-full font-semibold hover:bg-[#8e24aa] transition-all"
                      >
                        View Profile
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id='hiw' className="py-20 bg-[#fcfcfc] text-center">
          <div className="max-w-[1200px] mx-auto px-6">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-12">How CreativeHub Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: FaEye, title: 'Discover Talent', desc: 'Browse through thousands of stunning portfolios and project showcases from top freelancers worldwide.' },
                { icon: FaHandPointer, title: 'Book & Pay Securely', desc: 'Directly book freelancers for their listed projects with transparent pricing and secure payment options.' },
                { icon: FaComments, title: 'Collaborate & Consult', desc: 'Communicate seamlessly with your chosen freelancer and get expert consultation for your project needs.' },
                { icon: FaRocket, title: 'Achieve Your Goals', desc: 'Receive high-quality deliverables and successfully complete your projects with professional creative support.' }
              ].map(item => (
                <div key={item.title} className="bg-white p-8 rounded-xl shadow-[0_5px_20px_rgba(0,0,0,0.05)] hover:-translate-y-2 hover:shadow-[0_10px_25px_rgba(0,0,0,0.1)] transition-all">
                  <item.icon className="text-5xl text-[#00bcd4] mb-5 bg-[rgba(0,188,212,0.1)] p-4 rounded-full" />
                  <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{item.title}</h3>
                  <p className="text-base text-[#757575]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section id='cate' className="py-20 bg-[#f5f5f5]">
          <div className="max-w-[1200px] mx-auto px-6">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] text-center mb-5">Explore Creative Categories</h2>
            <p className="text-lg text-[#757575] text-center mb-10 max-w-[700px] mx-auto">Find the perfect professional for every creative need.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: FaPaintBrush, title: 'Graphic Design', desc: 'Logos, branding, print & digital.' },
                { icon: FaCode, title: 'Web Development', desc: 'Websites, apps, e-commerce solutions.' },
                { icon: FaMobileAlt, title: 'UI/UX Design', desc: 'App interfaces, user experience, wireframes.' },
                { icon: FaPencilAlt, title: 'Writing & Translation', desc: 'Content, copywriting, localization.' },
                { icon: FaVideo, title: 'Video & Animation', desc: 'Explainer videos, motion graphics, editing.' },
                { icon: FaCamera, title: 'Photography', desc: 'Product, portrait, event photography.' },
                { icon: FaMicrophone, title: 'Audio & Music', desc: 'Voice-overs, music production, sound design.' },
                { icon: FaLayerGroup, title: '3D & CAD', desc: '3D modeling, rendering, architectural viz.' }
              ].map(item => (
                <a key={item.title} href="#" className="flex flex-col items-center text-center bg-white p-6 rounded-xl shadow-[0_5px_20px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_10px_25px_rgba(0,0,0,0.1)] transition-all no-underline">
                  <item.icon className="text-4xl text-[#9c27b0] mb-5" />
                  <h3 className="font-montserrat font-bold text-xl text-[#212121] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#757575] m-0">{item.desc}</p>
                </a>
              ))}
            </div>
            <div className="text-center mt-12">
              <a href="#" className="bg-transparent text-[#757575] border border-[#757575] px-8 py-3.5 rounded-full font-semibold text-base flex items-center gap-2 mx-auto hover:text-[#6a1b9a] hover:border-[#6a1b9a] transition-all">
                View All Categories <FaArrowRight />
              </a>
            </div>
          </div>
        </section>

        {/* Projects Showcase */}
        <section className="py-20 bg-[#fcfcfc]">
          <div className="max-w-[1200px] mx-auto px-6">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] text-center mb-5">Featured Creative Projects</h2>
            <p className="text-lg text-[#757575] text-center mb-10 max-w-[700px] mx-auto">Hand-picked works from our global talent pool.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {projectsData.map(project => (
                <div key={project.id} className="bg-white rounded-xl overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:-translate-y-2.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all flex flex-col cursor-pointer" onClick={() => handleProjectClick(project)}>
                  <img src={project.image} alt={project.title} className="w-full h-[250px] object-cover border-b border-[#e0e0e0]" />
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a] mb-2">{project.title}</h3>
                    <p className="text-sm text-[#757575] mb-4 flex items-center gap-2"><FaUserCircle /> by {project.freelancerName}</p>
                    <div className="mt-auto flex justify-between items-center pt-5 border-t border-[#e0e0e0]">
                      <span className="text-2xl font-bold text-[#00bcd4]">${project.price}</span>
                      <button className={`book-btn bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all ${bookedProjects[project.id] ? 'bg-[#ccc] cursor-not-allowed transform-none shadow-none' : ''}`} data-project-id={project.id} onClick={(e) => { e.stopPropagation(); handleBookProject(project); }} disabled={bookedProjects[project.id]}>
                        {bookedProjects[project.id] ? 'Booked!' : 'Book Now'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
              <a href="#" className="bg-[#00bcd4] text-white px-8 py-3.5 rounded-full font-semibold text-base flex items-center gap-2 mx-auto hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all">
                View All Projects <FaArrowRight />
              </a>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="bg-gradient-to-br from-[#e0f7fa] to-[#e8eaf6] py-20 text-center">
          <div className="max-w-[1200px] mx-auto px-6">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] mb-5">What Our Clients Say</h2>
            <p className="text-lg text-[#757575] mb-10 max-w-[700px] mx-auto">Hear from satisfied businesses and individuals.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { name: 'Alex Rodriguez', title: 'CEO, Innovate Solutions', avatar: 'https://randomuser.me/api/portraits/men/50.jpg', text: 'CreativeHub transformed our brand identity! The designer we hired was incredibly talented and professional. The process was smooth and the results exceeded our expectations.' },
                { name: 'Sarah Chen', title: 'Founder, Style Boutique', avatar: 'https://randomuser.me/api/portraits/women/60.jpg', text: 'Finding a skilled web developer used to be a headache, but CreativeHub made it so easy. We got our e-commerce site built on time and within budget. Highly recommend!' },
                { name: 'Mark Davies', title: 'Marketing Director, TechConnect', avatar: 'https://randomuser.me/api/portraits/men/70.jpg', text: 'The content writer I collaborated with on CreativeHub truly understood our voice and delivered exceptional SEO-optimized articles. Our traffic has seen a significant boost since then.' }
              ].map(item => (
                <div key={item.name} className="bg-white p-8 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] text-left relative overflow-hidden">
                  <FaQuoteLeft className="absolute top-5 right-5 text-5xl text-[#9c27b0] opacity-10" />
                  <p className="text-base text-[#212121] mb-6 leading-relaxed italic">{item.text}</p>
                  <div className="flex items-center gap-4 pt-5 border-t border-[#e0e0e0]">
                    <img src={item.avatar} alt="Client Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-[#00bcd4]" />
                    <div>
                      <h4 className="font-montserrat font-bold text-lg text-[#6a1b9a] m-0">{item.name}</h4>
                      <span className="text-sm text-[#757575]">{item.title}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-[#fcfcfc]">
          <div className="max-w-[1200px] mx-auto px-6">
            <h2 className="font-montserrat font-bold text-4xl text-[#6a1b9a] text-center mb-5">Frequently Asked Questions</h2>
            <p className="text-lg text-[#757575] text-center mb-10 max-w-[700px] mx-auto">Everything you need to know about CreativeHub.</p>
            <div className="max-w-[800px] mx-auto mt-10">
              {[
                { question: 'How do I find a freelancer on CreativeHub?', answer: 'You can use our powerful search bar to find freelancers by skill, project type, or keyword. You can also browse through our curated categories or explore featured projects to discover top talent. Each freelancer has a detailed profile showcasing their portfolio, services, and pricing.' },
                { question: 'What are the payment options and security measures?', answer: 'CreativeHub supports various secure payment methods including credit/debit cards, PayPal, and more. All transactions are protected with industry-standard encryption. We use an escrow system, where your payment is held securely and only released to the freelancer once you approve the completed work.' },
                { question: 'Can I get a refund if I’m not satisfied with the work?', answer: 'Client satisfaction is our priority. If you are not satisfied with the delivered work, you can initiate a dispute resolution process. Our support team will mediate to find a fair solution, which may include revisions, partial refunds, or a full refund depending on the terms and the specific situation.' },
                { question: 'How does CreativeHub ensure project quality?', answer: 'We vet our freelancers through a rigorous application process. Additionally, client reviews and ratings are prominently displayed on freelancer profiles, allowing you to make informed decisions. Our platform also encourages clear communication and milestone-based payments to ensure project success.' }
              ].map((faq, index) => (
                <div key={index} className={`bg-white rounded-lg mb-4 shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-[#e0e0e0] ${activeFaqs.includes(index) ? 'active' : ''}`}>
                  <div className={`p-5 flex justify-between items-center cursor-pointer hover:bg-[#f8f8f8] transition-colors ${activeFaqs.includes(index) ? 'bg-[#6a1b9a] text-white' : ''}`} onClick={() => toggleFaq(index)}>
                    <h3 className={`font-montserrat font-bold text-lg m-0 flex-grow ${activeFaqs.includes(index) ? 'text-white' : 'text-[#212121]'}`}>{faq.question}</h3>
                    <FaChevronDown className={`text-lg ${activeFaqs.includes(index) ? 'text-white rotate-180' : 'text-[#6a1b9a]'} transition-transform`} />
                  </div>
                  <div className={`text-base text-[#757575] ${activeFaqs.includes(index) ? 'max-h-[200px] p-5 pt-0' : 'max-h-0 p-0'} overflow-hidden transition-all`}>
                    <p className="m-0">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Freelancer Section */}
        <section className="bg-gradient-to-br from-[#6a1b9a] to-[#9c27b0] py-24 text-center text-white relative overflow-hidden">
          <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-[rgba(255,255,255,0.1)] rounded-full blur-[80px]"></div>
          <div className="absolute bottom-[-70px] left-[-70px] w-64 h-64 bg-[rgba(255,255,255,0.1)] rounded-full blur-[100px]"></div>
          <div className="max-w-[800px] mx-auto px-6 relative z-10">
            <h2 className="font-montserrat font-bold text-4xl md:text-5xl text-white mb-5">Join Our Global Network of Freelancers</h2>
            <p className="text-xl text-[rgba(255,255,255,0.9)] mb-10">Showcase your exceptional talent, connect with clients worldwide, and grow your freelance career with CreativeHub.</p>
            <a href="#" className="bg-white text-[#6a1b9a] px-8 py-3.5 rounded-full font-semibold text-base flex items-center gap-2 mx-auto hover:bg-[#f0f0f0] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all">
              Become a Freelancer <FaArrowRight />
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#212121] text-[#e0e0e0] pt-16 pb-8 text-sm">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-center md:text-left">
            <div>
              <h3 className="font-montserrat font-bold text-xl text-white mb-6">CreativeHub</h3>
              <p className="text-[#bdbdbd] mb-5">Connecting creativity with opportunity.</p>
              <div className="flex justify-center md:justify-start gap-4">
              </div>
            </div>
            {[
              { title: 'Explore', links: ['Discover Projects', 'Project Categories', 'Freelancer Directory', 'How It Works'] },
              { title: 'Company', links: ['About Us', 'Careers', 'Press', 'Partnerships'] },
              { title: 'Support', links: ['Help Center', 'FAQ', 'Privacy Policy', 'Terms of Service'] }
            ].map(col => (
              <div key={col.title}>
                <h3 className="font-montserrat font-bold text-xl text-white mb-6">{col.title}</h3>
                <ul className="list-none p-0 m-0">
                  {col.links.map(link => (
                    <li key={link} className="mb-2"><a href="#" className="text-[#bdbdbd] hover:text-[#4dd0e1] transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-center pt-8 border-t border-[#424242] text-[#9e9e9e] text-sm">
            <p>© 2023 CreativeHub. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Project Detail Modal */}
      {activeModal === 'projectDetailModal' && selectedProject && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity" onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}>
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[900px] max-h-[90vh] overflow-y-auto relative transform translate-y-0 transition-transform">
            <button className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10" onClick={closeModal}><FaTimes /></button>
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
                  <li key={i} className="bg-[#f0f4f8] border-l-4 border-[#00bcd4] p-3 mb-2 rounded text-base text-[#212121]">{highlight}</li>
                ))}
              </ul>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">Technologies Used</h3>
              <div className="flex flex-wrap gap-2 mb-6 justify-start">
                {selectedProject.technologies.map((tech, i) => (
                  <span key={i} className="bg-[#00bcd4] text-white px-4 py-2 rounded-full text-sm font-semibold">{tech}</span>
                ))}
              </div>
              <div className="border-t border-dashed border-[#e0e0e0] my-9"></div>
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">About the Creator</h3>
              <div className="flex items-center gap-5 mb-8">
                <img src={selectedProject.freelancerAvatar} alt={selectedProject.freelancerName} className="w-20 h-20 rounded-full object-cover border-2 border-[#9c27b0] shadow-[0_2px_10px_rgba(0,0,0,0.1)]" />
                <div>
                  <h4 className="font-montserrat font-bold text-xl text-[#6a1b9a] m-0">{selectedProject.freelancerName}</h4>
                  <p className="text-sm text-[#757575] mt-1 mb-0">{selectedProject.freelancerBio}</p>
                </div>
              </div>
              <div className="border-t border-[#e0e0e0] pt-6 flex flex-col md:flex-row justify-between items-center gap-5 mt-8">
                <span className="text-3xl font-bold text-[#00bcd4]">${selectedProject.price}</span>
                <button className={`bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-gradient-to-r hover:from-[#9c27b0] hover:to-[#6a1b9a] hover:-translate-y-0.5 transition-all w-full md:w-auto ${bookedProjects[selectedProject.id] ? 'bg-[#ccc] cursor-not-allowed transform-none shadow-none' : ''}`} onClick={() => handleBookProject(selectedProject)} disabled={bookedProjects[selectedProject.id]}>
                  {bookedProjects[selectedProject.id] ? 'Booked!' : 'Book This Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LogOut Dialog */}
      {showLogoutDialog && (
        <div className="fixed top-6 right-6 z-[2000]">
          <div className="bg-white border-2 border-green-500 rounded-xl shadow-x2 px-8 py-6 flex items-center gap-3 animate-slideDown">
            <svg className="text-green-500 w-8 h-8" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[#212121] font-bold text-base">User Logged Out Successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
}