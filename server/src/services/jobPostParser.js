import axios from 'axios';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { chromium } from 'playwright';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const URL_REGEX = /https?:\/\/[^\s<>'")]+/i;

// AI 비용/속도 때문에 너무 길게 보내지 않는다.
const MAX_RENDERED_TEXT_LENGTH = 10000;
const MAX_AI_INPUT_LENGTH = 6000;

// Playwright는 사람인에서 timeout/ECONNRESET이 자주 발생하므로 기본 경로에서는 사용하지 않는다.
// 정말 필요할 때만 .env에서 ENABLE_JOB_POST_PLAYWRIGHT=true 로 켠다.
const ENABLE_JOB_POST_PLAYWRIGHT = process.env.ENABLE_JOB_POST_PLAYWRIGHT === 'true';
const PLAYWRIGHT_MAX_CANDIDATES = Number(process.env.PLAYWRIGHT_MAX_CANDIDATES || 1);

// Playwright를 켜더라도 전체 UX가 오래 멈추지 않도록 짧게 제한한다.
const PLAYWRIGHT_NAVIGATION_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT_MS || 5000);
const PLAYWRIGHT_BODY_TIMEOUT_MS = Number(process.env.PLAYWRIGHT_BODY_TIMEOUT_MS || 1500);
const QUICK_FETCH_TIMEOUT_MS = Number(process.env.QUICK_FETCH_TIMEOUT_MS || 7000);

const JOB_POST_CACHE_TTL_MS = 1000 * 60 * 30;
const JOB_POST_FAILURE_CACHE_TTL_MS = 1000 * 60;

// 사람인 HTML은 title/meta 중심으로 700~900자만 잡히는 경우가 많다.
// 이 정도라도 있으면 AI에게 먼저 넘기고, 부족한 상세는 사용자에게 붙여넣기를 요청한다.
const MIN_QUICK_TEXT_LENGTH = 600;
const MIN_RENDERED_TEXT_LENGTH = 450;

const JOB_TEXT_KEYWORDS = [
  '담당업무',
  '주요업무',
  '수행업무',
  '직무내용',
  '업무내용',
  '자격요건',
  '지원자격',
  '필수요건',
  '필요역량',
  '우대사항',
  '우대조건',
  '근무조건',
  '고용형태',
  '경력',
  '신입',
  '정규직',
  '계약직',
  '인턴',
  '급여',
  '마감일',
  '자기소개서',
  '지원동기',
  '복리후생',
];

const BLOCKED_PAGE_PATTERNS = /접근이 제한|비정상적인 접근|보안문자|captcha|로봇|자동화|잠시 후 다시|서비스 이용에 불편|too many requests|access denied/i;

const MULTI_POSITION_PATTERNS =
  /각\s*부문|전\s*직군|전\s*분야|부문별|분야별|직군별|대규모\s*채용|공개\s*채용|수시\s*채용|신입\s*\/\s*경력|신입\s*및\s*경력|모집\s*부문|모집\s*분야|채용\s*분야|모집\s*직무|직무별/i;

const POSITION_TITLE_PATTERNS = [
  /(?:모집\s*부문|모집\s*분야|채용\s*분야|모집\s*직무|직무)\s*[:：]\s*([^\n]+)/gi,
  /(?:^|\n)\s*[-•ㆍ]\s*([^\n]{2,40}(?:개발자|엔지니어|디자이너|기획자|마케터|분석가|매니저|운영|영업|관리|회계|인사|총무|프론트엔드|백엔드|풀스택|데이터|AI|QA|DevOps)[^\n]{0,30})/gi,
];

const jobPostCache = new Map();
let sharedBrowser = null;

