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
            {/* --- NAVIGATION --- */}
            <nav className={`navbar ${scrollY > 50 ? 'scrolled' : ''}`}>
                {/* 1. Logo: 서비스 이름에 맞게 수정 */}
                <a href="/" className="nav-logo-btn">
                    <div className="logo-symbol">
                        <span>KP</span>
                        <div className="red-dot-in-symbol"></div>
                    </div>
                    <div className="logo-text-group">
                        <span className="logo-title">KIM'S PADDOCK</span>
                        <span className="logo-subtitle">CAREER BUILDER</span> {/* 서브타이틀 변경 */}
                    </div>
                </a>

                {/* 2. Menu */}
                <div className="nav-menu center-menu">
                    <a href="#about">WHY US</a>        {/* 메뉴명 변경 */}
                    <a href="#features">SOLUTIONS</a>  {/* 메뉴명 변경 */}
                    <a href="#pricing">PLANS</a>       {/* 메뉴명 변경 */}
                </div>

                {/* 3. Auth */}
                <div className="nav-auth">
                    <a href="#login" className="login-link">LOGIN</a>
                    <a href="#signup" className="signup-btn">START BUILDING</a> {/* 문구 변경 */}
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <header className="hero">
                <div className="hero-bg-overlay"></div>
                <div className="hero-content">
                    <div className="hero-label">AI-POWERED CAREER SOLUTION</div>
                    <h1 className="hero-title">
                        BUILD YOUR <br />
                        WINNING <span className="outline-text">MACHINE.</span>
                    </h1>
                    <div className="hero-footer">
                        <div className="scroll-indicator">
                            START YOUR ENGINE
                            <span className="arrow-down">↓</span>
                        </div>
                        <p className="hero-desc">
                            0.01초의 차이로 승부가 갈리는 F1처럼,<br />
                            당신의 서류가 합격선(Pole Position)을 통과하도록<br />
                            최적의 구조와 논리로 튜닝해 드립니다.
                        </p>
                    </div>
                </div>
            </header>

            {/* --- MARQUEE (서비스 키워드로 변경) --- */}
            <div className="marquee-section">
                <div className="track">
                    <div className="content">
                        &nbsp;RESUME BUILDER ✦ PORTFOLIO MAKER ✦ AI TEXT ANALYSIS ✦ AUTO FORMATTING ✦ CAREER STRATEGY ✦
                        RESUME BUILDER ✦ PORTFOLIO MAKER ✦ AI TEXT ANALYSIS ✦ AUTO FORMATTING ✦ CAREER STRATEGY ✦
                    </div>
                </div>
            </div>

            {/* --- WHY US (Service Intro) --- */}
            <section id="about" className="section-container profile-section">
                <div className="section-header">
                    <h2>PIT STOP STRATEGY</h2> {/* 피트스탑 전략: 정비를 받고 나가는 곳 */}
                    <span className="section-num">01</span>
                </div>
                <div className="profile-grid">
                    <div className="profile-image-area">
                        <div className="placeholder-img">
                            <span>SERVICE<br/>DASHBOARD</span> {/* 서비스 예시 화면이 들어갈 곳 */}
                        </div>
                    </div>
                    <div className="profile-info-area">
                        <h3>WE ENGINEER YOUR SUCCESS</h3>
                        <p className="main-desc">
                            막막한 빈 화면(Blank Page)은 이제 그만.<br/>
                            F1 미케닉이 데이터를 기반으로 머신을 세팅하듯,
                            우리는 합격 데이터를 기반으로 당신의 경험을 재설계합니다.
                            단순한 작성이 아닌, '합격'을 위한 엔지니어링을 경험하세요.
                        </p>

                        <div className="stats-grid">
                            <div className="stat-box">
                                <span className="stat-label">USERS</span>
                                <span className="stat-value">5K+</span>
                            </div>
                            <div className="stat-box">
                                <span className="stat-label">PASS RATE</span>
                                <span className="stat-value">82%</span>
                            </div>
                            <div className="stat-box">
                                <span className="stat-label">TIME SAVED</span>
                                <span className="stat-value">3.5H</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- SOLUTIONS (Features) --- */}
            <section id="features" className="section-container">
                <div className="section-header">
                    <h2>ENGINEERING SOLUTIONS</h2>
                    <span className="section-num">02</span>
                </div>

                {/* 기능 소개 그리드 */}
                <div className="fsn-grid">
                    <div className="grid-card">
                        <div className="card-top">
                            <span className="card-num">S1</span>
                            <span className="card-cat">RESUME TUNING</span>
                        </div>
                        <h3 className="card-title">SMART RESUME</h3>
                        <p className="card-desc">
                            직무별 핵심 키워드 자동 추천 및<br/>
                            가독성을 극대화한 F자형 레이아웃 설계
                        </p>
                        <div className="card-arrow">↗</div>
                    </div>

                    <div className="grid-card">
                        <div className="card-top">
                            <span className="card-num">S2</span>
                            <span className="card-cat">VISUAL SETUP</span>
                        </div>
                        <h3 className="card-title">PORTFOLIO MAKER</h3>
                        <p className="card-desc">
                            드래그 앤 드롭으로 완성하는<br/>
                            임팩트 있는 프로젝트 쇼케이스 생성
                        </p>
                        <div className="card-arrow">↗</div>
                    </div>

                    <div className="grid-card">
                        <div className="card-top">
                            <span className="card-num">S3</span>
                            <span className="card-cat">AI TELEMETRY</span>
                        </div>
                        <h3 className="card-title">AI FEEDBACK</h3>
                        <p className="card-desc">
                            작성된 자소서의 논리적 결함 분석 및<br/>
                            합격 확률을 높이는 문장 실시간 교정
                        </p>
                        <div className="card-arrow">↗</div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer id="contact" className="footer">
                <div className="footer-top">
                    <h2>READY TO RACE?</h2>
                    {/* 회원가입 유도 버튼 */}
                    <button className="contact-btn">CREATE MY RESUME ➔</button>
                </div>
                <div className="footer-bottom">
                    <div className="footer-info">
                        <p>TERMS OF SERVICE</p>
                        <p>PRIVACY POLICY</p>
                        <p>contact@kimspaddock.com</p>
                    </div>
                    <div className="copyright">
                        © 2026 KIM'S PADDOCK. ALL RIGHTS RESERVED.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Homepage;