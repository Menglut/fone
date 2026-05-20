import dotenv from 'dotenv';
import OpenAI from 'openai';
import { chromium } from 'playwright';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const URL_REGEX = /https?:\/\/[^\s<>'")]+/i;
const MAX_RENDERED_TEXT_LENGTH = 18000;
const MAX_AI_INPUT_LENGTH = 14000;

function normalizeText(text = '') {
  return String(text)
    .replace(/\u00a0/g, ' ')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractFirstUrl(input = '') {
  const match = String(input).match(URL_REGEX);
  return match ? match[0] : '';
}

function safeJsonParse(content = '') {
  const cleaned = String(content)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw error;
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[|,\r\nㆍ·•\-]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeParsedResult(parsed, sourceUrl = '', originalInput = '') {
  const summary = parsed?.jobSummary || {};

  const jobSummary = {
    companyName: summary.companyName || summary.company || '',
    positionTitle: summary.positionTitle || summary.jobTitle || summary.title || '',
    employmentType: summary.employmentType || summary.type || '',
    experienceLevel: summary.experienceLevel || summary.career || '',
    deadline: summary.deadline || '',
    summaryText: summary.summaryText || '',
    jobDetails: toArray(summary.jobDetails || summary.keyDuties || summary.duties),
    requiredQualifications: toArray(
      summary.requiredQualifications || summary.requiredRequirements || summary.requirements
    ),
    preferredQualifications: toArray(
      summary.preferredQualifications || summary.preferredRequirements || summary.preferred
    ),
    coverLetterQuestions: toArray(summary.coverLetterQuestions || summary.questions),
    sourceUrls: summary.sourceUrls || (sourceUrl ? [sourceUrl] : []),
  };

  const hasBasicJobInfo = Boolean(jobSummary.companyName || jobSummary.positionTitle || jobSummary.summaryText);
  const hasCoreDetails =
    jobSummary.jobDetails.length > 0 ||
    jobSummary.requiredQualifications.length > 0 ||
    jobSummary.preferredQualifications.length > 0;

  const isJobPost = Boolean(parsed?.isJobPost || hasBasicJobInfo || hasCoreDetails);
  const needsMoreDetail = Boolean(parsed?.needsMoreDetail || (isJobPost && !hasCoreDetails));

  const jobPostText = normalizeText(
    parsed?.jobPostText ||
      [
        jobSummary.companyName && `회사: ${jobSummary.companyName}`,
        jobSummary.positionTitle && `직무/공고명: ${jobSummary.positionTitle}`,
        jobSummary.employmentType && `고용 형태: ${jobSummary.employmentType}`,
        jobSummary.experienceLevel && `경력: ${jobSummary.experienceLevel}`,
        jobSummary.deadline && `마감일: ${jobSummary.deadline}`,
        jobSummary.summaryText && `요약: ${jobSummary.summaryText}`,
        jobSummary.jobDetails.length && `직무 상세/주요 업무:\n- ${jobSummary.jobDetails.join('\n- ')}`,
        jobSummary.requiredQualifications.length &&
          `지원 자격/필수 요건:\n- ${jobSummary.requiredQualifications.join('\n- ')}`,
        jobSummary.preferredQualifications.length &&
          `우대 자격/우대 사항:\n- ${jobSummary.preferredQualifications.join('\n- ')}`,
        jobSummary.coverLetterQuestions.length &&
          `자기소개서 문항:\n- ${jobSummary.coverLetterQuestions.join('\n- ')}`,
        sourceUrl && `원본 URL: ${sourceUrl}`,
      ]
        .filter(Boolean)
        .join('\n\n') ||
      originalInput
  );

  let message = parsed?.message || '';
  if (!message && isJobPost && needsMoreDetail) {
    message =
      '공고의 기본 정보는 확인했어요. 다만 사이트 구조상 직무 상세/지원 자격/우대 사항 일부가 부족할 수 있어요. 현재 확인된 정보로 먼저 방향을 잡고, 필요하면 해당 항목을 추가로 붙여넣어 주세요.';
  } else if (!message && isJobPost) {
    message = '채용공고 내용을 확인했어요. 이제 이 공고와 연결할 핵심 경험을 알려주세요.';
  } else if (!message) {
    message = '채용공고로 판단할 만한 정보가 부족해요. 공고 상세 URL이나 공고 내용을 붙여넣어 주세요.';
  }

  return {
    success: true,
    isJobPost,
    needsMoreDetail,
    showJobHelp: !isJobPost,
    message,
    jobPostText,
    jobSummary,
    sourceUrls: jobSummary.sourceUrls,
    renderedBy: sourceUrl ? 'playwright' : 'plain-text',
  };
}

async function extractRenderedTextWithPlaywright(url) {
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const context = await browser.newContext({
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      viewport: { width: 1440, height: 1200 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    });

    const page = await context.newPage();

    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'font', 'media'].includes(resourceType)) {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1800);

    const extracted = await page.evaluate(() => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

      const metaDescription =
        document.querySelector('meta[name="description"]')?.getAttribute('content') ||
        document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        '';

      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';

      const jsonLdTexts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map((node) => node.textContent || '')
        .filter(Boolean)
        .join('\n');

      const selectors = [
        'main',
        '[class*="recruit"]',
        '[class*="Recruit"]',
        '[class*="job"]',
        '[class*="Job"]',
        '[class*="position"]',
        '[class*="Position"]',
        '[class*="view"]',
        '[class*="View"]',
        '[id*="recruit"]',
        '[id*="job"]',
        'body',
      ];

      const chunks = [];
      for (const selector of selectors) {
        for (const element of Array.from(document.querySelectorAll(selector)).slice(0, 12)) {
          const text = normalize(element.innerText);
          if (text && text.length > 80) chunks.push(text);
        }
      }

      const uniqueChunks = Array.from(new Set(chunks)).sort((a, b) => b.length - a.length).slice(0, 8);

      return {
        title: document.title || '',
        ogTitle,
        metaDescription,
        jsonLdTexts,
        bodyText: document.body?.innerText || '',
        chunks: uniqueChunks,
      };
    });

    const renderedText = normalizeText(
      [
        `URL: ${url}`,
        extracted.title && `PAGE_TITLE: ${extracted.title}`,
        extracted.ogTitle && `OG_TITLE: ${extracted.ogTitle}`,
        extracted.metaDescription && `META_DESCRIPTION: ${extracted.metaDescription}`,
        extracted.jsonLdTexts && `JSON_LD:\n${extracted.jsonLdTexts}`,
        extracted.chunks?.length && `IMPORTANT_SECTIONS:\n${extracted.chunks.join('\n\n---\n\n')}`,
        extracted.bodyText && `BODY_TEXT:\n${extracted.bodyText}`,
      ]
        .filter(Boolean)
        .join('\n\n')
    );

    return renderedText.slice(0, MAX_RENDERED_TEXT_LENGTH);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function analyzeWithDeepSeek({ rawInput, renderedText, sourceUrl, userProfile }) {
  const system = `
너는 한국 채용공고 분석기다. 사용자가 보낸 채용공고 URL 또는 텍스트에서 자기소개서 작성에 필요한 정보를 추출한다.

반드시 JSON 객체만 출력한다. 마크다운 코드블록은 금지한다.

중요도 순서:
1. jobDetails: 직무 상세, 담당업무, 주요업무, 수행업무
2. requiredQualifications: 지원 자격, 자격요건, 필수요건, 필요역량
3. preferredQualifications: 우대 자격, 우대사항, 우대조건
4. coverLetterQuestions: 자기소개서 문항

규칙:
- 원문에 없는 내용은 지어내지 않는다.
- 공고명/회사명/경력/마감일만 확인되고 직무 상세나 자격요건이 부족하면 isJobPost는 true, needsMoreDetail은 true로 둔다.
- 채용 사이트 목록 페이지나 검색 결과 페이지라면 isJobPost는 false로 둔다.
- URL을 분석한 경우 sourceUrls에 원본 URL을 넣는다.
- jobPostText에는 자기소개서 생성에 넣을 수 있도록 확인된 정보를 정리한다.

응답 형식:
{
  "isJobPost": true,
  "needsMoreDetail": false,
  "showJobHelp": false,
  "message": "사용자에게 보여줄 안내 문장",
  "jobPostText": "자기소개서 생성에 사용할 공고 정리 텍스트",
  "sourceUrls": ["원본 URL"],
  "jobSummary": {
    "companyName": "회사명",
    "positionTitle": "공고명 또는 직무명",
    "employmentType": "신입/경력/인턴/정규직 등",
    "experienceLevel": "경력 조건",
    "deadline": "마감일",
    "summaryText": "공고 핵심 요약 1~2문장",
    "jobDetails": ["직무 상세/주요 업무"],
    "requiredQualifications": ["지원 자격/필수 요건"],
    "preferredQualifications": ["우대 자격/우대 사항"],
    "coverLetterQuestions": ["자기소개서 문항"],
    "sourceUrls": ["원본 URL"]
  }
}
`.trim();

  const user = `
[사용자 프로필]
${JSON.stringify(userProfile || {}, null, 2)}

[사용자 입력]
${rawInput}

[원본 URL]
${sourceUrl || '(없음)'}

[렌더링 후 추출된 페이지 텍스트 또는 직접 입력 텍스트]
${normalizeText(renderedText || rawInput).slice(0, MAX_AI_INPUT_LENGTH)}
`.trim();

  const resp = await client.chat.completions.create({
    model: 'deepseek-chat',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.1,
  });

  return safeJsonParse(resp.choices[0]?.message?.content || '{}');
}

function fallbackAnalyze({ input, sourceUrl, error }) {
  const text = normalizeText(input);
  const looksLikeJob = /채용|모집|공고|담당업무|주요업무|자격요건|지원자격|우대사항|경력|신입|인턴|정규직/.test(text);

  return {
    success: true,
    isJobPost: Boolean(sourceUrl || looksLikeJob),
    needsMoreDetail: true,
    showJobHelp: !sourceUrl && !looksLikeJob,
    message: sourceUrl
      ? '공고 링크는 확인했지만 페이지 상세 내용을 충분히 분석하지 못했어요. 원본 공고에서 직무 상세, 지원 자격, 우대 사항을 복사해 보내주면 더 정확하게 작성할 수 있어요.'
      : '채용공고 내용이 충분하지 않아요. 공고 상세 URL이나 직무 상세, 지원 자격, 우대 사항을 붙여넣어 주세요.',
    jobPostText: text || sourceUrl,
    sourceUrls: sourceUrl ? [sourceUrl] : [],
    jobSummary: {
      companyName: '',
      positionTitle: '',
      employmentType: '',
      experienceLevel: '',
      deadline: '',
      summaryText: sourceUrl ? '공고 URL은 확인했지만 상세 항목은 원문에서 추가 확인이 필요합니다.' : '',
      jobDetails: [],
      requiredQualifications: [],
      preferredQualifications: [],
      coverLetterQuestions: [],
      sourceUrls: sourceUrl ? [sourceUrl] : [],
    },
    parserError: error?.message || String(error || ''),
  };
}

export async function analyzeJobPost({ input, userProfile }) {
  const rawInput = normalizeText(input);
  const sourceUrl = extractFirstUrl(rawInput);

  if (!rawInput) {
    return {
      success: false,
      isJobPost: false,
      needsMoreDetail: true,
      showJobHelp: true,
      message: '분석할 채용공고 URL이나 공고 내용을 입력해 주세요.',
      jobPostText: '',
      sourceUrls: [],
      jobSummary: null,
    };
  }

  try {
    const renderedText = sourceUrl ? await extractRenderedTextWithPlaywright(sourceUrl) : rawInput;
    const parsed = await analyzeWithDeepSeek({ rawInput, renderedText, sourceUrl, userProfile });
    return normalizeParsedResult(parsed, sourceUrl, rawInput);
  } catch (error) {
    console.error('❌ 채용공고 Playwright/AI 분석 실패:', error);
    return fallbackAnalyze({ input: rawInput, sourceUrl, error });
  }
}
