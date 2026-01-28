import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Resume.css";
import { useResumeFlow } from "../context/ResumeFlowContext";

const API_BASE = "http://localhost:5000";

export default function ResumeInterview() {
  const nav = useNavigate();
  const {
    resume,
    jobPost,
    followupQs,
    followupAns,
    setFollowupAns,
    qIndex,
    setQIndex,
    skipped,
    setSkipped,
    setPreview,
  } = useResumeFlow();

  const [loading, setLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const total = followupQs.length;
  const current = total > 0 ? followupQs[qIndex] : null;

  // 마지막 질문인지 확인하는 플래그
  const isLastQuestion = qIndex === total - 1;

  // 스크롤 이벤트 핸들러
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const canGenerate = useMemo(() => {
    return resume.trim().length > 10 && jobPost.trim().length > 10 && !loading && total > 0;
  }, [resume, jobPost, loading, total]);

  useEffect(() => {
    if (!followupQs || followupQs.length === 0) {
      nav("/resume/input", { replace: true });
    }
  }, [followupQs, nav]);

  const onPrev = () => setQIndex((i) => Math.max(0, i - 1));

  const onNext = () => setQIndex((i) => Math.min(total - 1, i + 1));

  // Skip 버튼 핸들러
  const onSkip = () => {
    if (!current) return;

    setSkipped((prev) => {
      const next = new Set(prev);
      next.add(current.id);
      return next;
    });

    if (isLastQuestion) {
      generate();
    } else {
      setQIndex((i) => Math.min(total - 1, i + 1));
    }
  };

  const generate = async () => {
    setLoading(true);
    try {
      const interviewAnswers = followupQs.map((q) => ({
        id: q.id,
        category: q.category,
        answer: followupAns[q.id] || "",
      }));

      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: { experience: resume, interviewAnswers },
          jobPost,
          options: { tone: "담백", length: "1500자", type: "자유형" },
        }),
      });

      if (!res.ok) {
        throw new Error(`서버 오류 (${res.status})`);
      }

      const data = await res.json();
      setPreview(data.text || "");
      nav("/resume/result");
    } catch (e) {
      console.error(e);
      alert("자소서 생성 중 오류가 발생했습니다.\n" + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rwPage">
      {/* --- [추가됨] 로딩 화면 (Loading Overlay) --- */}
      {loading && (
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
            <div className="rwLoadingText">
              BUILDING MACHINE<span className="rwDots"></span>
              <span className="rwLoadingSub">
                답변 데이터를 기반으로 최적의 자소서를 생성 중입니다.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className={`rwTop ${isScrolled ? "scrolled" : ""}`}>
        <div className="rwTopInner">
          <div className="rwBrand" onClick={() => nav("/")}>
            <div className="rwLogo">F1</div>
          </div>

          <div className="rwTopRight">
            <button className="rwBtn ghost" onClick={() => nav("/resume/input")} disabled={loading}>
              BACK
            </button>
          </div>
        </div>
      </header>

      <main className="rwWrap">
        {/* Intro Section */}
        <section className="rwIntro">
          <div className="rwChip">PHASE 02 : TELEMETRY CHECK</div>
          <h1 className="rwTitle">
            심층 질문 : <span className="rwAccent">TUNING SESSION</span>
          </h1>
          <p className="rwDesc">
            AI가 설계한 심층 질문에 답변하여 데이터를 보강하세요.<br />
            이 과정은 합격 확률을 결정하는 가장 중요한 랩(Lap)입니다.
          </p>
        </section>

        {/* 질문 카드 섹션 */}
        <section style={{ width: '100%', margin: '0 auto' }}>

            <div className="rwCard">
              <div className="rwCardHead">
                <div>
                  <div className="rwCardTitle">
                    <span>CURRENT LAP : QUESTION {qIndex + 1}</span>
                  </div>
                  <div className="rwCardSub">
                    CATEGORY: <span style={{ color: 'var(--rw-primary)', fontWeight: 'bold' }}>{current?.category || 'GENERAL'}</span>
                  </div>
                </div>
                <div className="rwCount">
                  {qIndex + 1} / {total}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="rwProgressTrack">
                <div
                  className="rwProgressBar"
                  style={{ width: `${((qIndex + 1) / total) * 100}%` }}
                />
              </div>

              {current ? (
                <>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24, lineHeight: 1.5, color: '#111' }}>
                    "{current.text}"
                  </div>

                  <textarea
                    className="rwTextarea"
                    rows={12}
                    placeholder="[답변 가이드]
- 구체적인 상황과 나의 행동 위주로 서술하세요.
- 생각이 나지 않으면 'SKIP' 버튼을 눌러 건너뛰세요."
                    value={followupAns[current.id] || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFollowupAns((prev) => ({ ...prev, [current.id]: v }));
                      setSkipped((prev) => {
                        const next = new Set(prev);
                        if (v.trim().length > 0) next.delete(current.id);
                        return next;
                      });
                    }}
                  />

                  {skipped.has(current.id) && (
                    <div style={{ fontSize: '0.9rem', color: "#e10600", marginTop: 12, fontWeight: 500 }}>
                      ⚠ LAP SKIPPED (이 질문은 반영되지 않습니다)
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div style={{ display: "flex", gap: 12, marginTop: 30 }}>

                    {/* 이전 버튼 */}
                    <button className="rwBtn ghost" onClick={onPrev} disabled={qIndex === 0 || loading}>
                      PREV
                    </button>

                    {/* 스킵 버튼 */}
                      <button className="rwBtn skip" onClick={onSkip} disabled={loading}>
                        {isLastQuestion ? "SKIP & FINISH" : "SKIP LAP"}
                      </button>

                    {/* 다음/완료 버튼 */}
                    {isLastQuestion ? (
                      <button
                        className="rwBtn primary"
                        onClick={generate}
                        disabled={loading || !canGenerate}
                        style={{ flex: 1, backgroundColor: 'var(--rw-primary)' }}
                      >
                        {loading ? "BUILDING MACHINE..." : "FINISH : BUILD RESUME"}
                      </button>
                    ) : (
                      <button
                        className="rwBtn primary"
                        onClick={onNext}
                        disabled={loading}
                        style={{ flex: 1 }}
                      >
                        NEXT LAP
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="rwPreviewPlaceholder">LOADING TELEMETRY DATA...</div>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px', color: '#888', fontSize: '0.9rem' }}>
               {isLastQuestion
                 ? "마지막 질문입니다. 답변을 완료하고 자소서를 생성하세요."
                 : "답변이 구체적일수록 더 정교한 자소서가 완성됩니다."}
            </div>

        </section>

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