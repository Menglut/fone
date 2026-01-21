import React, { useEffect, useMemo, useRef, useState } from "react";
import "../css/HomePage.css";

export default function HomePage() {
    const go = (path) => (window.location.href = path);

    // ✅ 앱바 탭 목록
    const tabs = useMemo(
        () => [
            { key: "fit", label: "자기소개서", href: "/resume" },
            { key: "resume", label: "포트폴리오", href: "/portfolio" },
            { key: "interview", label: "면접연습", href: "#interview" },
            { key: "community", label: "커뮤니티", href: "#community" },
        ],
        []
    );

    // ✅ active/hover 상태
    const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });

    const tabBarRef = useRef(null);
    const tabRefs = useRef({}); // key -> element

    const moveIndicatorTo = (key) => {
        const el = tabRefs.current[key];
        const bar = tabBarRef.current;
        if (!el || !bar) return;

        // ✅ getBoundingClientRect 대신 offsetLeft/offsetWidth 사용
        // tabBar 기준 좌표라서 치우침 문제 거의 100% 해결됨
        setIndicator({
            left: el.offsetLeft,
            width: el.offsetWidth,
            visible: true,
        });
    };

    useEffect(() => {
        const handle = () => setIndicator((p) => ({ ...p, visible: false }));
        window.addEventListener("resize", handle);
        return () => window.removeEventListener("resize", handle);
    }, []);

    return (
        <div className="page" id="top">
            <header className="nav">
                <div className="navInner">
                    <div className="brand" onClick={() => go("/")}>
                        <div className="logo">F1</div>

                    </div>

                    {/* ✅ 탭형 앱바 */}
                    <div className="navCenter">
                        <div
                            className="tabBar"
                            ref={tabBarRef}
                            onMouseLeave={() => setIndicator((p) => ({ ...p, visible: false }))}
                            role="tablist"
                            aria-label="상단 탭 메뉴"
                        >
              <span
                  className={`tabIndicator ${indicator.visible ? "on" : ""}`}
                  style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
                  aria-hidden="true"
              />

                            {tabs.map((t) => (
                                <a
                                    key={t.key}
                                    href={t.href}
                                    ref={(node) => (tabRefs.current[t.key] = node)}
                                    className="tab"
                                    role="tab"
                                    aria-selected={false}
                                    onMouseEnter={() => moveIndicatorTo(t.key)}
                                    onClick={() => {
                                        requestAnimationFrame(() => moveIndicatorTo(t.key));
                                    }}
                                >
                                    {t.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="navRight">
                        <button className="btn ghost" onClick={() => go("/login")}>
                            로그인
                        </button>
                        <button className="btn primary" onClick={() => go("/start")}>
                            무료로 시작
                        </button>
                    </div>
                </div>
            </header>

            <main className="wrap">
                {/* HERO */}
                <section className="hero">
                    <div className="heroText">
                        <div className="chip">AI로 1분 시작</div>
                        <h1 className="title">
                            자소서와 포트폴리오,
                            <br />
                            <span className="accent">한 번에</span> 깔끔하게
                        </h1>
                        <p className="desc">
                            경험만 입력하면 공고에 맞춘 자소서 초안과
                            <br />
                            같은 소재로 포트폴리오까지 자동 생성해요.
                        </p>

                        <div className="ctaRow">
                            <button className="btn primary big" onClick={() => go("/start")}>
                                무료로 시작
                            </button>
                            <button className="btn ghost big" onClick={() => go("/templates")}>
                                템플릿 보기
                            </button>
                        </div>

                        <div className="miniRow">
                            <div className="mini">
                                <div className="miniKey">짧게</div>
                                <div className="miniVal">필수만 입력</div>
                            </div>
                            <div className="mini">
                                <div className="miniKey">빠르게</div>
                                <div className="miniVal">초안/페이지 자동</div>
                            </div>
                            <div className="mini">
                                <div className="miniKey">일관되게</div>
                                <div className="miniVal">같은 소재 재사용</div>
                            </div>
                        </div>
                    </div>

                    {/* TWO ACTION CARDS */}
                    <div className="heroCards">
                        <button className="card" onClick={() => go("/resume")}>
                            <div className="cardTop">
                                <div className="cardTitle">자소서 생성</div>
                                <div className="pill">RESUME</div>
                            </div>
                            <div className="cardDesc">공고 선택 → 경험 매칭 → 초안 생성</div>
                            <div className="cardCta">시작하기 →</div>
                        </button>

                        <button className="card" onClick={() => go("/portfolio")}>
                            <div className="cardTop">
                                <div className="cardTitle">포트폴리오 생성</div>
                                <div className="pill">PORTFOLIO</div>
                            </div>
                            <div className="cardDesc">프로젝트 입력 → 템플릿 선택 → 출력</div>
                            <div className="cardCta">시작하기 →</div>
                        </button>

                        <div className="hint">
                            입력한 “경험”이 자소서/포트폴리오에 동시에 반영돼요.
                        </div>
                    </div>
                </section>

                {/* FLOW */}
                <section className="flow" id="flow">
                    <div className="flowHead">
                        <h2 className="h2">사용 흐름</h2>
                        <p className="p">복잡한 기능 대신, 딱 필요한 흐름만 보여줄게요.</p>
                    </div>

                    <div className="steps">
                        <div className="step">
                            <div className="num">1</div>
                            <div>
                                <div className="stepTitle">경험 입력</div>
                                <div className="stepDesc">프로젝트/인턴/활동을 짧게 정리</div>
                            </div>
                        </div>
                        <div className="step">
                            <div className="num">2</div>
                            <div>
                                <div className="stepTitle">목표 선택</div>
                                <div className="stepDesc">자소서 또는 포트폴리오 선택</div>
                            </div>
                        </div>
                        <div className="step">
                            <div className="num">3</div>
                            <div>
                                <div className="stepTitle">생성 & 수정</div>
                                <div className="stepDesc">초안/페이지 생성 후 톤만 다듬기</div>
                            </div>
                        </div>
                    </div>

                    <div className="flowCtas">
                        <button className="btn primary" onClick={() => go("/resume")}>자소서로 시작</button>
                        <button className="btn ghost" onClick={() => go("/portfolio")}>포트폴리오로 시작</button>
                    </div>
                </section>

                <footer className="footer">
                    <div className="footerInner">
                        <div className="footLeft">
                            <div className="logo sm">F1</div>
                            <div>
                                <div className="brandName">F1nd The Way</div>
                                <div className="footSub">© {new Date().getFullYear()}</div>
                            </div>
                        </div>
                        <div className="footRight">
                            <a className="navLink" href="#flow">사용 흐름</a>
                            <a className="navLink" href="#top" onClick={(e)=>{e.preventDefault(); window.scrollTo({top:0, behavior:"smooth"});}}>
                                맨 위로
                            </a>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
