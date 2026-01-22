import { useMemo, useState } from "react";
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

  const canNext = useMemo(() => {
    return resume.trim().length > 10 && jobPost.trim().length > 10 && !qLoading;
  }, [resume, jobPost, qLoading]);

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
        throw new Error(`추가 질문 생성 실패 (${res.status}) : ${t}`);
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
      alert("추가 질문 생성 중 오류가 발생했습니다.\n" + e.message);
    } finally {
      setQLoading(false);
    }
  };

  const clearAll = () => {
    if (!window.confirm("입력 내용을 모두 초기화할까요?")) return;
    resetAll();
  };

  return (
    <div className="rwPage">
      {/* 로딩(질문 생성) */}
      {qLoading && (
        <div className="rwLoading" role="status" aria-live="polite" aria-busy="true">
          <div className="rwLoadingCard">
            <div className="rwLoadingTrack">
              <div className="rwCar" aria-hidden="true">
                <div className="carWing front" />
                <div className="carBody">
                  <span className="carLogo">F1</span>
                </div>
                <div className="carCockpit" />
                <div className="carWing rear" />
                <span className="rwWheel w1" />
                <span className="rwWheel w2" />
              </div>
              <div className="rwRoad" aria-hidden="true" />
            </div>
            <div className="rwLoadingText">
              질문을 생성 중입니다…
              <span className="rwLoadingSub">잠시만 기다려주세요</span>
            </div>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="rwTop">
        <div className="rwTopInner">
          <div className="rwBrand" onClick={() => (window.location.href = "/")}>
            <div className="rwLogo">F1</div>
          </div>

          <div className="rwTopRight">
            <button className="rwBtn ghost" onClick={clearAll} disabled={qLoading}>
              초기화
            </button>
            <button className="rwBtn primary" onClick={makeFollowupQuestions} disabled={!canNext}>
              {qLoading ? "질문 생성 중..." : "AI 질문 받기"}
            </button>
          </div>
        </div>
      </header>

      <main className="rwWrap">
        {/* 안내 카드 */}
        <section className="rwIntro">
          <div className="rwIntroLeft">
            <div className="rwChip">Step 1 / 3</div>
            <h1 className="rwTitle">
              먼저 경험과 공고를 입력하면,
              <br />
              AI가 <span className="rwAccent">추가 질문</span>을 만들어줘요.
            </h1>
            <p className="rwDesc">
              인터뷰 답변을 반영하면 자소서가 더 구체적이고 설득력 있게 완성돼요.
            </p>

            <div className="rwMiniRow">
              <div className="rwMini">
                <div className="rwMiniKey">Step 1</div>
                <div className="rwMiniVal">경험/공고 입력</div>
              </div>
              <div className="rwMini">
                <div className="rwMiniKey">Step 2</div>
                <div className="rwMiniVal">AI 인터뷰</div>
              </div>
              <div className="rwMini">
                <div className="rwMiniKey">Step 3</div>
                <div className="rwMiniVal">자소서 결과</div>
              </div>
            </div>
          </div>

          <div className="rwIntroRight">
            <div className="rwTipCard">
              <div className="rwTipTitle">입력 팁</div>
              <ul className="rwTipList">
                <li>경험은 “역할 → 행동 → 성과(수치)” 순서로 적기</li>
                <li>공고는 “업무/자격요건/우대사항”을 통째로 붙여넣기</li>
                <li>10자 이상 입력해야 다음 단계로 넘어갈 수 있어요</li>
              </ul>
              <div className="rwTipNote">* 다음 단계에서 질문을 1개씩 보여줘요(스킵 가능).</div>
            </div>
          </div>
        </section>

        {/* 입력 */}
        <section className="rwGrid">
          <div className="rwCol">
            <div className="rwCard">
              <div className="rwCardHead">
                <div>
                  <div className="rwCardTitle">경험/이력</div>
                  <div className="rwCardSub">프로젝트·활동을 자유롭게 적어주세요.</div>
                </div>
                <div className="rwCount">{resume.trim().length}자</div>
              </div>

              <textarea
                className="rwTextarea"
                placeholder={`예) 백엔드 API 개발 / 성능 개선 / 협업 경험 등
- 무엇을 했는지(역할)
- 어떻게 했는지(행동)
- 결과가 어땠는지(성과, 수치)`}
                rows={12}
                value={resume}
                onChange={(e) => setResume(e.target.value)}
              />
            </div>

            <div className="rwCard">
              <div className="rwCardHead">
                <div>
                  <div className="rwCardTitle">채용 공고</div>
                  <div className="rwCardSub">업무/요구역량/우대사항을 붙여넣기.</div>
                </div>
                <div className="rwCount">{jobPost.trim().length}자</div>
              </div>

              <textarea
                className="rwTextarea"
                placeholder="예) 담당 업무 / 자격 요건 / 우대 사항 / 기술 스택..."
                rows={12}
                value={jobPost}
                onChange={(e) => setJobPost(e.target.value)}
              />
            </div>

            <div className="rwBottom">
              <button className="rwBtn primary full" onClick={makeFollowupQuestions} disabled={!canNext}>
                {qLoading ? "질문 생성 중..." : "다음: AI 질문 받기"}
              </button>
              <div className="rwBottomHint">
                {canNext ? "준비 완료" : "경험/공고를 10자 이상 입력하면 다음으로 넘어갈 수 있어요."}
              </div>
            </div>
          </div>

          <div className="rwCol">
            <div className="rwCard preview">
              <div className="rwCardHead">
                <div>
                  <div className="rwCardTitle">안내</div>
                  <div className="rwCardSub">이 단계에서는 결과 대신 입력에만 집중해요.</div>
                </div>
              </div>
              <div className="rwPreviewBox previewArea">
                <span className="rwPreviewPlaceholder">
                  Step 2에서 AI가 질문을 만들고, 질문에 답변하면 Step 3에서 자소서가 생성됩니다.
                </span>
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
            <div className="rwFootRight">
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                맨 위로
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
