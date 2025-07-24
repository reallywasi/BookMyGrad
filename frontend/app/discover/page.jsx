'use client';

import React, { useState } from 'react';
import { FaUserCircle, FaArrowRight, FaTimes } from 'react-icons/fa';

const projectsData = [
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
    image: 'https://source.unsplash.com/random/800x600/?ecommerce-app,mobile-ui',
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
    image: 'https://source.unsplash.com/random/800x600/?branding,logo-design',
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
    image: 'https://source.unsplash.com/random/800x600/?illustration,digital-art',
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
    image: 'https://source.unsplash.com/random/800x600/?video-editing,motion-graphics',
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
    image: 'https://source.unsplash.com/random/800x600/?copywriting,blog',
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
    image: 'https://source.unsplash.com/random/800x600/?photography,product',
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
    image: 'https://source.unsplash.com/random/800x600/?web-development,custom-app',
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
    image: 'https://source.unsplash.com/random/800x600/?print-design,brochure',
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

export default function DiscoverPage() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [bookedProjects, setBookedProjects] = useState({});
  const [activeModal, setActiveModal] = useState(null);

  const openModal = (project) => {
    setSelectedProject(project);
    setActiveModal('projectDetailModal');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setActiveModal(null);
    document.body.style.overflow = '';
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
        closeModal();
      }, 500);
    } else {
      alert('Booking cancelled.');
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
          <nav className="hidden md:flex md:items-center">
            <ul className="flex flex-row">
              <li className="mr-8">
                <a href="/" className="text-[#757575] font-semibold text-base hover:text-[#6a1b9a]">Home</a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <h1 className="font-montserrat font-bold text-4xl text-[#6a1b9a] text-center mb-5">Discover Creative Projects</h1>
          <p className="text-lg text-[#757575] text-center mb-12 max-w-[700px] mx-auto">Explore a curated selection of projects from our global community of talented freelancers.</p>
          <div className="space-y-8">
            {projectsData.map(project => (
              <div
                key={project.id}
                className="bg-white rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:-translate-y-2 hover:shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all flex flex-col md:flex-row overflow-hidden"
                onClick={() => openModal(project)}
              >
                {/* Developer Info (Left) */}
                <div className="md:w-1/3 bg-[#f0f4f8] p-6 flex flex-col items-center md:items-start text-center md:text-left">
                  <img
                    src={project.freelancerAvatar}
                    alt={project.freelancerName}
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#00bcd4] mb-4"
                  />
                  <h3 className="font-montserrat font-bold text-xl text-[#6a1b9a] mb-2">{project.freelancerName}</h3>
                  <p className="text-sm text-[#757575] mb-4">{project.freelancerBio}</p>
                </div>
                {/* Project Info (Right) */}
                <div className="md:w-2/3 p-6 flex flex-col">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-[200px] object-cover rounded-lg mb-4 border border-[#e0e0e0]"
                  />
                  <h2 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-2">{project.title}</h2>
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
            ))}
          </div>
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
              <h3 className="font-montserrat font-bold text-2xl text-[#6a1b9a] mb-4 text-left">About the Creator</h3>
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
                  {bookedProjects[selectedProject.id] ? 'Booked!' : 'Book This Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}