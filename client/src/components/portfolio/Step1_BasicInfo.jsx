import React, { useState, useMemo } from 'react';
import axios from 'axios';

const API_BASE = "http://localhost:5000";

const Step1BasicInfo = ({ data, setData, nextStep }) => {
  const [aiProfilePrompt, setAiProfilePrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setData(prev => ({
      ...prev,
      profile: { ...prev.profile, [name]: value }
    }));
  };

  // ✨ 프로필 불러오기 함수 추가!
  const handleLoadProfile = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) return alert("로그인이 필요합니다.");
      const userId = user.id || user._id || user.email;

      const response = await axios.get(`${API_BASE}/api/profile/${userId}`);
      if (response.data.success && response.data.data) {
        const pData = response.data.data;
        // 빈 데이터가 아닐 경우에만 덮어쓰기
        if (pData.name || pData.email) {
          setData(prev => ({
            ...prev,
            profile: {
              name: pData.name || prev.profile.name,
              jobTitle: pData.jobTitle || prev.profile.jobTitle,
              email: pData.email || prev.profile.email,
              github: pData.github || prev.profile.github,
              intro: pData.intro || prev.profile.intro,
            }
          }));
          alert("✅ 프로필 정보를 성공적으로 불러왔습니다!");
        } else {
          alert("저장된 프로필 정보가 없습니다. 대시보드에서 먼저 프로필을 설정해주세요.");
        }
      }
    } catch (error) {
      alert("프로필 정보를 불러오는데 실패했습니다.");
    }
  };

  // ✨ 수정된 AI 자기소개 스트리밍 생성 함수
    const handleAiProfileGenerate = async () => {
      if (!aiProfilePrompt.trim()) return alert("간단한 자기소개나 이력을 입력해주세요!");
      setIsAiLoading(true);

      // 스트리밍 시작 전 자기소개 칸만 비워줍니다.
      setData(prev => ({
        ...prev,
        profile: { ...prev.profile, intro: "" }
      }));

      try {
        const response = await fetch(`${API_BASE}/api/generate/profile-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userPrompt: `너는 전문 커리어 컨설턴트야. 사용자의 경험을 바탕으로 포트폴리오에 들어갈 매력적인 자기소개 문장만 한국어로 작성해줘. ${aiProfilePrompt}`
          }),
        });

        if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          // { stream: true } 옵션으로 한국어 깨짐 방지
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.replace('data: ', '').trim();
                if (jsonStr === '[DONE]') break;

                const dataObj = JSON.parse(jsonStr);
                const content = dataObj.choices[0]?.delta?.content || "";

                accumulatedText += content;

                // 💡 다른 필드(이름, 직무 등)는 유지하고 오직 intro만 업데이트
                setData(prev => ({
                  ...prev,
                  profile: { ...prev.profile, intro: accumulatedText }
                }));
              } catch (e) {
                // 조각난 데이터 무시
              }
            }
          }
        }
        setAiProfilePrompt("");
      } catch (error) {
        console.error("AI Generation Error", error);
        alert("AI 생성 중 오류가 발생했습니다.");
      } finally {
        setIsAiLoading(false);
      }
    };

  const canGoNext = useMemo(() => {
    return (
      data.profile.name?.trim().length > 1 &&
      data.profile.jobTitle?.trim().length > 1
    );
  }, [data.profile.name, data.profile.jobTitle]);

  return (
    <section className="rwInputArea">
      {/* 💡 화면을 가리던 rwLoading 오버레이를 삭제했습니다. */}

      <div className="rwInputRow">
        <div className="rwCard rwCardAI">
          <div className="rwCardHead">
            <div className="rwCardTitle"><span>🤖 AI 자기소개 작성기</span></div>
          </div>
          <div className="rwCardSub" style={{ marginBottom: '15px' }}>
            본인의 강점을 적어주시면 AI가 실시간으로 세련된 자기소개를 작성합니다.
          </div>
          <textarea
            className="rwTextarea"
            value={aiProfilePrompt}
            onChange={(e) => setAiProfilePrompt(e.target.value)}
            disabled={isAiLoading}
            placeholder="예: 3년차 프론트엔드 개발자야. 사용자 경험을 개선하는 걸 좋아해."
            rows={6}
            style={{ resize: 'none' }}
          />
          <button
            className="rwBtn primary full"
            onClick={handleAiProfileGenerate}
            disabled={isAiLoading || !aiProfilePrompt.trim()}
            style={{ marginTop: '20px' }}
          >
            {/* 💡 버튼 텍스트를 통해 상태를 전달합니다. */}
            {isAiLoading ? "AI가 문장을 작성 중입니다..." : "✨ AI로 자기소개 자동 완성"}
          </button>
        </div>

        <div className="rwCard">
          <div className="rwCardHead">
            <div className="rwCardTitle"><span>📝 기본 정보 (BASIC INFO)</span></div>
            <button
              onClick={handleLoadProfile}
              className="rwBtn secondary short"
              style={{ fontSize: '13px', padding: '6px 12px', borderColor: '#1e40af', color: '#1e40af' }}
            >
              내 프로필 불러오기
            </button>
          </div>

          <div className="rwCardBodyGrid">
            <div className="input-group-rw">
              <label>이름 *</label>
              <input type="text" className="rwInputText" name="name" value={data.profile.name} onChange={handleProfileChange} />
            </div>
            <div className="input-group-rw">
              <label>직무 (Job Title) *</label>
              <input type="text" className="rwInputText" name="jobTitle" value={data.profile.jobTitle} onChange={handleProfileChange} />
            </div>
            <div className="input-group-rw">
              <label>이메일 (Email)</label>
              <input type="email" className="rwInputText" name="email" value={data.profile.email} onChange={handleProfileChange} />
            </div>
            <div className="input-group-rw">
              <label>링크 (GitHub / Blog)</label>
              <input type="text" className="rwInputText" name="github" value={data.profile.github} onChange={handleProfileChange} />
            </div>
            <div className="input-group-rw fullWidth">
              <label>자기 소개 (Intro)</label>
              <textarea
                className="rwTextarea short"
                name="intro"
                value={data.profile.intro}
                onChange={handleProfileChange}
                placeholder="AI 도움을 받거나 직접 본인을 소개해 보세요."
                style={{ resize: 'none' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rwActionArea" style={{ marginTop: '50px' }}>
        <button className="rwBtn primary fullLarge" onClick={nextStep} disabled={!canGoNext}>
          STEP 2 : 프로젝트 경험 작성하러 가기 ➡️
        </button>
      </div>
    </section>
  );
};

export default Step1BasicInfo;