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

  const total = followupQs.length;
  const current = total > 0 ? followupQs[qIndex] : null;

  const canGenerate = useMemo(() => {
    return resume.trim().length > 10 && jobPost.trim().length > 10 && !loading && total > 0;
  }, [resume, jobPost, loading, total]);

  useEffect(() => {
    // 질문 없이 접근하면 입력 페이지로
    if (!followupQs || followupQs.length === 0) {
      nav("/resume/input", { replace: true });
    }
  }, [followupQs, nav]);

  const onPrev = () => setQIndex((i) => Math.max(0, i - 1));

  const onNext = () => setQIndex((i) => Math.min(total - 1, i + 1));

  const onSkip = () => {
    if (!current) return;

    setSkipped((prev) => {
      const next = new Set(prev);
      next.add(current.id);
      return next;
    });

    setQIndex((i) => Math.min(total - 1, i + 1));
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
        let message = `서버 오류 (${res.status})`;
        try {
          const errData = await res.json();
          if (errData?.error) message += `: ${errData.error}`;
        } catch {
          const text = await res.text();
          message += `: ${text}`;
        }
        throw new Error(message);
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
      {/* 헤더 */}
      <header className="rwTop">
        <div className="rwTopInner">
          <div className="rwBrand" onClick={() => nav("/resume/input")}>
            <div className="rwLogo">F1</div>
          </div>

          <div className="rwTopRight">
            <button className="rwBtn ghost" onClick={() => nav("/resume/input")} disabled={loading}>
              입력으로
            </button>
            <button className="rwBtn primary" onClick={generate} disabled={!canGenerate}>
              {loading ? "생성 중..." : "답변 반영해서 생성"}
            </button>
          </div>
        </div>
      </header>

      <main className="rwWrap">
        <section className="rwIntro">
          <div className="rwIntroLeft">
            <div className="rwChip">Step 2 / 3</div>
            <h1 className="rwTitle">
              AI 인터뷰로 경험을
              <br />
              <span className="rwAccent">구체화</span>해볼까요?
            </h1>
            <p className="rwDesc">질문은 1개씩 보여줘요. 건너뛰기도 가능해요.</p>

            <div className="rwMiniRow">
              <div className="rwMini">
                <div className="rwMiniKey">진행</div>
                <div className="rwMiniVal">
                  {Math.min(qIndex + 1, total)} / {total}
                </div>
              </div>
              <div className="rwMini">
                <div className="rwMiniKey">스킵</div>
                <div className="rwMiniVal">{skipped.size}개</div>
              </div>
              <div className="rwMini">
                <div className="rwMiniKey">팁</div>
                <div className="rwMiniVal">수치/역할</div>
              </div>
            </div>
          </div>

          <div className="rwIntroRight">
            <div className="rwTipCard">
              <div className="rwTipTitle">답변 팁</div>
              <ul className="rwTipList">
                <li>가능하면 전/후 비교 수치를 적어주세요</li>
                <li>“우리 팀”이 아니라 “내가 한 일”을 분리해 주세요</li>
                <li>정답은 없어요. 떠오르는 만큼만 적어도 좋아요</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rwGrid">
          <div className="rwCol">
            <div className="rwCard">
              <div className="rwCardHead">
                <div>
                  <div className="rwCardTitle">질문</div>
                  <div className="rwCardSub">한 번에 하나씩 답변해요.</div>
                </div>
                <div className="rwCount">
                  {Math.min(qIndex + 1, total)} / {total}
                </div>
              </div>

              {current ? (
                <>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>
                    [{current.category}] {current.text}
                  </div>

                  <textarea
                    className="rwTextarea"
                    rows={8}
                    placeholder="답변을 입력하세요 (건너뛰기 가능)"
                    value={followupAns[current.id] || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFollowupAns((prev) => ({ ...prev, [current.id]: v }));

                      // 답변 작성하면 스킵 해제
                      setSkipped((prev) => {
                        const next = new Set(prev);
                        if (v.trim().length > 0) next.delete(current.id);
                        return next;
                      });
                    }}
                  />

                  {skipped.has(current.id) && (
                    <div style={{ fontSize: 12, color: "rgba(239,68,68,.9)", marginTop: 8 }}>
                      이 질문은 건너뛰었어요.
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="rwBtn ghost" onClick={onPrev} disabled={qIndex === 0 || loading}>
                      이전
                    </button>
                    <button className="rwBtn ghost" onClick={onSkip} disabled={loading}>
                      건너뛰기
                    </button>
                    <button
                      className="rwBtn primary"
                      onClick={onNext}
                      disabled={qIndex >= total - 1 || loading}
                    >
                      다음
                    </button>

                    {qIndex === total - 1 && (
                      <button className="rwBtn primary" onClick={generate} disabled={!canGenerate}>
                        {loading ? "생성 중..." : "자소서 만들기"}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="rwPreviewPlaceholder">질문을 불러오는 중...</div>
              )}
            </div>
          </div>

          <div className="rwCol">
            <div className="rwCard preview">
              <div className="rwCardHead">
                <div>
                  <div className="rwCardTitle">요약</div>
                  <div className="rwCardSub">입력한 답변은 자동 반영돼요.</div>
                </div>
              </div>

              <div className="rwPreviewBox previewArea">
                <span className="rwPreviewPlaceholder">
                  마지막 질문에서 “자소서 만들기”를 누르면 Step 3로 이동해요.
                </span>
              </div>

              <div className="rwBottom">
                <button className="rwBtn primary full" onClick={generate} disabled={!canGenerate}>
                  {loading ? "생성 중..." : "답변 반영해서 생성"}
                </button>
                <div className="rwBottomHint">
                  {canGenerate ? "준비 완료" : "질문을 불러온 뒤 생성할 수 있어요."}
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="rwFooter">
          <div className="rwFooterInner">
            <div className="rwFootLeft">
              <div className="rwLogo sm">F1</div>
              <div>
                <div className="rwBrandName">F1nd The Way</div>
                <div className="rwFootSub">© {new Date().getFullYear()}</div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
