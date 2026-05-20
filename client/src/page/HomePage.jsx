import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/HomePage.css';
import mainLogo from '../assets/logo.png';

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 12h14" />
    <path d="M13 6.5 18.5 12 13 17.5" />
  </svg>
);

const PenIcon = () => (
  <svg className="icon-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M17 18h23v8" />
    <path d="M17 18v30h28" />
    <path d="M24 31h11" />
    <path d="M24 38h9" />
    <path className="red-stroke" d="M42 14.5l7.5 7.5" />
    <path d="M36 31l12-12 3 3-12 12-5 1.5L36 31z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="icon-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M14 24h14l4 5h18v21H14V24z" />
    <path d="M14 31h36" />
    <path className="red-stroke" d="M28 39h15" />
  </svg>
);

const InterviewIcon = () => (
  <svg className="icon-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M17 43V28c0-6 3.5-9.5 9.5-9.5h11c6 0 9.5 3.5 9.5 9.5v15" />
    <path d="M13 43h38" />
    <path d="M23 43v9" />
    <path d="M41 43v9" />
    <path className="red-stroke" d="M28 28h12" />
    <path className="red-stroke" d="M28 34h8" />
  </svg>
);

const KeyboardIcon = () => (
  <svg className="round-icon-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <rect x="16" y="23" width="32" height="20" rx="4" />
    <path d="M23 30h3M30 30h3M37 30h3M44 30h1M23 36h19" />
  </svg>
);

const SparkIcon = () => (
  <svg className="round-icon-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M28 15l4.5 11.5L44 31l-11.5 4.5L28 47l-4.5-11.5L12 31l11.5-4.5L28 15z" />
    <path d="M45 13l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" />
  </svg>
);

const FlagIcon = () => (
  <svg className="round-icon-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M23 51V14" />
    <path d="M23 17c7-4 12 5 20 1v20c-8 4-13-5-20-1V17z" />
    <path className="red-stroke" d="M27 23l5-3M37 27l5-3M27 32l5-3M37 36l5-3" />
  </svg>
);

const UserIcon = () => (
  <svg className="mini-icon-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M32 32a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
    <path d="M18 49c2.7-8 9-12 14-12s11.3 4 14 12" />
    <path className="red-stroke" d="M41 17c4 2 6 5.5 6.5 10" />
  </svg>
);

const DocIcon = () => (
  <svg className="mini-icon-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M21 14h17l8 8v28H21V14z" />
    <path d="M38 14v9h8" />
    <path d="M27 32h12M27 38h12M27 44h8" />
    <path className="red-stroke" d="M27 26h6" />
  </svg>
);

const QuestionIcon = () => (
  <svg className="mini-icon-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M17 18h30v24H31l-8 7v-7h-6V18z" />
    <path className="red-stroke" d="M32 34v-1.5c0-2.8 6-3.4 6-8 0-3.6-3-6-7-6-3.2 0-5.8 1.5-7.2 4" />
    <path className="red-stroke" d="M32 39h.1" />
  </svg>
);

