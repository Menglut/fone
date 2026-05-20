import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import '../css/ResumeEditor.css';
import mainLogo from '../assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE;

const POLISH_MODE_LABELS = {
  grammar: '오탈자/문맥 다듬기',
  professional: '자기소개서 톤 강화',
  expand: '내용 보강하기',
};

export default function ResumeEditor() {
  const navigate = useNavigate();
  const { id } = useParams(); // URL에서 자기소개서 ID를 받아옴

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [polishDraft, setPolishDraft] = useState(null);
  const [isPolishModalOpen, setIsPolishModalOpen] = useState(false);

  const contentCharCount = content.length;
  const contentCharCountWithoutSpaces = content.replace(/\s/g, '').length;
  const contentLineCount = content.trim() ? content.trim().split(/\n+/).length : 0;
  const isShortCoverLetter = contentCharCount > 0 && contentCharCount < 800;
  const polishedCharCount = polishDraft?.polishedText?.length || 0;
  const polishedCharCountWithoutSpaces = polishDraft?.polishedText?.replace(/\s/g, '').length || 0;

  // 1. 기존 자기소개서 데이터 불러오기
  useEffect(() => {
    const fetchResume = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/resume/detail/${id}`);
        if (res.data.success) {
          const data = res.data.data;
          setTitle(data.title || '');

          if (data.content) {
            setContent(data.content);
          } else if (data.qnaList && data.qnaList.length > 0) {
            const combinedText = data.qnaList.map((q) => `[${q.question}]\n${q.answer}`).join('\n\n');
            setContent(combinedText);
          } else {
            setContent('');
          }
        }
      } catch (error) {
        console.error('자기소개서를 불러오지 못했습니다.', error);
      }
    };
    if (id) fetchResume();
  }, [id]);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setPolishDraft(null);
    setIsPolishModalOpen(false);
  };

  // 2. 수동 저장 (업데이트)
  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return alert('제목과 내용을 모두 입력해주세요.');

    const userStr = localStorage.getItem('user');
    if (!userStr) return alert('로그인이 필요합니다.');
    const user = JSON.parse(userStr);
    const userId = user.id || user._id || user.email;

    setIsSaving(true);
    try {
      await axios.post(`${API_BASE}/api/resume`, {
        userId,
        resumeId: id,
        title,
        content,
      });
      alert('✅ 성공적으로 저장되었습니다.');
      navigate('/mypage');
    } catch (error) {
      console.error('저장 실패', error);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // ✨ 3. 자기소개서 삭제 기능 추가
  const handleDelete = async () => {
    const isConfirm = window.confirm('정말로 이 자기소개서를 삭제하시겠습니까? (복구할 수 없습니다)');
    if (!isConfirm) return;

    try {
      const res = await axios.delete(`${API_BASE}/api/resume/${id}`);
      if (res.data.success) {
        alert('✅ 삭제되었습니다.');
        navigate('/mypage'); // 삭제 후 마이페이지로 부드럽게 복귀
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 4. AI 글 다듬기 기능
  const handleAITuning = async (tuneType) => {
    if (!content.trim()) return alert('먼저 내용을 작성해주세요.');
    if (isAILoading) return;

    setIsAILoading(true);
    setPolishDraft(null);

    try {
      const res = await axios.post(`${API_BASE}/api/generate/polish-resume`, {
        title,
        content,
        mode: tuneType,
        targetLength: 800,
      });

      const data = res.data || {};
      if (!data.success || !data.polishedText) {
        throw new Error(data.message || 'AI 다듬기 결과를 불러오지 못했습니다.');
      }

      setPolishDraft({
        mode: tuneType,
        polishedText: data.polishedText,
        note: data.note || `${POLISH_MODE_LABELS[tuneType] || 'AI 다듬기'} 결과입니다.`,
      });
      setIsPolishModalOpen(true);
    } catch (error) {
      console.error('AI 글 다듬기 실패:', error);
      alert(error.message || 'AI 글 다듬기 중 오류가 발생했습니다.');
    } finally {
      setIsAILoading(false);
    }
  };

  const handleApplyPolishDraft = () => {
    if (!polishDraft?.polishedText) return;
    setContent(polishDraft.polishedText);
    setPolishDraft(null);
    setIsPolishModalOpen(false);
  };

  const handleDismissPolishDraft = () => {
    setPolishDraft(null);
    setIsPolishModalOpen(false);
  };

  const handleOpenPolishModal = () => {
    if (!polishDraft?.polishedText) return;
    setIsPolishModalOpen(true);
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

          <div className="re-editor-toolbar">
            <div className="re-char-count-card">
              <span>공백 포함</span>
              <strong>{contentCharCount.toLocaleString()}자</strong>
            </div>
            <div className="re-char-count-card">
              <span>공백 제외</span>
              <strong>{contentCharCountWithoutSpaces.toLocaleString()}자</strong>
            </div>
          </div>

          {isShortCoverLetter && (
            <div className="re-length-alert">
              현재 글이 약간 짧아요. 일반적인 자기소개서 초안은 공백 포함 800자 이상이면 더 설득력 있게 보일 수 있어요.
            </div>
          )}

          <textarea
            className="re-content-textarea"
            value={content}
            onChange={handleContentChange}
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
              글을 쓰다 막히셨나요? 현재 자기소개서 내용을 기준으로 문장을 다듬거나, 부족한 분량을 자연스럽게 보강할 수 있어요.
            </p>

            <button
              className="re-ai-btn"
              onClick={() => handleAITuning('grammar')}
              disabled={isAILoading || !content.trim()}
            >
              <span>오탈자/문맥 다듬기</span>
              <small>문장 자연스럽게</small>
            </button>

            <button
              className="re-ai-btn"
              onClick={() => handleAITuning('professional')}
              disabled={isAILoading || !content.trim()}
            >
              <span>자기소개서 톤 강화</span>
              <small>더 전문적으로</small>
            </button>

            <button
              className="re-ai-btn"
              onClick={() => handleAITuning('expand')}
              disabled={isAILoading || !content.trim()}
            >
              <span>내용 보강하기</span>
              <small>800자 기준</small>
            </button>

            {isAILoading && (
              <div className="re-ai-loading-box">
                <div className="re-spinner" />
                <span>AI가 글을 다듬는 중입니다...</span>
              </div>
            )}

            {polishDraft && (
              <div className="re-polish-card re-polish-card-compact">
                <span className="re-polish-label">
                  {POLISH_MODE_LABELS[polishDraft.mode] || 'AI 다듬기 결과'}
                </span>
                <p className="re-polish-note">
                  AI 다듬기 결과가 준비됐어요. 긴 글은 큰 화면에서 확인한 뒤 적용할 수 있어요.
                </p>
                <div className="re-polish-mini-stats">
                  <span>공백 포함 {polishedCharCount.toLocaleString()}자</span>
                  <span>공백 제외 {polishedCharCountWithoutSpaces.toLocaleString()}자</span>
                </div>
                <button type="button" className="re-open-modal-btn" onClick={handleOpenPolishModal}>
                  크게 보기
                </button>
                <div className="re-polish-actions">
                  <button type="button" onClick={handleApplyPolishDraft}>
                    바로 적용
                  </button>
                  <button type="button" onClick={handleDismissPolishDraft}>
                    원문 유지
                  </button>
                </div>
              </div>
            )}

            <button
              className="re-ai-btn"
              onClick={() => {
                if (window.confirm('현재 내용을 지우고 처음부터 AI 생성기로 돌아가시겠습니까?')) {
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
              {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
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
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.target.style.background = '#fef2f2'; }}
              onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
            >
              DELETE (삭제)
            </button>
          </div>
        </aside>
      </main>

      {polishDraft && isPolishModalOpen && (
        <div
          className="re-polish-modal-backdrop"
          role="presentation"
          onClick={() => setIsPolishModalOpen(false)}
        >
          <section
            className="re-polish-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="polish-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="re-polish-modal-head">
              <div>
                <span>AI PREVIEW</span>
                <h2 id="polish-modal-title">
                  {POLISH_MODE_LABELS[polishDraft.mode] || 'AI 다듬기 결과'}
                </h2>
              </div>

              <button
                type="button"
                className="re-modal-close-btn"
                onClick={() => setIsPolishModalOpen(false)}
                aria-label="AI 다듬기 미리보기 닫기"
              >
                ×
              </button>
            </div>

            <p className="re-polish-modal-note">{polishDraft.note}</p>

            <div className="re-polish-modal-stats">
              <div>
                <span>공백 포함</span>
                <strong>{polishedCharCount.toLocaleString()}자</strong>
              </div>
              <div>
                <span>공백 제외</span>
                <strong>{polishedCharCountWithoutSpaces.toLocaleString()}자</strong>
              </div>
            </div>

            <div className="re-polish-modal-preview">
              {polishDraft.polishedText}
            </div>

            <div className="re-polish-modal-actions">
              <button type="button" onClick={handleApplyPolishDraft}>
                이 글로 적용하기
              </button>
              <button type="button" onClick={() => setIsPolishModalOpen(false)}>
                계속 비교하기
              </button>
              <button type="button" onClick={handleDismissPolishDraft}>
                원문 유지하고 닫기
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
