import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import mermaid from 'mermaid';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';
import mainLogo from '../assets/logo.png';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import '../css/PortfolioEditor.css';

const API_BASE = process.env.REACT_APP_API_BASE;

const THEME_COLORS = {
  modern: { accent: '#1e40af', textSub: '#64748b', border: '#e2e8f0' },
  dark: { accent: '#e10600', textSub: '#9ca3af', border: '#2a2a2a' },
  minimal: { accent: '#000000', textSub: '#555555', border: '#000000' }
};

const MermaidViewer = ({ code, themeMode }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!code || !ref.current) return;

    let cleanCode = code
      .replace(/```mermaid\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    mermaid.initialize({
      startOnLoad: false,
      theme: themeMode === 'dark' ? 'dark' : 'default',
      flowchart: {
        useMaxWidth: true, // ✅ 핵심: 축소 비활성화
        htmlLabels: true,
      }
    });

    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

    mermaid.render(id, cleanCode)
      .then(({ svg }) => {
        if (!ref.current) return;

        ref.current.innerHTML = svg;

        const svgEl = ref.current.querySelector('svg');
        if (svgEl) {
          // width/height 속성 제거 → CSS로 제어
          svgEl.removeAttribute('width');
          svgEl.removeAttribute('height');

          // ✅ 핵심: SVG가 컨테이너보다 크면 원본 크기 유지 (축소 안 함)
          svgEl.style.width = '100%';
          svgEl.style.height = '100%';
          svgEl.style.maxHeight = '100%';
        }
      })
      .catch((e) => {
        if (ref.current) ref.current.innerHTML = '<p style="color:red">다이어그램 렌더링 실패</p>';
        console.error('Mermaid Error', e);
      });
  }, [code, themeMode]);

  return (
    // ✅ 핵심: 가로 스크롤 허용 컨테이너
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100%',
        overflowX: 'auto', // 가로 스크롤
        overflowY: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  );
};

export default function BuilderResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('modern');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflowY = 'auto';
    document.documentElement.style.overflowY = 'auto';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  const rawData = location.state?.portfolioData;
  const passedUserInfo = location.state?.userInfo;

  const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  const compactText = (value, maxLength) => {
    const text = cleanText(value);
    if (text.length <= maxLength) return text;

    const sliced = text.slice(0, maxLength).trim();
    const lastSentenceEnd = Math.max(
      sliced.lastIndexOf('.'),
      sliced.lastIndexOf('!'),
      sliced.lastIndexOf('?'),
      sliced.lastIndexOf('다'),
      sliced.lastIndexOf('요')
    );

    if (lastSentenceEnd > Math.floor(maxLength * 0.58)) {
      return `${sliced.slice(0, lastSentenceEnd + 1).trim()}…`;
    }

    return `${sliced.replace(/[\s,.;:!?-]+$/g, '').trim()}…`;
  };

  // 포트폴리오 슬라이드는 A4 한 장 고정 레이아웃이라 원문이 너무 길면
  // CSS가 중간에서 잘라 보일 수 있다. 그래서 표시용 문구만 문장 단위로 정리한다.
  const fitPortfolioText = (value, maxLength) => compactText(value, maxLength);

  const getPortfolioDensityClass = (project = {}) => {
    const totalLength = [project.why, project.how, project.then].map(cleanText).join(' ').length;
    if (totalLength > 620) return 'copy-ultra-dense';
    if (totalLength > 480) return 'copy-dense';
    return '';
  };

  const getStoredUserInfo = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : { name: '지원자', email: '' };
    } catch (error) {
      return { name: '지원자', email: '' };
    }
  };

  const normalizeResultProject = (project = {}) => ({
    ...project,
    title: compactText(project.title, 60),
    techStack: compactText(project.techStack, 120),
    why: fitPortfolioText(project.why, 210),
    how: fitPortfolioText(project.how, 230),
    then: fitPortfolioText(project.then, 160)
  });

  const initialProjectList = Array.isArray(rawData) ? rawData : (rawData ? [rawData] : []);

  const projectList = initialProjectList.map(proj => {
    if (proj.troubleshootings && proj.troubleshootings.length > 0) {
      const first = proj.troubleshootings[0];
      return normalizeResultProject({
        ...proj,
        why: first.why || proj.why,
        how: first.how || proj.how,
        then: first.then || proj.then,
        architectureCode: first.architectureCode || proj.architectureCode,
        chartData: first.chartData || proj.chartData
      });
    }

    return normalizeResultProject(proj);
  });

  const userInfo = passedUserInfo || getStoredUserInfo();

  // 완벽하게 동작하는 PDF 다운로드 로직 (유지)
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const slides = document.querySelectorAll('#portfolio-content .portfolio-slide');

      if (!slides || slides.length === 0) {
        setIsGeneratingPdf(false);
        return;
      }

      const firstCanvas = await html2canvas(slides[0], {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff',
      });

      const pxWidth = firstCanvas.width;
      const pxHeight = firstCanvas.height;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [pxWidth, pxHeight],
      });

      for (let i = 0; i < slides.length; i++) {
        const canvas = await html2canvas(slides[i], {
          scale: 2,
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: '#ffffff',
          windowWidth: slides[i].scrollWidth,
          windowHeight: slides[i].scrollHeight,
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        if (i > 0) {
          pdf.addPage([pxWidth, pxHeight], 'landscape');
        }

        pdf.addImage(imgData, 'JPEG', 0, 0, pxWidth, pxHeight);
      }

      pdf.save(`${userInfo.name}_포트폴리오.pdf`);
    } catch (e) {
      console.error('PDF 생성 오류:', e);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveToDashboard = async () => {
    const userId = userInfo?.id || userInfo?._id || userInfo?.email || 'guest';
    const payload = { userId, title: `${userInfo.name}의 포트폴리오`, content: projectList };

    try {
      await axios.post(`${API_BASE}/api/builder/save`, { userId, title: payload.title, portfolioData: projectList });
      const res = await axios.post(`${API_BASE}/api/portfolio`, payload);

      if (res.data.success) {
        alert('저장 성공! ');
        navigate('/mypage');
      }
    } catch (e) {
      alert('저장 중 오류 발생');
    }
  };

  if (!projectList || projectList.length === 0) return null;

  const currentThemeColor = THEME_COLORS[theme];

  return (
    <div className={`portfolio-wrapper theme-${theme}`}>
      {/* ✨ 수정됨: width: '100%' 추가로 쪼그라드는 현상 완벽 방어 */}
      <header className="room-header" style={{
        width: '100%', /* 핵심: 화면 전체 너비 강제 고정 */
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 32px',
        flexShrink: 0,
        position: 'relative',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#000',
        zIndex: 100
      }}>
        {/* 좌측: 로고 */}
        <div className="room-logo-btn" onClick={() => navigate('/')} style={{ position: 'relative', zIndex: 20 }}>
          <img src={mainLogo} alt="로고" className="builder-logo-img" style={{ mixBlendMode: 'unset' }} />
        </div>

        {/* 우측: 컨트롤 버튼들 */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative', zIndex: 20 }}>
          <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', cursor: 'pointer', backgroundColor: '#fff' }}>
            <option value="modern">Modern (Blue)</option>
            <option value="dark">Dark (Red)</option>
            <option value="minimal">Minimal (B&W)</option>
          </select>

          {/* ✨ 버튼 디자인 PortfolioEditPage와 동일하게 통일 */}
          <button
            className="room-exit-btn"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
          >
            {isGeneratingPdf ? '⏳ 캡처중...' : ' PDF'}
          </button>

          <button
            className="room-exit-btn"
            onClick={handleSaveToDashboard}
            style={{ backgroundColor: '#fff', color: '#111' }}
          >
            대시보드로 이동
          </button>
        </div>
      </header>

      <div className={`pdf-scale-container ${isGeneratingPdf ? 'print-mode' : 'preview-mode'}`}>
        <div id="portfolio-content" className={`portfolio-content-list theme-${theme} ${isGeneratingPdf ? 'print-mode' : 'preview-mode'}`}>
          <section className="portfolio-slide cover-slide">
            <div className="cover-header">
              <h1 className="cover-title">{userInfo.name}</h1>
              <h2 className="cover-subtitle">AI 역량 추출 포트폴리오</h2>
            </div>

            <div className="cover-info">
              {userInfo.email && <p>Email: {userInfo.email}</p>}
              {userInfo.intro && <p>{compactText(userInfo.intro, 120)}</p>}
            </div>
          </section>

          {projectList.map((project, idx) => {
            let safeChartData = [];

            try {
              let rawChart = project.chartData;

              if (typeof rawChart === 'string' && rawChart.trim() !== '') rawChart = JSON.parse(rawChart);

              if (Array.isArray(rawChart)) {
                safeChartData = rawChart.map(item => ({ ...item, value: Number(item.value) })).slice(0, 5);
              }
            } catch (e) {}

            return (
              <section key={idx} className={`portfolio-slide ${getPortfolioDensityClass(project)}`}>
                {/* 1. 프로젝트 제목 & 경계선 */}
                <div className="project-header">
                  <h2 className="project-title">
                    <span className="project-title-num">0{idx + 1}.</span> {project.title}
                  </h2>
                </div>

                {/* ✨ 2. 새로 이동한 기술 스택 영역 (경계선 바로 아래에 위치) */}
                {project.techStack && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', paddingLeft: '2px' }}>
                    {project.techStack.split(',').map((tag, i) => tag.trim() && (
                      <span key={i} style={{
                        background: currentThemeColor.accent,
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: '20px', /* 동글동글한 칩 형태 */
                        fontSize: '0.8rem',
                        fontWeight: '600',
                      }}>
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* 3. 본문 영역 (기술 스택 아래 남은 공간을 알아서 채움) */}
                <div className="project-body">
                  <div className="project-text-area">
                    <div className="text-box red">
                      <div className="text-box-title" style={{ color: currentThemeColor.accent }}> 배경</div>
                      <div className="text-box-content">{project.why}</div>
                    </div>

                    <div className="text-box green">
                      <div className="text-box-title" style={{ color: currentThemeColor.accent }}> 전략</div>
                      <div className="text-box-content">{project.how}</div>
                    </div>

                    <div className="text-box orange">
                      <div className="text-box-title" style={{ color: currentThemeColor.accent }}> 성과</div>
                      <div className="text-box-content bold">{project.then}</div>
                    </div>
                  </div>

                  {(project.architectureCode || safeChartData.length > 0) && (
                    <div className="project-visual-area">
                      {project.architectureCode && (
                        <div className="visual-box">
                          <MermaidViewer code={project.architectureCode} themeMode={theme} />
                        </div>
                      )}

                      {safeChartData.length > 0 && (
                        <div className="chart-box">
                          <h5 style={{ margin: '0 0 10px 10px', color: currentThemeColor.textSub, fontSize: '1rem', fontWeight: 'bold' }}> 성과 지표</h5>
                          <div className="chart-container-wrapper">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={safeChartData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                                <defs>
                                  <linearGradient id={`colorValue-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={currentThemeColor.accent} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={currentThemeColor.accent} stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={currentThemeColor.border} />
                                <XAxis dataKey="name" stroke={currentThemeColor.textSub} fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke={currentThemeColor.textSub} fontSize={10} width={60} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                                <Area isAnimationActive={false} type="monotone" dataKey="value" stroke={currentThemeColor.accent} strokeWidth={2} fillOpacity={1} fill={`url(#colorValue-${idx})`} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
