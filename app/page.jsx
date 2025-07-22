'use client';

import React, { useState, useEffect } from 'react';
import { FaSearch, FaLightbulb, FaThLarge, FaQuoteRight, FaQuestionCircle, FaEnvelope, FaUpload, FaUserPlus, FaSignInAlt, FaEye, FaHandPointer, FaComments, FaRocket, FaPaintBrush, FaCode, FaMobileAlt, FaPencilAlt, FaVideo, FaCamera, FaMicrophone, FaLayerGroup, FaArrowRight, FaQuoteLeft, FaTimes, FaChevronDown, FaBriefcase, FaUserTie, FaFacebookF, FaTwitter, FaLinkedinIn, FaInstagram, FaUserCircle } from 'react-icons/fa';

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
      'Custom typography pairings',
      'Strategic color psychology application',
      'Brand mood board and visual direction'
    ],
    technologies: ['Adobe Illustrator', 'Adobe Photoshop', 'InDesign', 'Procreate (for initial sketches)']
  },
  {
    id: '4',
    title: 'Custom Digital Character Art',
    freelancerName: 'Omar Hassan',
    freelancerBio: 'Digital artist specializing in character design for games, animation, and print. I bring characters to life with distinct personalities and vibrant aesthetics.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/29.jpg',
    price: '700',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'Creation of a unique digital character, suitable for various media. This includes concept sketches, character sheet with different poses/expressions, and high-resolution final artwork. Perfect for mascots, game characters, or storytelling.',
    designHighlights: [
      'Expressive character poses',
      'Detailed texture and lighting',
      'Dynamic color schemes',
      'Multiple outfit/expression variations'
    ],
    technologies: ['Procreate', 'Clip Studio Paint', 'Adobe Photoshop']
  },
  {
    id: '5',
    title: 'Short Explainer Video & Motion Graphics',
    freelancerName: 'Sara Khan',
    freelancerBio: 'Motion graphics designer and video editor focused on creating engaging visual stories. I transform complex ideas into compelling and digestible animated content.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/79.jpg',
    price: '1500',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'A captivating 60-90 second explainer video with custom motion graphics to clearly articulate a product or service. Includes scriptwriting, voiceover, custom animation, and sound design. Ideal for marketing campaigns and website hero sections.',
    designHighlights: [
      'Engaging visual storytelling',
      'Smooth and professional animations',
      'Custom character and object designs',
      'Crystal clear audio and voiceover'
    ],
    technologies: ['Adobe After Effects', 'Adobe Premiere Pro', 'Illustrator', 'Audacity']
  },
  {
    id: '6',
    title: 'SEO-Optimized Blog Content Package',
    freelancerName: 'Liam Gallagher',
    freelancerBio: 'Content writer and SEO specialist passionate about crafting compelling narratives that rank high and convert. I combine creativity with data-driven strategies to deliver results.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/8.jpg',
    price: '600',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'A package of 5 SEO-optimized blog articles (800-1000 words each) tailored to your industry and keywords. Includes topic research, keyword integration, competitive analysis, and compelling calls-to-action. Designed to boost organic traffic and establish thought leadership.',
    designHighlights: [
      'In-depth keyword research',
      'Engaging and informative writing style',
      'Structurally optimized for readability',
      'Strong calls-to-action (CTAs)',
      'Original, plagiarism-free content'
    ],
    technologies: ['Ahrefs', 'Surfer SEO', 'Google Analytics', 'Grammarly']
  },
  {
    id: '7',
    title: 'E-commerce Product Photography',
    freelancerName: 'Nina Petrov',
    freelancerBio: 'Product photographer with an eye for detail and a knack for making products shine. I create high-quality, conversion-focused images for online stores and marketing materials.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/51.jpg',
    price: '850',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'Professional product photography session for e-commerce. Includes studio setup, lighting, high-resolution shots from multiple angles, and post-production editing. Delivers images optimized for web use, ready to upload to your online store.',
    designHighlights: [
      'Sharp, clear imagery',
      'Consistent branding through visuals',
      'Optimal lighting for product details',
      'Clean, distraction-free backgrounds',
      'Web-optimized file sizes'
    ],
    technologies: ['Canon DSLR/Mirrorless', 'Adobe Lightroom', 'Adobe Photoshop', 'Studio Lighting Equipment']
  },
  {
    id: '8',
    title: 'Custom Web Application Development',
    freelancerName: 'Kenji Tanaka',
    freelancerBio: 'Full-stack developer with 10+ years experience building robust and scalable web applications. I focus on clean code and efficient solutions.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/men/66.jpg',
    price: '3000',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'Development of a custom web application tailored to specific business needs. This service covers front-end and back-end development, database integration, and API creation. Ideal for unique software solutions or internal tools.',
    designHighlights: [
      'Scalable architecture',
      'Secure data handling',
      'User-friendly interface (UX-focused development)',
      'Cross-browser compatibility',
      'Optimized performance'
    ],
    technologies: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'Python (Django/Flask)', 'AWS']
  },
  {
    id: '9',
    title: 'Professional Business Brochure Design',
    freelancerName: 'Isabella Rossi',
    freelancerBio: 'Print and digital designer specializing in marketing collateral. I create impactful visual communication pieces that capture attention and convey messages effectively.',
    freelancerAvatar: 'https://randomuser.me/api/portraits/women/1.jpg',
    price: '500',
    image: 'https://assets.startbootstrap.com/img/screenshots/themes/landing-page.png',
    description: 'Design of a professional, eye-catching business brochure (tri-fold, bi-fold, or custom). Includes content layout, image selection/editing, and print-ready file delivery. Perfect for trade shows, sales kits, or corporate presentations.',
    designHighlights: [
      'Compelling visual hierarchy',
      'High-quality imagery and graphics',
      'Effective call-to-action placement',
      'Print-ready PDF with bleed and crop marks',
      'Branded and cohesive design elements'
    ],
    technologies: ['Adobe InDesign', 'Adobe Photoshop', 'Adobe Illustrator', 'Canva Pro (for quick mockups)']
  }
];

