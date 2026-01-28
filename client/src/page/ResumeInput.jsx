import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Resume.css";
import { useResumeFlow } from "../context/ResumeFlowContext";

const API_BASE = "http://localhost:5000";

export default function ResumeInput() {
  const nav = useNavigate();
  const {
    resume,
    setResume,
    jobPost,
    setJobPost,
    setFollowupQs,
    setFollowupAns,
    setPreview,
    setQIndex,
    setSkipped,
    resetAll,
  } = useResumeFlow();

  const [qLoading, setQLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false); // 스크롤 상태 감지

  // 스크롤 이벤트 핸들러
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 버튼 활성화 조건
  const canNext = useMemo(() => {
    return resume.trim().length > 10 && jobPost.trim().length > 10 && !qLoading;
  }, [resume, jobPost, qLoading]);

  // 질문 생성 함수
  const makeFollowupQuestions = async () => {
    setQLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/interview/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceText: resume,
          companyQuestion: jobPost,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`분석 실패 (${res.status}) : ${t}`);
      }

      const data = await res.json();
      setFollowupQs(data.questions || []);
      setFollowupAns({});
      setPreview("");
      setQIndex(0);
      setSkipped(new Set());

      nav("/resume/interview");
    } catch (e) {
      console.error(e);
      alert("시스템 오류: 질문 생성에 실패했습니다.\n" + e.message);
    } finally {
      setQLoading(false);
    }
  };

  const clearAll = () => {
    if (!window.confirm("입력한 데이터를 모두 초기화하시겠습니까?")) return;
    resetAll();
  };

  return (
    <div className="rwPage">
      {/* 로딩 화면 (Clean Style) */}
      {qLoading && (
          <div className="rwLoading" role="status" aria-live="polite" aria-busy="true">
            <div className="rwLoadingCard">
              <div className="rwLoadingTrack">
                <div className="rwCar" aria-hidden="true">
                  <div className="carWing front" />
                  <div className="carBody" />
                  <div className="carCockpit" />
                  <div className="carWing rear" />
                  <span className="rwWheel w1" />
                  <span className="rwWheel w2" />
                </div>
              </div>

              {/* [변경] ...을 지우고 rwDots 클래스 적용 */}
              <div className="rwLoadingText">
                ANALYZING DATA<span className="rwDots"></span>
                <span className="rwLoadingSub">AI가 경험 데이터를 분석하여 전략을 수립 중입니다.</span>
              </div>

            </div>
          </div>
        )}

      {/* 헤더 (Dark Theme) */}
      <header className={`rwTop ${isScrolled ? "scrolled" : ""}`}>
        <div className="rwTopInner">
          <div className="rwBrand" onClick={() => (window.location.href = "/")}>
            <div className="rwLogo">F1</div>
          </div>
        </div>
      </header>

      <main className="rwWrap">
        {/* Intro Section (Centered) */}
        <section className="rwIntro">
          <div className="rwChip">PHASE 01 : DATA INPUT</div>
          <h1 className="rwTitle">
            합격을 위한 <span className="rwAccent">데이터 세팅</span>
          </h1>
          <p className="rwDesc">
            여러분의 경험과 채용 공고를 입력해주세요.<br/>
            F1nd Your Way의 AI가 합격 확률을 높이는 맞춤형 인터뷰를 설계합니다.
          </p>
        </section>

        {/* Input Forms Area */}
        <section className="rwInputArea">

          {/* [변경점] 좌우 배치를 위한 Row 컨테이너 시작 */}
          <div className="rwInputRow">

            {/* 1. 경험 입력 */}
            <div className="rwCard">
              <div className="rwCardHead">
                <div>
                  <div className="rwCardTitle">
                    <span>1. EXPERIENCE LOG</span>
                  </div>
                  <div className="rwCardSub">활동 내용을 자유롭게 적어주세요.</div>
                </div>
                <div className="rwCount">{resume.trim().length} 자</div>
              </div>

              <textarea
                className="rwTextarea"
                placeholder={`[작성 팁]
- 역할(Role): 어떤 포지션을 맡았나요?
- 행동(Action): 어떤 기술/방법을 사용했나요?
- 성과(Impact): 구체적인 결과/수치는?`}
                value={resume}
                onChange={(e) => setResume(e.target.value)}
              />
            </div>

            {/* 2. 공고 입력 */}
            <div className="rwCard">
              <div className="rwCardHead">
                <div>
                  <div className="rwCardTitle">
                    <span>2. TARGET SPECS</span>
                  </div>
                  <div className="rwCardSub">채용 공고 내용을 복사해 주세요.</div>
                </div>
                <div className="rwCount">{jobPost.trim().length} 자</div>
              </div>

              <textarea
                className="rwTextarea"
                placeholder="담당 업무, 자격 요건, 우대 사항, 기술 스택 등을 입력하세요."
                value={jobPost}
                onChange={(e) => setJobPost(e.target.value)}
              />
            </div>

          </div>
          {/* Row 컨테이너 끝 */}

          {/* Action Button */}
          <div className="rwActionArea">
            <button className="rwBtn primary full" onClick={makeFollowupQuestions} disabled={!canNext}>
              {qLoading ? "ANALYZING..." : "NEXT : AI 전략 분석 시작"}
            </button>
            <div className="rwBottomHint">
              {canNext
                ? "준비가 완료되었습니다. 분석을 시작하세요."
                : "경험과 공고 내용을 각각 10자 이상 입력해야 다음 단계로 진행할 수 있습니다."}
            </div>
          </div>

        </section>

        {/* Footer */}
        <footer className="rwFooter">
          <div className="rwFooterInner">
            <div className="rwFootLeft">
              <span style={{fontFamily: 'Rajdhani', fontWeight: 700}}>F1ND THE WAY</span>
              <span style={{margin: '0 10px'}}>|</span>
              <span>ENGINEERED FOR SUCCESS</span>
            </div>
            <div className="rwFootRight">
              © {new Date().getFullYear()} KIM'S PADDOCK
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}