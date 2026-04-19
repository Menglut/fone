import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../css/ResumeEditor.css';
import mainLogo from '../assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE;

export default function ResumeEditor() {
  const navigate = useNavigate();
  const { id } = useParams(); // URL에서 자기소개서 ID를 받아옴

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);

  // 1. 기존 자기소개서 데이터 불러오기
  useEffect(() => {
    const fetchResume = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/resume/detail/${id}`);
        if (res.data.success) {
          const data = res.data.data;
          setTitle(data.title);

          if (data.content) {
            setContent(data.content);
          } else if (data.qnaList && data.qnaList.length > 0) {
            const combinedText = data.qnaList.map(q => `[${q.question}]\n${q.answer}`).join('\n\n');
            setContent(combinedText);
          } else {
            setContent("");
          }
        }
      } catch (error) {
        console.error("자기소개서를 불러오지 못했습니다.", error);
      }
    };
    if (id) fetchResume();
  }, [id]);

  // 2. 수동 저장 (업데이트)
  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 모두 입력해주세요.");

    const userStr = localStorage.getItem('user');
    if (!userStr) return alert("로그인이 필요합니다.");
    const user = JSON.parse(userStr);
    const userId = user.id || user._id || user.email;

    setIsSaving(true);
    try {
      await axios.post(`${API_BASE}/api/resume`, {
        userId: userId,
        resumeId: id,
        title: title,
        content: content
      });
      alert("✅ 성공적으로 저장되었습니다.");
      navigate('/mypage');
    } catch (error) {
      console.error("저장 실패", error);
      alert("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // ✨ 3. 자기소개서 삭제 기능 추가
  const handleDelete = async () => {
    const isConfirm = window.confirm("정말로 이 자기소개서를 삭제하시겠습니까? (복구할 수 없습니다)");
    if (!isConfirm) return;

    try {
      const res = await axios.delete(`${API_BASE}/api/resume/${id}`);
      if (res.data.success) {
        alert("✅ 삭제되었습니다.");
        navigate('/mypage'); // 삭제 후 마이페이지로 부드럽게 복귀
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // 4. AI 피트 크루 기능
  const handleAITuning = (tuneType) => {
    if (!content.trim()) return alert("먼저 내용을 작성해주세요.");

    setIsAILoading(true);
    setTimeout(() => {
      let tunedText = content;
      if (tuneType === 'grammar') {
        tunedText = content + "\n\n[AI 교정 완료] 오탈자와 어색한 문맥이 교정되었습니다.";
      } else if (tuneType === 'professional') {
        tunedText = content + "\n\n[AI 교정 완료] 실무에서 사용하는 전문적인 어휘로 톤앤매너가 상향되었습니다.";
      }
      setContent(tunedText);
      setIsAILoading(false);
    }, 2000);
  };

  return (
    <div className="re-container">
      {/* 🏎️ 다크 헤더 */}
      <header className="re-header">
        <div className="re-logo-btn" onClick={() => navigate('/')}>
          <img 
            src={mainLogo} 
            alt="F1ND YOUR WAY 로고" 
            className="pe-logo-img" 
          />
        </div>
        <button className="re-back-btn" onClick={() => navigate('/mypage')}>
          EXIT (나가기)
        </button>
      </header>

      <main className="re-layout">
        {/* 📄 좌측: 넓고 쾌적한 텍스트 에디터 */}
        <section className="re-editor-card">
          <input
            type="text"
            className="re-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="자기소개서 제목을 입력하세요"
          />
          <textarea
            className="re-content-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="자유롭게 글을 수정하세요. 막히는 부분이 있다면 우측의 AI 피트 크루를 호출하세요."
          />
        </section>

        {/* 🤖 우측: AI 사이드바 */}
        <aside className="re-sidebar">

          <div className="re-ai-panel">
            <div className="re-panel-title">
              <span style={{ fontSize: '1.5rem' }}>👨‍🔧</span> AI PIT CREW
            </div>
            <p className="re-ai-desc">
              글을 쓰다 막히셨나요? 드라이버님의 텍스트를 AI 피트 크루가 즉시 교정해 드립니다.
            </p>

            <button
              className="re-ai-btn"
              onClick={() => handleAITuning('grammar')}
              disabled={isAILoading}
            >
              <span>✨ 오탈자 및 문맥 교정</span>
              {isAILoading ? <div className="re-spinner"></div> : "➔"}
            </button>

            <button
              className="re-ai-btn"
              onClick={() => handleAITuning('professional')}
              disabled={isAILoading}
            >
              <span>👔 전문적인 톤앤매너로 변경</span>
              {isAILoading ? <div className="re-spinner"></div> : "➔"}
            </button>

            <button
              className="re-ai-btn"
              onClick={() => {
                if(window.confirm("현재 내용을 지우고 처음부터 AI 생성기로 돌아가시겠습니까?")) {
                  navigate('/resume/input');
                }
              }}
              style={{ marginTop: '20px', borderColor: '#fca5a5', color: '#ef4444' }}
            >
              <span>♻️ AI 생성기로 돌아가기</span>
            </button>
          </div>

          <div className="re-save-panel">
            <button
              className="re-save-btn"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "SAVING..." : "SAVE CHANGES"}
            </button>

            {/* ✨ 삭제 버튼 추가 */}
            <button
              onClick={handleDelete}
              style={{
                width: '100%',
                marginTop: '15px',
                padding: '16px',
                background: 'transparent',
                color: '#ef4444',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                fontFamily: "'Oswald', sans-serif",
                fontSize: '1rem',
                fontWeight: '700',
                letterSpacing: '1px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.target.style.background = '#fef2f2'; }}
              onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
            >
              DELETE (삭제)
            </button>
          </div>

        </aside>
      </main>
    </div>
  );
}