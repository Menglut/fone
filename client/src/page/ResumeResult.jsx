import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Resume.css";
import { useResumeFlow } from "../context/ResumeFlowContext";

const API_BASE = "http://localhost:5000";

export default function ResumeResult() {
  const nav = useNavigate();
  const { preview, setPreview, resetAll } = useResumeFlow();

  useEffect(() => {
    if (!preview || !preview.trim()) {
      nav("/resume/input", { replace: true });
    }
  }, [preview, nav]);

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      alert("미리보기를 클립보드에 복사했어요.");
    } catch {
      alert("복사에 실패했어요. 브라우저 권한을 확인해주세요.");
    }
  };

  const downloadPdf = async () => {
    if (!preview.trim()) return;
    const res = await fetch(`${API_BASE}/api/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "자기소개서", content: preview }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "coverletter.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearResultOnly = () => {
    if (!window.confirm("결과를 지우고 다시 생성할까요?")) return;
    setPreview("");
    nav("/resume/interview");
  };

  const startOver = () => {
    if (!window.confirm("전체를 초기화하고 처음부터 시작할까요?")) return;
    resetAll();
    nav("/resume/input");
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
            <button className="rwBtn ghost" onClick={() => nav("/resume/interview")}>
              답변 수정
            </button>
            <button className="rwBtn ghost" onClick={startOver}>
              새로 작성
            </button>
          </div>
        </div>
      </header>

      <main className="rwWrap">
        <section className="rwIntro">
          <div className="rwIntroLeft">
            <div className="rwChip">Step 3 / 3</div>
            <h1 className="rwTitle">
              자소서가 완성됐어요.
              <br />
              <span className="rwAccent">복사/PDF</span>로 저장할 수 있어요.
            </h1>
            <p className="rwDesc">
              마음에 안 드는 부분은 “답변 수정”으로 돌아가서 다시 생성해보세요.
            </p>
          </div>

          <div className="rwIntroRight">
            <div className="rwTipCard">
              <div className="rwTipTitle">추천 사용법</div>
              <ul className="rwTipList">
                <li>문장 톤/길이만 가볍게 다듬어도 완성도가 올라가요</li>
                <li>성과 수치가 있으면 설득력이 더 좋아져요</li>
                <li>PDF 저장 후 제출용으로 활용할 수 있어요</li>
              </ul>
              <div className="rwTipNote">* 필요하면 인터뷰 답변을 더 채우고 재생성해보세요.</div>
            </div>
          </div>
        </section>

        <section className="rwGrid">
          <div className="rwCol">
            <div className="rwCard preview">
              <div className="rwCardHead">
                <div>
                  <div className="rwCardTitle">미리보기</div>
                  <div className="rwCardSub">생성된 자소서를 바로 복사/저장할 수 있어요.</div>
                </div>

                <div className="rwActions">
                  <button className="rwBtn ghost sm" onClick={copyPreview} disabled={!preview.trim()}>
                    복사
                  </button>
                  <button className="rwBtn ghost sm" onClick={downloadPdf} disabled={!preview.trim()}>
                    PDF
                  </button>
                </div>
              </div>

              <div className="rwPreviewBox previewArea" aria-label="미리보기">
                {preview.trim() ? (
                  preview
                ) : (
                  <span className="rwPreviewPlaceholder">
                    아직 생성된 내용이 없어요. 다시 생성해보세요.
                  </span>
                )}
              </div>

              <div className="rwBottom">
                <button className="rwBtn ghost full" onClick={clearResultOnly} disabled={!preview.trim()}>
                  결과 지우고 다시 생성
                </button>
                <div className="rwBottomHint">원하면 Step 2로 돌아가 답변을 수정할 수 있어요.</div>
              </div>
            </div>
          </div>

          <div className="rwCol">
            <div className="rwCard">
              <div className="rwCardHead">
                <div>
                  <div className="rwCardTitle">다음 액션</div>
                  <div className="rwCardSub">원하는 방식으로 마무리하세요.</div>
                </div>
              </div>

              <div className="rwPreviewBox previewArea">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button className="rwBtn primary" onClick={() => nav("/resume/interview")}>
                    답변 수정해서 재생성
                  </button>
                  <button className="rwBtn ghost" onClick={startOver}>
                    처음부터 다시 작성
                  </button>
                  <span className="rwPreviewPlaceholder">
                    “답변 수정”은 결과 품질을 빠르게 올리는 가장 좋은 방법이에요.
                  </span>
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
