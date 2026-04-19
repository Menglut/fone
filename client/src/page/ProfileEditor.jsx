import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/ProfileEditor.css';
import mainLogo from '../assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE;

export default function ProfileEditor() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    jobTitle: '',
    github: '',
    intro: ''
  });

  // ✨ 로딩 상태 없이 바로 데이터를 요청하고 채워넣습니다.
  useEffect(() => {
    const fetchProfileData = async () => {
      const user = localStorage.getItem('user');
      if (!user) return navigate('/auth');

      try {
        const userData = JSON.parse(user);
        const userId = userData.id || userData._id || userData.email;

        const res = await axios.get(`${API_BASE}/api/profile/${userId}`);

        if (res.data.success && res.data.data) {
          const fetchedData = res.data.data;
          setProfile({
            name: fetchedData.name || '',
            email: fetchedData.email || '',
            jobTitle: fetchedData.jobTitle || '',
            github: fetchedData.github || '',
            intro: fetchedData.intro || ''
          });
        }
      } catch (err) {
        console.error("기존 프로필 정보를 불러오는데 실패했습니다.", err);
      }
    };

    fetchProfileData();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

const handleAiGenerate = async () => {
    // 1. 자기소개 칸에 아무것도 안 적었을 때 방어 로직
    if (!profile.intro.trim()) {
      return alert("먼저 다듬고 싶은 내용이나 키워드를 자기소개 칸에 간단히 적어주세요!");
    }
    setIsAiLoading(true);

    // 2. 현재 적힌 내용을 프롬프트로 사용하기 위해 임시 저장
    const currentText = profile.intro;
    
    // 3. 텍스트 박스 초기화 (AI가 새로 스트리밍으로 채워넣기 위함)
    setProfile(prev => ({ ...prev, intro: "" }));

    try {
      const response = await fetch(`${API_BASE}/api/generate/profile-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 4. 저장해둔 currentText를 AI에게 전달
          userPrompt: `너는 전문 커리어 컨설턴트야. 아래 내용을 바탕으로 매력적인 자기소개 문장만 한국어로 작성해줘. 다른 설명이나 JSON 형식 없이 오직 결과 문장만 출력해. ${currentText}`
        }),
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.replace('data: ', '').trim();
              if (jsonStr === '[DONE]') break;

              const data = JSON.parse(jsonStr);
              const content = data.choices[0]?.delta?.content || "";
              accumulatedText += content;

              setProfile(prev => ({ ...prev, intro: accumulatedText }));
            } catch (e) { }
          }
        }
      }
    } catch (error) {
      console.error("AI Generation Error:", error);
      alert("AI 생성 중 오류가 발생했습니다.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user.id || user._id || user.email;
      await axios.post(`${API_BASE}/api/profile`, { userId, ...profile });
      alert("성공적으로 저장되었습니다.");
      navigate('/mypage');
    } catch (error) {
      alert("저장에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 💡 기존의 if (isDataFetching) 로딩 리턴 부분을 삭제했습니다.

  return (
    <div className="pe-container">
      <nav className="pe-header">
        <div className="pe-logo-btn" onClick={() => navigate('/')}>
          <img 
            src={mainLogo} 
            alt="F1ND YOUR WAY 로고" 
            className="pe-logo-img" 
          />
        </div>
        <button className="pe-back-btn" onClick={() => navigate('/mypage')}>대시보드로 돌아가기</button>
      </nav>

      <div className="pe-wrapper">
        <header className="pe-title-section">
          <h1 className="pe-main-title">Profile Editor</h1>
          <p className="pe-sub-title">포트폴리오와 자기소개서에 사용될 당신의 마스터 프로필입니다.</p>
        </header>

        <div className="pe-card">
          <div className="pe-card-header">
            <span className="pe-card-tag">Information</span>
            <h3 className="pe-card-title">기본 프로필 상세</h3>
          </div>

          <div className="pe-grid">
            <div className="pe-input-group">
              <label className="pe-label">이름</label>
              <input type="text" className="pe-input" name="name" value={profile.name} onChange={handleChange} placeholder="실명을 입력하세요" />
            </div>
            <div className="pe-input-group">
              <label className="pe-label">이메일</label>
              <input type="email" className="pe-input" name="email" value={profile.email} onChange={handleChange} placeholder="example@email.com" />
            </div>
            <div className="pe-input-group pe-full">
              <label className="pe-label">희망 직무 (Job Title)</label>
              <input type="text" className="pe-input" name="jobTitle" value={profile.jobTitle} onChange={handleChange} placeholder="예: 프론트엔드 개발자" />
            </div>
            <div className="pe-input-group pe-full">
              <label className="pe-label">소셜 링크 (GitHub / Blog / LinkedIn)</label>
              <input type="text" className="pe-input" name="github" value={profile.github} onChange={handleChange} placeholder="https://github.com/..." />
            </div>
            <div className="pe-input-group pe-full">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="pe-label" style={{ margin: 0 }}>자기 소개 (Introduction)</label>
              
              <button 
                onClick={handleAiGenerate} 
                disabled={isAiLoading}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  backgroundColor: '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isAiLoading ? 'not-allowed' : 'pointer',
                  opacity: isAiLoading ? 0.7 : 1
                }}
              >
                {isAiLoading ? "✨ 작성 중..." : "✨ AI 문장 다듬기"}
              </button>
            </div>
            
            <textarea
              className="pe-textarea"
              name="intro"
              value={profile.intro}
              onChange={handleChange}
              disabled={isAiLoading}
              placeholder="키워드나 개요를 적고 우측 상단의 AI 문장 다듬기 버튼을 눌러보세요!"
            />
          </div>
          </div>
        </div>

        <div className="pe-btn-group">
          <button className="pe-save-btn" onClick={handleSave} disabled={isLoading}>
            {isLoading ? "저장 중..." : "프로필 설정 완료 ➔"}
          </button>
        </div>
      </div>
    </div>
  );
}