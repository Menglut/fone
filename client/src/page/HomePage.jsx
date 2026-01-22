import React, { useState, useEffect } from 'react';
// CSS 파일 경로가 정확한지 꼭 확인하세요. 
// 만약 jsx와 css가 같은 폴더에 있다면 './HomePage.css' 로 바꿔야 합니다.
import '../css/HomePage.css'; 

const Homepage = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="container">
    {/* --- NAVIGATION (수정됨) --- */}
    <nav className={`navbar ${scrollY > 50 ? 'scrolled' : ''}`}>
      
      {/* 1. LEFT: Logo */}
      <a href="/" className="nav-logo">
        <span className="red-dot"></span>
        <span className="logo-text">F 1</span>
      </a>

      {/* 2. CENTER: Main Menu (가운데로 이동) */}
      <div className="nav-menu center-menu">
        <a href="#about">DRIVER PROFILE</a>
        <a href="#projects">TELEMETRY</a>
        <a href="#contact">TEAM RADIO</a>
      </div>

      {/* 3. RIGHT: Auth Menu (새로 추가) */}
      <div className="nav-auth">
        <a href="#login" className="login-link">LOGIN</a>
        <a href="#signup" className="signup-btn">SIGN UP</a>
      </div>

    </nav>

      {/* --- HERO SECTION --- */}
      <header className="hero">
        <div className="hero-bg-overlay"></div>
        <div className="hero-content">
          <div className="hero-label">2026 SEASON PORTFOLIO</div>
          <h1 className="hero-title">
            CODE <br />
            LIKE A <span className="outline-text">RACER.</span>
          </h1>
          <div className="hero-footer">
            <div className="scroll-indicator">
              SCROLL TO START 
              <span className="arrow-down">↓</span>
            </div>
            <p className="hero-desc">
              0.01초의 최적화를 위해 달리는<br />
              풀스택 개발자의 엔지니어링 기록
            </p>
          </div>
        </div>
      </header>

      {/* --- MARQUEE --- */}
      <div className="marquee-section">
        <div className="track">
          <div className="content">
            &nbsp;FULL STACK DEVELOPMENT ✦ PERFORMANCE OPTIMIZATION ✦ REACT ✦ NODE.JS ✦ UI/UX DESIGN ✦ GRAND PRIX WINNER ✦ 
            FULL STACK DEVELOPMENT ✦ PERFORMANCE OPTIMIZATION ✦ REACT ✦ NODE.JS ✦ UI/UX DESIGN ✦ GRAND PRIX WINNER ✦ 
          </div>
        </div>
      </div>

      {/* --- DRIVER PROFILE --- */}
      <section id="about" className="section-container profile-section">
        <div className="section-header">
          <h2>DRIVER PROFILE</h2>
          <span className="section-num">01</span>
        </div>
        <div className="profile-grid">
          <div className="profile-image-area">
            <div className="placeholder-img">
                <span>DRIVER<br/>IMAGE</span>
            </div>
          </div>
          <div className="profile-info-area">
            <h3>THE ENGINEER BEHIND THE WHEEL</h3>
            <p className="main-desc">
              단순히 코드를 작성하는 것을 넘어, 비즈니스의 '엔진'을 설계합니다. 
              F1 메카닉처럼 정교한 아키텍처를 설계하고, 드라이버처럼 과감하게 실행합니다.
            </p>
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-label">PROJECTS</span>
                <span className="stat-value">12+</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">EXP. YEARS</span>
                <span className="stat-value">03</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">POLE POSITION</span>
                <span className="stat-value">100%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PROJECTS (FSN GRID) --- */}
      <section id="projects" className="section-container">
        <div className="section-header">
          <h2>TELEMETRY DATA (PROJECTS)</h2>
          <span className="section-num">02</span>
        </div>
        
        <div className="fsn-grid">
          <div className="grid-card">
            <div className="card-top">
              <span className="card-num">P1</span>
              <span className="card-cat">WEB PLATFORM</span>
            </div>
            <h3 className="card-title">DATING APP LAUNCH</h3>
            <p className="card-desc">위치 기반 실시간 매칭 알고리즘 구현 및 대용량 트래픽 아키텍처</p>
            <div className="card-arrow">↗</div>
          </div>

          <div className="grid-card">
            <div className="card-top">
              <span className="card-num">P2</span>
              <span className="card-cat">DATA ANALYSIS</span>
            </div>
            <h3 className="card-title">MARKET PREDICTION</h3>
            <p className="card-desc">Python 머신러닝 라이브러리를 활용한 사용자 행동 예측 시스템</p>
            <div className="card-arrow">↗</div>
          </div>

          <div className="grid-card">
            <div className="card-top">
              <span className="card-num">P3</span>
              <span className="card-cat">SYSTEM OS</span>
            </div>
            <h3 className="card-title">XV6 KERNEL STUDY</h3>
            <p className="card-desc">운영체제 커널 레벨의 스케줄링 최적화 및 메모리 관리 분석</p>
            <div className="card-arrow">↗</div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer id="contact" className="footer">
        <div className="footer-top">
          <h2>READY TO RACE?</h2>
          <button className="contact-btn">START ENGINE ➔</button>
        </div>
        <div className="footer-bottom">
          <div className="footer-info">
            <p>SEOUL, KOREA</p>
            <p>dev.racer@email.com</p>
          </div>
          <div className="copyright">© 2026 KIM'S PORTFOLIO.</div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;