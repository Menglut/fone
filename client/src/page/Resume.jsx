import { useMemo, useState } from "react";
import "../css/Resume.css";

function Resume() {
  const [resume, setResume] = useState("");
  const [jobPost, setJobPost] = useState("");
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const canGenerate = useMemo(() => {
    return resume.trim().length > 10 && jobPost.trim().length > 10 && !loading;
  }, [resume, jobPost, loading]);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: { experience: resume },
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
    } catch (e) {
      console.error(e);
      alert("자소서 생성 중 오류가 발생했습니다.\n" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!preview.trim()) return;
    const res = await fetch("http://localhost:5000/api/pdf", {
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

  const clearAll = () => {
    if (!window.confirm("입력/미리보기를 모두 초기화할까요?")) return;
    setResume("");
    setJobPost("");
    setPreview("");
  };

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      alert("미리보기를 클립보드에 복사했어요.");
    } catch {
      alert("복사에 실패했어요. 브라우저 권한을 확인해주세요.");
    }
  };

  return (
      <div className="rwPage">
        {/* 로딩 */}
        {loading && (
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
                  자소서를 생성 중입니다…
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
              <button className="rwBtn ghost" onClick={clearAll} disabled={loading}>
                초기화
              </button>
              <button className="rwBtn primary" onClick={generate} disabled={!canGenerate}>
                {loading ? "생성 중..." : "자소서 생성"}
              </button>
            </div>
          </div>
        </header>

        <main className="rwWrap">
          {/* 안내 카드 */}
          <section className="rwIntro">
            <div className="rwIntroLeft">
              <div className="rwChip">AI로 빠르게 초안 생성</div>
              <h1 className="rwTitle">
                경험과 공고를 넣으면,
                <br />
                <span className="rwAccent">담백한 톤</span>으로 초안을 만들어줘요.
              </h1>
              <p className="rwDesc">
                아래 2가지만 입력하면 됩니다. 생성된 텍스트는 바로 수정하거나 PDF로 저장할 수 있어요.
              </p>

              <div className="rwMiniRow">
                <div className="rwMini">
                  <div className="rwMiniKey">경험</div>
                  <div className="rwMiniVal">프로젝트/인턴/활동</div>
                </div>
                <div className="rwMini">
                  <div className="rwMiniKey">공고</div>
                  <div className="rwMiniVal">요구역량/업무</div>
                </div>
                <div className="rwMini">
                  <div className="rwMiniKey">출력</div>
                  <div className="rwMiniVal">미리보기/PDF</div>
                </div>
              </div>
            </div>

            <div className="rwIntroRight">
              <div className="rwTipCard">
                <div className="rwTipTitle">입력 팁</div>
                <ul className="rwTipList">
                  <li>경험은 “역할 → 행동 → 성과(수치)” 순서로 적기</li>
                  <li>공고는 “업무/자격요건/우대사항”을 통째로 붙여넣기</li>
                  <li>생성 후 어색한 문장만 짧게 수정해도 충분</li>
                </ul>
                <div className="rwTipNote">
                  * 최소 10자 이상 입력해야 생성 버튼이 활성화돼요.
                </div>
              </div>
            </div>
          </section>

          {/* 입력/미리보기 */}
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
                    placeholder="예) 백엔드 API 개발 / 성능 개선 / 협업 경험 등
- 무엇을 했는지(역할)
- 어떻게 했는지(행동)
- 결과가 어땠는지(성과, 수치)"
                    rows={10}
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
                    rows={10}
                    value={jobPost}
                    onChange={(e) => setJobPost(e.target.value)}
                />
              </div>
            </div>

            <div className="rwCol">
              <div className="rwCard preview">
                <div className="rwCardHead">
                  <div>
                    <div className="rwCardTitle">미리보기</div>
                    <div className="rwCardSub">생성된 자소서를 바로 다듬을 수 있어요.</div>
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
                        아직 생성된 내용이 없어요. 하단의 ‘자소서 생성’을 눌러보세요.
                      </span>
                  )}
                </div>

                <div className="rwBottom">
                  <button className="rwBtn primary full" onClick={generate} disabled={!canGenerate}>
                    {loading ? "생성 중..." : "자소서 생성"}
                  </button>
                  <div className="rwBottomHint">
                    {canGenerate ? "준비 완료" : "경험/공고를 10자 이상 입력하면 생성할 수 있어요."}
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
                <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  맨 위로
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>
  );
}

export default Resume;