function normalizeText(text = '') {
  return String(text)
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
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

function normalizePositionOption(value, index = 0) {
  if (!value) return null;

  if (typeof value === 'string' || typeof value === 'number') {
    const title = String(value).trim();
    if (!title) return null;

    return {
      id: `position-${index + 1}`,
      title,
      jobDetails: [],
      requiredQualifications: [],
      preferredQualifications: [],
      keywords: [],
    };
  }

  if (typeof value !== 'object') return null;

  const title = String(
    value.title ||
      value.name ||
      value.positionTitle ||
      value.jobTitle ||
      value.department ||
      value.role ||
      ''
  ).trim();

  if (!title) return null;

  return {
    id: String(value.id || `position-${index + 1}`).trim(),
    title,
    jobDetails: toArray(value.jobDetails || value.keyDuties || value.duties || value.tasks),
    requiredQualifications: toArray(
      value.requiredQualifications || value.requiredRequirements || value.requirements
    ),
    preferredQualifications: toArray(
      value.preferredQualifications || value.preferredRequirements || value.preferred
    ),
    keywords: toArray(value.keywords || value.skills || value.techStack),
  };
}

function toPositionOptions(value) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const seen = new Set();

  return raw
    .map((item, index) => normalizePositionOption(item, index))
    .filter(Boolean)
    .filter((item) => {
      const key = item.title.replace(/\s+/g, '').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function extractPositionTitlesFromText(text = '') {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const candidates = [];

  for (const pattern of POSITION_TITLE_PATTERNS) {
    for (const match of normalized.matchAll(pattern)) {
      const raw = String(match[1] || '').trim();
      if (!raw) continue;

      raw
        .split(/[|,\/·ㆍ•]+/)
        .map((item) => item.replace(/[\[\](){}]/g, ' ').replace(/\s+/g, ' ').trim())
        .filter((item) => item.length >= 2 && item.length <= 50)
        .forEach((item) => candidates.push(item));
    }
  }

  return Array.from(new Set(candidates)).slice(0, 8);
}

function looksLikeMultiPositionJob({ text = '', title = '', positionOptions = [] } = {}) {
  if (positionOptions.length >= 2) return true;

  const combined = `${title}\n${text}`;
  if (MULTI_POSITION_PATTERNS.test(combined)) return true;

  return extractPositionTitlesFromText(combined).length >= 2;
}

function buildPositionOptionsText(positionOptions = []) {
  if (!positionOptions.length) return '';

  return `모집 분야 후보:\n${positionOptions
    .map((option, index) =>
      [
        `${index + 1}. ${option.title}`,
        option.jobDetails.length && `   담당업무: ${option.jobDetails.join(', ')}`,
        option.requiredQualifications.length && `   지원자격: ${option.requiredQualifications.join(', ')}`,
        option.preferredQualifications.length && `   우대사항: ${option.preferredQualifications.join(', ')}`,
        option.keywords.length && `   키워드: ${option.keywords.join(', ')}`,
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n')}`;
}

function extractSaraminRecIdx(url = '') {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('saramin.co.kr')) return '';
    return parsed.searchParams.get('rec_idx') || '';
  } catch (_) {
    return '';
  }
}

function cleanJobPostUrlForBrowser(url = '') {
  try {
    const parsed = new URL(url);
    const saraminRecIdx = extractSaraminRecIdx(url);

    parsed.hash = '';

    // 사람인은 rec_idx만 남기면 reset이 나는 경우가 있어 view_type=list는 유지한다.
    if (parsed.hostname.includes('saramin.co.kr') && saraminRecIdx) {
      return `https://www.saramin.co.kr/zf_user/jobs/relay/view?view_type=list&rec_idx=${encodeURIComponent(
        saraminRecIdx
      )}`;
    }

    for (const key of Array.from(parsed.searchParams.keys())) {
      if (/^(t_ref|t_ref_content|t_ref_area|utm_|searchword|searchType|exp_cd|loc_cd)/i.test(key)) {
        parsed.searchParams.delete(key);
      }
    }

    return parsed.toString();
  } catch (_) {
    return url;
  }
}

function buildJobPostUrlCandidates(url = '') {
  const candidates = [];

  if (url) candidates.push(url);

  const cleaned = cleanJobPostUrlForBrowser(url);
  if (cleaned) candidates.push(cleaned);

  try {
    const parsed = new URL(url);
    const recIdx = parsed.searchParams.get('rec_idx');

    if (parsed.hostname.includes('saramin.co.kr') && recIdx) {
      candidates.push(`https://www.saramin.co.kr/zf_user/jobs/relay/view?view_type=list&rec_idx=${recIdx}`);
      candidates.push(`https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${recIdx}`);
      candidates.push(`https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=${recIdx}`);
    }
  } catch (_) {}

  return Array.from(new Set(candidates.filter(Boolean)));
}

function getJobPostCacheKey(url = '') {
  try {
    const parsed = new URL(url);
    const recIdx = parsed.searchParams.get('rec_idx');

    if (parsed.hostname.includes('saramin.co.kr') && recIdx) {
      return `saramin:${recIdx}`;
    }

    return cleanJobPostUrlForBrowser(url);
  } catch (_) {
    return url;
  }
}

function getCachedJobPost(cacheKey) {
  if (!cacheKey) return null;

  const cached = jobPostCache.get(cacheKey);
  if (!cached) return null;

  if (Date.now() > cached.expiresAt) {
    jobPostCache.delete(cacheKey);
    return null;
  }

  return cached.value;
}

function setCachedJobPost(cacheKey, value, ttl = JOB_POST_CACHE_TTL_MS) {
  if (!cacheKey || !value) return;

  jobPostCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + ttl,
  });
}

