import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../css/PortfolioEditor.css';

import Step1BasicInfo from '../components/portfolio/Step1_BasicInfo';
import Step2ProjectExp from '../components/portfolio/Step2_ProjectExp';
import Step3Design from '../components/portfolio/Step3_Design';
import Step4Result from '../components/portfolio/Step4_Result';

const API_BASE = "http://localhost:5000";

const INITIAL_DATA = {
  theme: 'modern',
  profile: { name: '', jobTitle: '', email: '', github: '', intro: '' },
  projects: []
};

const PortfolioEditor = () => {
  const nav = useNavigate();
  const location = useLocation();
  const portfolioId = location.state?.portfolioId || null;

  const [currentStep, setCurrentStep] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  const [data, setData] = useState(INITIAL_DATA);

  // 💡 3. 데이터 불러오기 (여기가 핵심 원인이었습니다!)
  useEffect(() => {
    if (location.state?.goToPreview) setCurrentStep(4);
    else if (location.state?.goToStep) setCurrentStep(location.state.goToStep);

    if (portfolioId) {
      axios.get(`${API_BASE}/api/portfolio/detail/${portfolioId}`)
        .then(res => {
          if (res.data.success && res.data.data) {
            let loadedContent = res.data.data.content;

            // ✨ [핵심 수정] 포트폴리오 전체를 불러올 때도 chartData와 chartDataRaw를 완벽하게 포맷팅해줍니다!
            if (loadedContent && loadedContent.projects) {
              loadedContent.projects = loadedContent.projects.map(project => ({
                ...project,
                troubleshootings: project.troubleshootings?.map(t => {
                  let rawChart = "";
                  let parsedChart = [];

                  // 데이터 타입에 맞춰 안전하게 변환
                  if (t.chartData) {
                    if (typeof t.chartData === 'string') {
                      rawChart = t.chartData;
                      try { parsedChart = JSON.parse(t.chartData); } catch(e) {}
                    } else if (Array.isArray(t.chartData)) {
                      parsedChart = t.chartData;
                      rawChart = JSON.stringify(t.chartData);
                    }
                  }

                  return {
                    ...t,
                    chartData: parsedChart, // 무조건 배열이 되어 그래프 렌더링 성공
                    chartDataRaw: rawChart  // 텍스트창에 JSON 텍스트 뿌려주기
                  };
                }) || []
              }));
            }

            setData(loadedContent ? loadedContent : INITIAL_DATA);
          }
        })
        .catch(err => {
          console.log("포트폴리오 불러오기 실패", err);
          setData(INITIAL_DATA);
        });
    }
  }, [location, portfolioId]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleTempSave = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return alert("로그인이 필요합니다!");
      const user = JSON.parse(storedUser);
      const userId = user.id || user._id || user.email;

      const response = await axios.post(`${API_BASE}/api/portfolio`, {
        userId: userId,
        portfolioId: portfolioId,
        title: `${data.profile.name || '이름 없음'}의 포트폴리오`,
        content: data
      });

      if (response.data.success) {
        alert('✅ 성공적으로 저장되었습니다!');
        nav('/mypage');
      }
    } catch (error) {
      console.error('Save Error:', error);
      alert('❌ 저장 실패');
    }
  };

  return (
    <div className="rwPage">
      <header className={`rwTop ${isScrolled ? "scrolled" : ""}`}>
        <div className="rwTopInner">
          <div className="nav-logo-btn" onClick={() => nav("/")}>
            <div className="logo-symbol"><span>F1</span></div>
            <div className="logo-text-group"><span className="logo-title">F1ND YOUR WAY</span></div>
          </div>
          <div className="preview-nav-btns">
             <button className="rwBtn secondary short" onClick={handleTempSave}>💾 임시 저장</button>
          </div>
        </div>
      </header>

      <main className="rwWrap">
        <section className="rwIntro" style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
             {[1, 2, 3, 4].map(step => (
                 <div key={step} style={{
                     width: '40px', height: '40px', borderRadius: '50%',
                     background: currentStep === step ? '#1e40af' : (currentStep > step ? '#10b981' : '#e2e8f0'),
                     color: currentStep >= step ? 'white' : '#94a3b8',
                     display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                 }}>
                     {currentStep > step ? '✓' : step}
                 </div>
             ))}
          </div>
          <h1 className="rwTitle">
            {currentStep === 1 && "STEP 1. 나를 소개하는 기본 정보"}
            {currentStep === 2 && "STEP 2. 나의 프로젝트 경험"}
            {currentStep === 3 && "STEP 3. 포트폴리오 디자인 선택"}
            {currentStep === 4 && "STEP 4. 최종 결과 확인 및 저장"}
          </h1>
        </section>

        {currentStep === 1 && <Step1BasicInfo data={data} setData={setData} nextStep={() => setCurrentStep(2)} />}
        {currentStep === 2 && <Step2ProjectExp data={data} setData={setData} prevStep={() => setCurrentStep(1)} nextStep={() => setCurrentStep(3)} />}
        {currentStep === 3 && <Step3Design data={data} setData={setData} prevStep={() => setCurrentStep(2)} nextStep={() => setCurrentStep(4)} />}
        {currentStep === 4 && <Step4Result data={data} prevStep={() => setCurrentStep(3)} onSave={handleTempSave} />}
      </main>
    </div>
  );
};

export default PortfolioEditor;