const Homepage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch {
      localStorage.removeItem('user');
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const sections = Array.from(container.querySelectorAll('.snap-section'));
    let isLocked = false;

    const getCurrentIndex = () => {
      const top = container.scrollTop;
      let current = 0;
      sections.forEach((section, index) => {
        if (Math.abs(section.offsetTop - top) < Math.abs(sections[current].offsetTop - top)) {
          current = index;
        }
      });
      return current;
    };

    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 24);
    };

    const handleWheel = (event) => {
      const desktop = window.matchMedia('(min-width: 1025px)').matches;
      if (!desktop || sections.length === 0) return;

      event.preventDefault();
      if (isLocked || Math.abs(event.deltaY) < 8) return;

      const current = getCurrentIndex();
      const direction = event.deltaY > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(sections.length - 1, current + direction));
      if (next === current) return;

      isLocked = true;
      sections[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        isLocked = false;
      }, 850);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    alert('성공적으로 로그아웃 되었습니다.');
  };

  const moveTo = (id) => {
    containerRef.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="container" ref={containerRef}>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <a href="/" className="nav-logo-btn">
          <img src={mainLogo} alt="F1ND YOUR WAY 로고" className="navbar-logo-img" />
        </a>

        <div className="nav-menu center-menu">
          <a href="/resume">자기소개서</a>
          <a href="/portfolio">포트폴리오</a>
          <a href="/interview/prep">면접연습</a>
        </div>

        <div className="nav-auth">
          {user ? (
            <>
              <button type="button" onClick={() => navigate('/mypage')} className="login-link nav-text-btn">
                MY DASHBOARD
              </button>
              <button type="button" onClick={handleLogout} className="signup-btn nav-box-btn">
                LOGOUT
              </button>
            </>
          ) : (
            <>
              <a href="/auth" className="login-link">LOGIN</a>
              <a href="/auth" className="signup-btn">SIGN UP</a>
            </>
          )}
        </div>
      </nav>

      <header id="hero" className="hero snap-section">
        <div className="hero-bg-overlay" />

        <div className="hero-content">
          <div className="hero-copy">
            <p className="section-kicker">AI-POWERED CAREER SOLUTION</p>
            <h1 className="hero-title">F1ND YOUR <span>WAY</span></h1>
            <p className="hero-desc">
              AI가 당신의 커리어 여정을 함께합니다.<br />
              자기소개서와 포트폴리오 작성부터 면접 연습까지 한 번에.
            </p>
            <div className="hero-actions">
              <button type="button" className="ghost-btn" onClick={() => moveTo('flow')}>
                서비스 확인 <ArrowIcon />
              </button>
            </div>
          </div>

          <div className="scroll-hint">
            <span>SCROLL TO EXPLORE</span>
            <span>↓</span>
          </div>

          <div className="hero-cards" aria-label="주요 기능">
            <article className="service-card" onClick={() => navigate('/resume')}>
              <div className="service-card-top">
                <div className="feature-icon"><PenIcon /></div>
                <span className="card-link"><ArrowIcon /></span>
              </div>
              <h3>AI 자기소개서 작성</h3>
              <p>채용공고와 경험을 기반으로 AI가 맞춤형 자기소개서를 완성합니다.</p>
              <div className="chat-preview">
                <span>어떤 경험을 강조하고 싶으신가요?</span>
                <strong>신제품 기획 경험을 강조하고 싶어요.</strong>
              </div>
            </article>

            <article className="service-card" onClick={() => navigate('/portfolio')}>
              <div className="service-card-top">
                <div className="feature-icon"><FolderIcon /></div>
                <span className="card-link"><ArrowIcon /></span>
              </div>
              <h3>AI 포트폴리오 작성</h3>
              <p>프로젝트와 경험을 체계적으로 정리해 매력적인 포트폴리오를 만들어드립니다.</p>
              <div className="portfolio-preview">
                <div>
                  <b>PROJECT 01</b>
                  <span /><span /><span className="short" />
                </div>
                <div className="portfolio-thumb" />
              </div>
            </article>

            <article className="service-card" onClick={() => navigate('/interview/prep')}>
              <div className="service-card-top">
                <div className="feature-icon"><InterviewIcon /></div>
                <span className="card-link"><ArrowIcon /></span>
              </div>
              <h3>AI 역면접</h3>
              <p>자기소개서와 포트폴리오를 바탕으로 실제 같은 면접 질문을 제공합니다.</p>
              <div className="interview-preview">
                <span>이 프로젝트에서 가장 어려웠던 점은 무엇이었고, 어떻게 해결했나요?</span>
                <strong>데이터 수집의 한계가 있었지만...</strong>
              </div>
            </article>
          </div>
        </div>
      </header>

      <section id="flow" className="flow-section snap-section">
        <div className="section-bg" />
        <div className="section-inner compact-inner">
          <div className="section-heading center-heading">
            <p className="section-kicker">서비스 흐름</p>
            <h2>단계별로 완성하는 나만의 커리어</h2>
            <p>처음부터 복잡하게 작성하지 않아도 됩니다. 필요한 내용을 입력하면 AI가 초안을 만들고, 사용자는 수정과 완성에 집중할 수 있습니다.</p>
          </div>

          <div className="process-grid">
            <article className="process-step">
              <div className="step-number">01</div>
              <div className="round-icon"><KeyboardIcon /></div>
              <h3>입력</h3>
              <p>지원 공고, 경험, 프로젝트 내용을 짧게 입력합니다.</p>
            </article>

            <article className="process-step">
              <div className="step-number">02</div>
              <div className="round-icon"><SparkIcon /></div>
              <h3>AI 생성</h3>
              <p>입력 내용을 기반으로 자기소개서와 포트폴리오 초안을 생성합니다.</p>
            </article>

            <article className="process-step">
              <div className="step-number">03</div>
              <div className="round-icon"><FlagIcon /></div>
              <h3>수정 및 완성</h3>
              <p>AI가 만든 결과를 다듬고 면접 질문까지 이어갑니다.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="strength" className="strength-section snap-section">
        <div className="section-bg" />
        <div className="section-inner">
          <div className="section-heading">
            <p className="section-kicker">AI가 알아서 더 강력합니다</p>
            <h2>왜 F1ND YOUR WAY 인가요?</h2>
          </div>

          <div className="strength-grid">
            <article className="strength-card">
              <div className="circle-icon"><UserIcon /></div>
              <div>
                <h3>맞춤형 AI 가이드</h3>
                <p>지원 직무와 사용자의 경험을 연결해 어필 포인트를 잡아줍니다.</p>
              </div>
              <div className="mini-progress"><span /></div>
            </article>

            <article className="strength-card">
              <div className="circle-icon"><DocIcon /></div>
              <div>
                <h3>완성도 높은 문서 생성</h3>
                <p>자기소개서와 포트폴리오를 따로 만들지 않고 하나의 흐름으로 관리합니다.</p>
              </div>
              <div className="doc-preview"><span /><span /><span /><span /></div>
            </article>

            <article className="strength-card">
              <div className="circle-icon"><QuestionIcon /></div>
              <div>
                <h3>실전 같은 역면접 연습</h3>
                <p>내 문서 기반 질문으로 예상 질문을 만들고 답변 방향을 점검합니다.</p>
              </div>
              <div className="q-preview"><b>Q1</b><span /><b>Q2</b><span /><b>Q3</b><span /></div>
            </article>
          </div>
        </div>
      </section>

      <section id="start" className="final-cta snap-section">
        <div className="cta-overlay" />
        <div className="cta-content">
          <h2>지금, 당신의 커리어 여정을 시작하세요</h2>
          <p>F1ND YOUR WAY와 함께 더 빠르고 정밀한 커리어 방향을 찾고, 합격에 필요한 문서를 하나씩 완성해보세요.</p>
          <div className="hero-actions">
            <button type="button" className="ghost-btn" onClick={() => moveTo('hero')}>
              처음으로 <ArrowIcon />
            </button>
          </div>
        </div>

        <footer className="footer">
          <a href="/" className="nav-logo-btn">
            <img src={mainLogo} alt="F1ND YOUR WAY 로고" className="navbar-logo-img" />
          </a>
          <p>© 2026 F1ND YOUR WAY. All rights reserved.</p>
        </footer>
      </section>
    </div>
  );
};

export default Homepage;