function decodeHtmlEntities(text = '') {
  return String(text)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function htmlToQuickText(html = '', sourceUrl = '') {
  const raw = String(html || '');

  const jsonLdTexts = Array.from(raw.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
    .map((match) => match[1])
    .filter(Boolean)
    .join('\n');

  const withoutNoise = raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ');

  const title = withoutNoise.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const description =
    withoutNoise.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    withoutNoise.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    '';
  const ogTitle =
    withoutNoise.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';

  const bodyText = withoutNoise
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');

  return normalizeText(
    decodeHtmlEntities(
      [
        sourceUrl && `URL: ${sourceUrl}`,
        title && `PAGE_TITLE: ${title}`,
        ogTitle && `OG_TITLE: ${ogTitle}`,
        description && `META_DESCRIPTION: ${description}`,
        jsonLdTexts && `JSON_LD:\n${jsonLdTexts}`,
        bodyText && `BODY_TEXT:\n${bodyText}`,
      ]
        .filter(Boolean)
        .join('\n\n')
    )
  ).slice(0, MAX_RENDERED_TEXT_LENGTH);
}

function keywordHitCount(text = '') {
  const normalized = normalizeText(text);
  return JOB_TEXT_KEYWORDS.filter((keyword) => normalized.includes(keyword)).length;
}

function hasUsefulJobPostText(text = '') {
  const normalized = normalizeText(text);
  if (normalized.length < MIN_QUICK_TEXT_LENGTH) return false;

  const hitCount = keywordHitCount(normalized);
  const looksBlocked = BLOCKED_PAGE_PATTERNS.test(normalized) && hitCount < 3;

  return hitCount >= 2 && !looksBlocked;
}

function pickImportantJobText(text = '') {
  const normalized = normalizeText(text);
  if (!normalized) return '';

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const picked = [];
  lines.forEach((line, idx) => {
    if (JOB_TEXT_KEYWORDS.some((keyword) => line.includes(keyword))) {
      picked.push(...lines.slice(Math.max(0, idx - 4), idx + 14));
    }
  });

  const important = Array.from(new Set(picked)).join('\n');
  return (important.length >= 500 ? important : normalized).slice(0, MAX_RENDERED_TEXT_LENGTH);
}

function shouldAbortPlaywrightRequest(request) {
  const resourceType = request.resourceType();
  const requestUrl = request.url();

  // CSS는 차단하지 않는다. 일부 사이트는 CSS/정적 리소스 흐름이 깨지면 렌더링이 불안정해진다.
  if (['image', 'font', 'media'].includes(resourceType)) return true;

  return /google-analytics|googletagmanager|doubleclick|facebook|adservice|adnxs|criteo|acecounter|logger|analytics|tracking|beacon/i.test(
    requestUrl
  );
}

function buildBrowserHeaders() {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    Referer: 'https://www.saramin.co.kr/',
  };
}

async function extractQuickTextWithAxios(url) {
  const candidates = buildJobPostUrlCandidates(url);
  let bestText = '';
  let lastError = null;

  for (const targetUrl of candidates) {
    try {
      const response = await axios.get(targetUrl, {
        timeout: QUICK_FETCH_TIMEOUT_MS,
        maxRedirects: 5,
        responseType: 'text',
        headers: buildBrowserHeaders(),
        validateStatus: (status) => status >= 200 && status < 500,
      });

      const contentType = String(response.headers?.['content-type'] || '');
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        continue;
      }

      const text = pickImportantJobText(htmlToQuickText(response.data || '', targetUrl));
      if (text.length > bestText.length) bestText = text;

      if (hasUsefulJobPostText(text)) {
        return text;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (bestText) return bestText;
  if (lastError) throw lastError;
  return '';
}

function getSaraminAccessKey() {
  return process.env.SARAMIN_ACCESS_KEY || process.env.SARAMIN_API_KEY || '';
}

function getNameLike(value) {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(getNameLike).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return (
      value.name ||
      value.title ||
      value.code ||
      value.keyword ||
      value.value ||
      value['#text'] ||
      Object.values(value).map(getNameLike).filter(Boolean).join(', ')
    );
  }
  return '';
}

function getFirstSaraminJob(data) {
  const job = data?.jobs?.job || data?.job;
  if (Array.isArray(job)) return job[0] || null;
  return job || null;
}

function saraminApiJobToText(job, sourceUrl = '') {
  if (!job) return '';

  const companyName = getNameLike(job.company?.detail?.name || job.company?.name);
  const positionTitle = getNameLike(job.position?.title || job.title);
  const industry = getNameLike(job.position?.industry);
  const location = getNameLike(job.position?.location);
  const jobType = getNameLike(job.position?.['job-type']);
  const jobCategory = getNameLike(job.position?.['job-category']);
  const experience = getNameLike(job.position?.['experience-level']);
  const education = getNameLike(job.position?.['required-education-level']);
  const salary = getNameLike(job.salary);
  const deadline = getNameLike(job['expiration-date'] || job.deadline);
  const url = job.url || sourceUrl;

  return normalizeText(
    [
      url && `URL: ${url}`,
      companyName && `회사: ${companyName}`,
      positionTitle && `직무/공고명: ${positionTitle}`,
      industry && `산업/업종: ${industry}`,
      location && `근무지역: ${location}`,
      jobType && `고용 형태: ${jobType}`,
      jobCategory && `직무 분야: ${jobCategory}`,
      experience && `경력: ${experience}`,
      education && `학력: ${education}`,
      salary && `급여: ${salary}`,
      deadline && `마감일: ${deadline}`,
      `원본 API 데이터:\n${JSON.stringify(job, null, 2)}`,
    ]
      .filter(Boolean)
      .join('\n\n')
  ).slice(0, MAX_RENDERED_TEXT_LENGTH);
}

async function extractSaraminTextWithOfficialApi(sourceUrl) {
  const accessKey = getSaraminAccessKey();
  const recIdx = extractSaraminRecIdx(sourceUrl);

  if (!accessKey || !recIdx) return '';

  const response = await axios.get('https://oapi.saramin.co.kr/job-search', {
    timeout: QUICK_FETCH_TIMEOUT_MS,
    responseType: 'json',
    headers: {
      Accept: 'application/json',
    },
    params: {
      'access-key': accessKey,
      id: recIdx,
      fields: 'posting-date expiration-date keyword-code',
    },
  });

  const job = getFirstSaraminJob(response.data);
  return saraminApiJobToText(job, sourceUrl);
}

async function getSharedBrowser() {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    return sharedBrowser;
  }

  sharedBrowser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-background-networking',
      '--disable-extensions',
      '--disable-sync',
    ],
  });

  sharedBrowser.on('disconnected', () => {
    sharedBrowser = null;
  });

  return sharedBrowser;
}

