import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/HomePage.css'; 

// 초기값 (나중에 DB에서 불러온 값으로 대체됨)
const initialData = {
  profile: {
    name: '',
    email: '',
    jobTitle: '', // 예: Backend Developer
    github: '',
    intro: ''     // 한줄 소개
  },
  projects: [
    {
      id: 1,
      title: '',
      period: '',
      techStack: [], // 예: ['React', 'Node.js']
      description: '',
      repoLink: ''
    }
  ],
  education: []
};

const Homepage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate(); // navigate 함수 생성
  const [user, setUser] = useState(null); // 로그인된 유저 정보를 담을 상태

  useEffect(() => {
    const handleScroll = () => {
      // 50px 이상 스크롤되었을 때만 상태를 true로 변경 (불필요한 렌더링 방지)
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

    const handleLogout = () => {
      localStorage.removeItem('user'); // 스토리지에서 유저 데이터 삭제
      setUser(null); // 상태를 다시 null로 돌려 화면 업데이트
      alert('성공적으로 로그아웃 되었습니다.');
    };

    const handleSmartResumeClick = () => {
        navigate('/resume/input');
    };

    const handleSmartPortfolioClick = () => {
        navigate('/portfolio');
    };

    const handleSmartInterviewClick = () => {
        navigate('/interview/prep');
    };

    const handleSmartBuilderClick = () => {
        navigate('/builder');
    };


    return (
        <div className="container">
            {/* --- NAVIGATION --- */}
            <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
                {/* 1. Logo: 서비스 이름에 맞게 수정 */}
                <a href="/" className="nav-logo-btn">
                    <div className="logo-symbol">
                        <span>F1</span>
                    </div>
                    <div className="logo-text-group">
                        <span className="logo-title">F1ND YOUR WAY</span>
                    </div>
                </a>

                {/* 2. Menu */}
                <div className="nav-menu center-menu">
                    <a href="/resume/input">자기소개서</a>        {/* 메뉴명 변경 */}
                    <a href="/builder">포트폴리오</a>  {/* 메뉴명 변경 */}
                    <a href="#pricing">면접연습</a>       {/* 메뉴명 변경 */}
                </div>

                {/* 3. Auth */}
                <div className="nav-auth" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {user ? (
                        /* ✨ 로그인 했을 때 (유저 이름, 대시보드, 로그아웃 표시) */
                        <>
                            <button
                                onClick={() => navigate('/mypage')}
                                className="login-link"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Oswald' }}>
                                MY DASHBOARD
                            </button>
                            <button
                                onClick={handleLogout}
                                className="signup-btn"
                                style={{ background: 'transparent', cursor: 'pointer' }}>
                                LOGOUT
                            </button>
                        </>
                    ) : (
                        /* ✨ 로그인 안 했을 때 (기존 방식 유지) */
                        <>
                            <a href="/auth" className="login-link">LOGIN</a>
                            <a href="/auth" className="signup-btn">SIGN UP</a>
                        </>
                    )}
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <header className="hero">
                <div className="hero-bg-overlay"></div>
                <div className="hero-content">
                    <div className="hero-label">AI-POWERED CAREER SOLUTION</div>
                    <h1 className="hero-title">
                        F1ND YOUR <span className="outline-text">WAY</span>
                    </h1>
                    <div className="hero-footer">
                        <div className="scroll-indicator">
                            &nbsp;&nbsp;&nbsp;START YOUR RACING
                            <span className="arrow-down">↓</span>
                        </div>
                        <p className="hero-desc">
                            0.01초의 차이로 승부가 갈리는 F1처럼,<br />
                            당신의 서류가 합격선에 도달하도록<br />
                            최적의 서류를 만들어 드립니다.
                        </p>
                    </div>
                </div>
            </header>

            {/* --- SOLUTIONS (Features) --- */}
            <section id="features" className="section-container">
                <div className="section-header">
                    <h2>ENGINEERING SOLUTIONS</h2>
                </div>

                {/* 기능 소개 그리드 */}
                <div className="fsn-grid">
                    <div className="grid-card" onClick={handleSmartResumeClick}>
                        <div className="card-top">
                            <span className="card-num">S1</span>
                            <span className="card-cat">RESUME SETTING</span>
                        </div>
                        <h3 className="card-title">자기소개서</h3>
                        <p className="card-desc">
                            직무별 핵심 키워드 자동 추천 및<br/>
                            가독성을 극대화한 F자형 레이아웃 설계
                        </p>
                        <div className="card-arrow">↗</div>
                    </div>

                    <div className="grid-card" onClick={handleSmartPortfolioClick}> 
                        <div className="card-top" > 
                            <span className="card-num">S2</span>
                            <span className="card-cat">VISUAL SETUP</span>
                        </div>
                        <h3 className="card-title">포트폴리오</h3>
                        <p className="card-desc">
                            드래그 앤 드롭으로 완성하는<br/>
                            임팩트 있는 프로젝트 쇼케이스 생성
                        </p>
                        <div className="card-arrow">↗</div>
                    </div>

                    <div className="grid-card" onClick={handleSmartInterviewClick}>
                        <div className="card-top">
                            <span className="card-num">S3</span>
                            <span className="card-cat">AI TELEMETRY</span>
                        </div>
                        <h3 className="card-title">면접 연습</h3>
                        <p className="card-desc">
                            작성된 자소서와 포트폴리오를 기반으로<br/>
                            실제 면접에 나올 수 있는 질문 생성
                        </p>
                        <div className="card-arrow">↗</div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer id="contact" className="footer">
                <div className="footer-top">
                    <h2>READY TO RACE?</h2>
                    
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