export default function Page() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [bookedProjects, setBookedProjects] = useState({});
  const [activeFaqs, setActiveFaqs] = useState([]);
  const [userType, setUserType] = useState('client');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
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

  const openModal = (modalId) => {
    setActiveModal(modalId);
    document.body.style.overflow = 'hidden';
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
      alert('This project is already booked!');
      return;
    }
    if (confirm(`Are you sure you want to book "${project.title}" from ${project.freelancerName}?`)) {
      setTimeout(() => {
        alert(`Success! Your booking request for "${project.title}" has been sent. The freelancer will contact you shortly.`);
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

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (loginForm.email && loginForm.password) {
      alert(`Login attempt with Email: ${loginForm.email}`);
      closeModal();
      setLoginForm({ email: '', password: '' });
    } else {
      alert('Please fill in all login fields.');
    }
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    const { email, password, confirmPassword, clientName, freelancerFullName, freelancerProfession, freelancerBio } = signupForm;
    if (!email || !password || !confirmPassword) {
      alert('Please fill in all required email and password fields.');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    let details = {};
    if (userType === 'client') {
      if (!clientName) { alert('Please enter your name.'); return; }
      details = { name: clientName, company: signupForm.companyName };
    } else {
      if (!freelancerFullName || !freelancerProfession || !freelancerBio) {
        alert('Please fill in all required freelancer details.');
        return;
      }
      details = {
        fullName: freelancerFullName,
        profession: freelancerProfession,
        portfolio: signupForm.freelancerPortfolio,
        bio: freelancerBio
      };
    }
    alert(`Account created successfully for ${userType}!\nEmail: ${email}\nDetails: ${JSON.stringify(details, null, 2)}`);
    closeModal();
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
    setUserType('client');
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
              {[
                { href: '#discover', icon: FaSearch, text: 'Discover' },
                { href: '#how-it-works', icon: FaLightbulb, text: 'How It Works' },
                { href: '#categories', icon: FaThLarge, text: 'Categories' },
              ].map(item => (
                <li key={item.text} className="md:mr-8 my-2 md:my-0 w-full md:w-auto">
                  <a href={item.href} className="text-[#757575] font-semibold text-base flex items-center gap-2 hover:text-[#6a1b9a]" onClick={() => setMobileMenuOpen(false)}>
                    <item.icon /> {item.text}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex flex-col md:flex-row gap-4 md:ml-8 mt-5 md:mt-0 w-full md:w-auto">
              <a href="#" className="bg-[#00bcd4] text-white px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-[#4dd0e1] hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(0,188,212,0.3)] transition-all" onClick={() => setMobileMenuOpen(false)}>
                <FaUpload /> Post Project
              </a>
              <a href="#" className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all" onClick={(e) => { e.preventDefault(); openModal('signupModal'); setMobileMenuOpen(false); }}>
                <FaUserPlus /> Sign Up
              </a>
              <a href="#" className="bg-transparent text-[#757575] border border-[#757575] px-5 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 hover:text-[#6a1b9a] hover:border-[#6a1b9a] transition-all" onClick={(e) => { e.preventDefault(); openModal('loginModal'); setMobileMenuOpen(false); }}>
                <FaSignInAlt /> Login
              </a>
            </div>
          </nav>
          <div className="md:hidden flex flex-col gap-1.5 cursor-pointer" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <span className="w-6 h-0.5 bg-[#212121] rounded"></span>
            <span className="w-6 h-0.5 bg-[#212121] rounded"></span>
            <span className="w-6 h-0.5 bg-[#212121] rounded"></span>
          </div>
        </div>
      </header>

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
              <input type="text" placeholder="Search for designers, developers, writers..." aria-label="Search for freelancers" className="flex-grow border-none p-4 md:p-5 text-base md:text-lg outline-none bg-transparent text-[#212121] placeholder-[#757575] placeholder-opacity-70 md:rounded-l-full" />
              <button className="bg-gradient-to-r from-[#00bcd4] to-[#4dd0e1] text-white p-4 md:p-5 text-base md:text-lg font-semibold hover:translate-x-1 transition-transform">Search</button>
            </div>
            <div className="text-sm text-[#757575]">
              <span className="font-semibold mr-2">Popular:</span>
              {['Web Design', 'Branding', 'Illustration', 'Video Editing'].map(item => (
                <a key={item} href="#" className="text-[#6a1b9a] underline mr-3 hover:text-[#9c27b0]">{item}</a>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-[#fcfcfc] text-center">
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
        <section className="py-20 bg-[#f5f5f5]">
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
                {/* {[<FaFacebookF />, <FaTwitter />, <FaLinkedinIn />, <FaInstagram />].map((Icon, i) => (
                  <a key={i} href="#" className="text-white text-xl hover:text-[#00bcd4] transition-colors"><Icon /></a>
                ))} */}
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

      {/* Login Modal */}
      {activeModal === 'loginModal' && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity" onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}>
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[450px] relative transform translate-y-0 transition-transform">
            <button className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10" onClick={closeModal}><FaTimes /></button>
            <div className="p-5 text-center">
              <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a] mb-4">Login to CreativeHub</h2>
              <form onSubmit={handleLoginSubmit}>
                <div className="mb-5 text-left">
                  <label htmlFor="loginEmail" className="block text-sm font-semibold text-[#212121] mb-2">Email Address</label>
                  <input type="email" id="loginEmail" placeholder="your.email@example.com" required className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
                </div>
                <div className="mb-5 text-left">
                  <label htmlFor="loginPassword" className="block text-sm font-semibold text-[#212121] mb-2">Password</label>
                  <input type="password" id="loginPassword" placeholder="Enter your password" required className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
                </div>
                <button type="submit" className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base w-full hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all">Login</button>
                <p className="mt-6 text-sm text-[#757575]">Don't have an account? <a href="#" className="font-semibold text-[#6a1b9a] hover:text-[#9c27b0]" onClick={(e) => { e.preventDefault(); closeModal(); openModal('signupModal'); }}>Sign Up</a></p>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {activeModal === 'signupModal' && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex justify-center items-center z-[1001] opacity-100 transition-opacity" onClick={(e) => e.target.classList.contains('modal-overlay') && closeModal()}>
          <div className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-[90%] max-w-[600px] relative transform translate-y-0 transition-transform">
            <button className="absolute top-4 right-4 bg-transparent border-none text-3xl text-[#757575] cursor-pointer hover:text-[#6a1b9a] transition-colors z-10" onClick={closeModal}><FaTimes /></button>
            <div className="p-5 text-center">
              <h2 className="font-montserrat font-bold text-3xl text-[#6a1b9a] mb-2">Join CreativeHub</h2>
              <p className="text-base text-[#757575] mb-8">Choose your path to creativity.</p>
              <div className="flex flex-col md:flex-row gap-4 mb-8 justify-center">
                <button className={`flex-1 p-5 border-2 ${userType === 'client' ? 'border-[#6a1b9a] bg-[#f0e6f7] text-[#6a1b9a] shadow-[0_5px_15px_rgba(106,27,154,0.1)]' : 'border-[#e0e0e0] text-[#757575]'} rounded-xl bg-white font-semibold text-base flex flex-col items-center gap-2 hover:border-[#00bcd4] hover:text-[#00bcd4] transition-all`} onClick={() => setUserType('client')}>
                  <FaBriefcase className={`text-4xl ${userType === 'client' ? 'text-[#6a1b9a]' : 'text-[#757575] hover:text-[#00bcd4]'} transition-colors`} />
                  <span>I'm Looking for a Freelancer</span>
                </button>
                <button className={`flex-1 p-5 border-2 ${userType === 'freelancer' ? 'border-[#6a1b9a] bg-[#f0e6f7] text-[#6a1b9a] shadow-[0_5px_15px_rgba(106,27,154,0.1)]' : 'border-[#e0e0e0] text-[#757575]'} rounded-xl bg-white font-semibold text-base flex flex-col items-center gap-2 hover:border-[#00bcd4] hover:text-[#00bcd4] transition-all`} onClick={() => setUserType('freelancer')}>
                  <FaUserTie className={`text-4xl ${userType === 'freelancer' ? 'text-[#6a1b9a]' : 'text-[#757575] hover:text-[#00bcd4]'} transition-colors`} />
                  <span>I'm a Freelancer</span>
                </button>
              </div>
              <form onSubmit={handleSignupSubmit}>
                <div className="mb-5 text-left">
                  <label htmlFor="signupEmail" className="block text-sm font-semibold text-[#212121] mb-2">Email Address</label>
                  <input type="email" id="signupEmail" placeholder="your.email@example.com" required className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]" value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} />
                </div>
                <div className="mb-5 text-left">
                  <label htmlFor="signupPassword" className="block text-sm font-semibold text-[#212121] mb-2">Password</label>
                  <input type="password" id="signupPassword" placeholder="Create a password" required className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} />
                </div>
                <div className="mb-5 text-left">
                  <label htmlFor="signupConfirmPassword" className="block text-sm font-semibold text-[#212121] mb-2">Confirm Password</label>
                  <input type="password" id="signupConfirmPassword" placeholder="Confirm your password" required className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]" value={signupForm.confirmPassword} onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })} />
                </div>
                <div className={`mb-5 ${userType === 'client' ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0'} overflow-hidden transition-all text-left`}>
                  <div className="mb-5">
                    <label htmlFor="clientName" className="block text-sm font-semibold text-[#212121] mb-2">Your Name</label>
                    <input type="text" id="clientName" placeholder="e.g., Jane Doe" required={userType === 'client'} className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]" value={signupForm.clientName} onChange={(e) => setSignupForm({ ...signupForm, clientName: e.target.value })} />
                  </div>
                  <div className="mb-5">
                    <label htmlFor="companyName" className="block text-sm font-semibold text-[#212121] mb-2">Company Name (Optional)</label>
                    <input type="text" id="companyName" placeholder="e.g., Creative Solutions Inc." className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]" value={signupForm.companyName} onChange={(e) => setSignupForm({ ...signupForm, companyName: e.target.value })} />
                  </div>
                </div>
                <div className={`mb-5 ${userType === 'freelancer' ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0'} overflow-hidden transition-all text-left`}>
                  <div className="mb-5">
                    <label htmlFor="freelancerFullName" className="block text-sm font-semibold text-[#212121] mb-2">Full Name</label>
                    <input type="text" id="freelancerFullName" placeholder="e.g., John Smith" required={userType === 'freelancer'} className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]" value={signupForm.freelancerFullName} onChange={(e) => setSignupForm({ ...signupForm, freelancerFullName: e.target.value })} />
                  </div>
                  <div className="mb-5">
                    <label htmlFor="freelancerProfession" className="block text-sm font-semibold text-[#212121] mb-2">Your Profession/Niche</label>
                    <input type="text" id="freelancerProfession" placeholder="e.g., UI/UX Designer, Web Developer" required={userType === 'freelancer'} className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]" value={signupForm.freelancerProfession} onChange={(e) => setSignupForm({ ...signupForm, freelancerProfession: e.target.value })} />
                  </div>
                  <div className="mb-5">
                    <label htmlFor="freelancerPortfolio" className="block text-sm font-semibold text-[#212121] mb-2">Portfolio/Website URL (Optional)</label>
                    <input type="url" id="freelancerPortfolio" placeholder="https://yourportfolio.com" className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)]" value={signupForm.freelancerPortfolio} onChange={(e) => setSignupForm({ ...signupForm, freelancerPortfolio: e.target.value })} />
                  </div>
                  <div className="mb-5">
                    <label htmlFor="freelancerBio" className="block text-sm font-semibold text-[#212121] mb-2">Short Bio</label>
                    <textarea id="freelancerBio" rows="3" placeholder="Tell us about your skills and experience..." required={userType === 'freelancer'} className="w-full p-3 border border-[#e0e0e0] rounded-lg text-base text-[#212121] focus:outline-none focus:border-[#9c27b0] focus:shadow-[0_0_0_3px_rgba(106,27,154,0.1)] resize-y" value={signupForm.freelancerBio} onChange={(e) => setSignupForm({ ...signupForm, freelancerBio: e.target.value })}></textarea>
                  </div>
                </div>
                <button type="submit" className="bg-gradient-to-r from-[#6a1b9a] to-[#9c27b0] text-white px-8 py-3.5 rounded-full font-semibold text-base w-full hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(106,27,154,0.3)] transition-all">Create Account</button>
                <p className="mt-6 text-sm text-[#757575]">Already have an account? <a href="#" className="font-semibold text-[#6a1b9a] hover:text-[#9c27b0]" onClick={(e) => { e.preventDefault(); closeModal(); openModal('loginModal'); }}>Login</a></p>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}