async function closeSharedBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => {});
    sharedBrowser = null;
  }
}

process.once('SIGINT', closeSharedBrowser);
process.once('SIGTERM', closeSharedBrowser);

async function extractPageText(page, originalUrl, targetUrl) {
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
      for (const element of Array.from(document.querySelectorAll(selector)).slice(0, 10)) {
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
      `URL: ${originalUrl}`,
      targetUrl !== originalUrl && `BROWSER_URL: ${targetUrl}`,
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

  return pickImportantJobText(renderedText);
}

async function extractRenderedTextWithPlaywright(url) {
  let context;
  const candidates = buildJobPostUrlCandidates(url).slice(0, PLAYWRIGHT_MAX_CANDIDATES);
  const errors = [];
  let bestText = '';

  try {
    const browser = await getSharedBrowser();

    context = await browser.newContext({
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      viewport: { width: 1365, height: 1600 },
      userAgent: buildBrowserHeaders()['User-Agent'],
      extraHTTPHeaders: {
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        Referer: 'https://www.saramin.co.kr/',
      },
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();
    page.setDefaultTimeout(PLAYWRIGHT_BODY_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(PLAYWRIGHT_NAVIGATION_TIMEOUT_MS);

    await page.route('**/*', (route) => {
      if (shouldAbortPlaywrightRequest(route.request())) {
        return route.abort();
      }
      return route.continue();
    });

    for (const targetUrl of candidates) {
      let navigationError = null;

      try {
        await page.goto(targetUrl, {
          waitUntil: 'domcontentloaded',
          timeout: PLAYWRIGHT_NAVIGATION_TIMEOUT_MS,
        });
      } catch (error) {
        navigationError = error;
        errors.push(error.message);
        console.warn('⚠️ Playwright 페이지 로딩 실패, 부분 추출 시도:', error.message);
      }

      await page.waitForSelector('body', { timeout: PLAYWRIGHT_BODY_TIMEOUT_MS }).catch(() => {});
      await page
        .waitForFunction(() => document.body && document.body.innerText.trim().length > 100, {
          timeout: PLAYWRIGHT_BODY_TIMEOUT_MS,
        })
        .catch(() => {});
      await page.waitForTimeout(700);

      let currentText = '';
      try {
        currentText = await extractPageText(page, url, targetUrl);
      } catch (error) {
        errors.push(error.message);
      }

      if (currentText.length > bestText.length) {
        bestText = currentText;
      }

      if (hasUsefulJobPostText(currentText)) {
        return currentText.slice(0, MAX_RENDERED_TEXT_LENGTH);
      }

      // net::ERR_CONNECTION_RESET처럼 연결 자체가 끊긴 경우에는 다음 후보 URL을 시도한다.
      if (navigationError) {
        continue;
      }
    }

    if (bestText.length >= MIN_RENDERED_TEXT_LENGTH) {
      return bestText.slice(0, MAX_RENDERED_TEXT_LENGTH);
    }

    throw new Error(errors.filter(Boolean).join(' / ') || '렌더링된 공고 텍스트가 너무 짧습니다.');
  } finally {
    if (context) await context.close().catch(() => {});
  }
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
    positionOptions: toPositionOptions(summary.positionOptions || summary.recruitmentFields || summary.positions),
    selectedPosition: summary.selectedPosition || '',
    sourceUrls: summary.sourceUrls || (sourceUrl ? [sourceUrl] : []),
  };

  const heuristicPositionTitles = extractPositionTitlesFromText(
    [jobSummary.positionTitle, jobSummary.summaryText, parsed?.jobPostText, originalInput].filter(Boolean).join('\n')
  );

  if (jobSummary.positionOptions.length === 0 && heuristicPositionTitles.length >= 2) {
    jobSummary.positionOptions = toPositionOptions(heuristicPositionTitles);
  }

  const hasBasicJobInfo = Boolean(jobSummary.companyName || jobSummary.positionTitle || jobSummary.summaryText);
  const hasCoreDetails =
    jobSummary.jobDetails.length > 0 ||
    jobSummary.requiredQualifications.length > 0 ||
    jobSummary.preferredQualifications.length > 0;

  const isJobPost = Boolean(parsed?.isJobPost || hasBasicJobInfo || hasCoreDetails);
  const needsMoreDetail = Boolean(parsed?.needsMoreDetail || (isJobPost && !hasCoreDetails));
  const needsPositionSelection = Boolean(
    parsed?.needsPositionSelection ||
      (isJobPost &&
        !jobSummary.selectedPosition &&
        looksLikeMultiPositionJob({
          text: [parsed?.jobPostText, originalInput, jobSummary.summaryText].filter(Boolean).join('\n'),
          title: jobSummary.positionTitle,
          positionOptions: jobSummary.positionOptions,
        }))
  );

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
        jobSummary.positionOptions.length && buildPositionOptionsText(jobSummary.positionOptions),
        needsPositionSelection &&
          !jobSummary.selectedPosition &&
          '지원 분야 확인 필요: 이 공고는 여러 모집 분야가 있을 수 있으므로 사용자가 지원할 분야를 먼저 선택하거나 입력해야 합니다.',
        jobSummary.selectedPosition && `선택한 지원 분야: ${jobSummary.selectedPosition}`,
        sourceUrl && `원본 URL: ${sourceUrl}`,
      ]
        .filter(Boolean)
        .join('\n\n') ||
      originalInput
  );

  let message = parsed?.message || '';
  if (!message && isJobPost && needsPositionSelection) {
    message =
      '공고에서 여러 모집 분야가 있을 수 있어요. 자기소개서가 엉뚱한 직무 기준으로 작성되지 않도록, 먼저 지원하려는 분야를 선택하거나 직접 입력해 주세요.';
  } else if (!message && isJobPost && needsMoreDetail) {
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
    needsPositionSelection,
    showJobHelp: !isJobPost,
    message,
    jobPostText,
    jobSummary,
    sourceUrls: jobSummary.sourceUrls,
    renderedBy: sourceUrl ? 'auto' : 'plain-text',
  };
}

async function analyzeWithDeepSeek({ rawInput, renderedText, sourceUrl, userProfile }) {
  const system = `
너는 한국 채용공고 분석기다. 사용자가 보낸 채용공고 URL 또는 텍스트에서 자기소개서 작성에 필요한 정보를 추출한다.

반드시 JSON 객체만 출력한다. 마크다운 코드블록은 금지한다.

중요도 순서:
0. positionOptions: 모집 분야/모집 부문/채용 분야/직무 후보. 한 공고 안에 여러 분야가 있으면 반드시 배열로 분리한다.
1. jobDetails: 직무 상세, 담당업무, 주요업무, 수행업무
2. requiredQualifications: 지원 자격, 자격요건, 필수요건, 필요역량
3. preferredQualifications: 우대 자격, 우대사항, 우대조건
4. coverLetterQuestions: 자기소개서 문항

규칙:
- 원문에 없는 내용은 지어내지 않는다.
- 공고 제목이나 본문에 "각 부문", "전 직군", "모집 부문", "모집 분야", "채용 분야", "신입/경력"처럼 여러 지원 분야가 있을 가능성이 보이면 needsPositionSelection은 true로 둔다.
- 여러 모집 분야가 명확하면 jobSummary.positionOptions에 분야별 title, jobDetails, requiredQualifications, preferredQualifications를 분리해 넣는다.
- 모집 분야 이름은 보이지만 상세 조건을 분야별로 분리할 수 없으면 title만 넣어도 된다.
- 모집 분야를 하나로 특정할 수 없으면 selectedPosition은 빈 문자열로 둔다.
- 공고명/회사명/경력/마감일만 확인되고 직무 상세나 자격요건이 부족하면 isJobPost는 true, needsMoreDetail은 true로 둔다.
- 채용 사이트 목록 페이지나 검색 결과 페이지라면 isJobPost는 false로 둔다.
- URL을 분석한 경우 sourceUrls에 원본 URL을 넣는다.
- jobPostText에는 자기소개서 생성에 넣을 수 있도록 확인된 정보를 정리하되, 여러 모집 분야가 있으면 "지원 분야 확인 필요" 문구도 포함한다.

응답 형식:
{
  "isJobPost": true,
  "needsMoreDetail": false,
  "needsPositionSelection": false,
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
    "positionOptions": [
      {
        "id": "position-1",
        "title": "모집 분야명",
        "jobDetails": ["해당 분야 담당업무"],
        "requiredQualifications": ["해당 분야 지원자격"],
        "preferredQualifications": ["해당 분야 우대사항"],
        "keywords": ["해당 분야 핵심 키워드"]
      }
    ],
    "selectedPosition": "",
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
      positionOptions: [],
      selectedPosition: '',
      sourceUrls: sourceUrl ? [sourceUrl] : [],
    },
    needsPositionSelection: false,
    parserError: error?.message || String(error || ''),
  };
}

export async function analyzeJobPost({ input, userProfile }) {
  const rawInput = normalizeText(input);
  const sourceUrl = extractFirstUrl(rawInput);
  const cacheKey = sourceUrl ? getJobPostCacheKey(sourceUrl) : '';

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

  const cached = getCachedJobPost(cacheKey);
  if (cached) {
    return {
      ...cached,
      fromCache: true,
    };
  }

  try {
    let renderedText = rawInput;
    let extractionSource = sourceUrl ? 'url' : 'plain-text';

    if (sourceUrl) {
      const extractedCandidates = [];

      // 1순위: 사람인 공식 API. 키가 있으면 가장 빠르고 안정적이다.
      try {
        const apiText = await extractSaraminTextWithOfficialApi(sourceUrl);
        if (apiText) {
          extractedCandidates.push({ source: 'saramin-api', text: apiText });
          console.log(`✅ 사람인 공식 API 추출 사용 가능: ${apiText.length}자`);
        }
      } catch (error) {
        console.warn('⚠️ 사람인 공식 API 추출 실패:', error.message);
      }

      // 2순위: axios로 빠르게 HTML 추출.
      try {
        const quickText = await extractQuickTextWithAxios(sourceUrl);
        if (quickText) {
          extractedCandidates.push({ source: 'quick-html', text: quickText });
          console.log(`✅ 채용공고 빠른 HTML 추출 후보: ${quickText.length}자`);
        }
      } catch (error) {
        console.warn('⚠️ 채용공고 빠른 HTML 추출 실패:', error.message);
      }

      // 3순위: Playwright 렌더링 추출.
      // 중요: 빠른 HTML/API 후보가 이미 있으면 Playwright를 기본적으로 생략한다.
      // 사람인에서는 Playwright가 후보 URL마다 5~15초씩 잡아먹고, quick-html보다 결과가 짧은 경우가 많다.
      const bestQuickCandidate = extractedCandidates
        .filter((item) => ['saramin-api', 'quick-html'].includes(item.source))
        .sort((a, b) => b.text.length - a.text.length)[0];

      if (bestQuickCandidate && bestQuickCandidate.text.length >= MIN_RENDERED_TEXT_LENGTH) {
        console.log(
          `✅ ${bestQuickCandidate.source} 후보가 있어 Playwright 생략: ${bestQuickCandidate.text.length}자`
        );
      } else if (ENABLE_JOB_POST_PLAYWRIGHT) {
        try {
          const playwrightText = await extractRenderedTextWithPlaywright(sourceUrl);
          if (playwrightText) {
            extractedCandidates.push({ source: 'playwright', text: playwrightText });
            console.log(`✅ 채용공고 Playwright 추출 후보: ${playwrightText.length}자`);
          }
        } catch (error) {
          console.warn('⚠️ Playwright 추출 실패:', error.message);
        }
      } else {
        console.log('ℹ️ 빠른 추출 결과가 부족하지만 ENABLE_JOB_POST_PLAYWRIGHT=false라 Playwright를 생략합니다.');
      }

      // 쓸 수 있는 텍스트가 있으면 우선 사용한다.
      const useful = extractedCandidates.find((item) => hasUsefulJobPostText(item.text));
      const longest = extractedCandidates.sort((a, b) => b.text.length - a.text.length)[0];

      if (useful) {
        renderedText = useful.text;
        extractionSource = useful.source;
      } else if (longest && longest.text.length >= MIN_RENDERED_TEXT_LENGTH) {
        // 키워드가 부족하더라도 title/meta/API 일부 정보는 AI가 기본 정보 판단에 쓸 수 있다.
        renderedText = longest.text;
        extractionSource = `${longest.source}-partial`;
      } else {
        const fallback = fallbackAnalyze({
          input: rawInput,
          sourceUrl,
          error: new Error('채용공고 본문을 충분히 추출하지 못했습니다.'),
        });

        setCachedJobPost(cacheKey, fallback, JOB_POST_FAILURE_CACHE_TTL_MS);
        return fallback;
      }
    }

    const parsed = await analyzeWithDeepSeek({ rawInput, renderedText, sourceUrl, userProfile });
    const result = normalizeParsedResult(parsed, sourceUrl, rawInput);

    result.renderedBy = extractionSource;
    setCachedJobPost(cacheKey, result, JOB_POST_CACHE_TTL_MS);
    return result;
  } catch (error) {
    console.error('❌ 채용공고 Playwright/AI 분석 실패:', error);
    const fallback = fallbackAnalyze({ input: rawInput, sourceUrl, error });
    setCachedJobPost(cacheKey, fallback, JOB_POST_FAILURE_CACHE_TTL_MS);
    return fallback;
  }
}
