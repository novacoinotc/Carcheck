import { logger } from './logger.js';

const TWOCAPTCHA_KEY = process.env.TWOCAPTCHA_API_KEY;
const TWOCAPTCHA_BASE = 'https://2captcha.com';
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 24;

export interface ReCaptchaV2Input {
  siteKey: string;
  pageUrl: string;
  invisible?: boolean;
}

export async function solveReCaptchaV2(input: ReCaptchaV2Input): Promise<string> {
  if (!TWOCAPTCHA_KEY) throw new Error('TWOCAPTCHA_API_KEY not configured');

  const params = new URLSearchParams({
    key: TWOCAPTCHA_KEY,
    method: 'userrecaptcha',
    googlekey: input.siteKey,
    pageurl: input.pageUrl,
    json: '1',
    ...(input.invisible ? { invisible: '1' } : {}),
  });
  const submit = await fetch(`${TWOCAPTCHA_BASE}/in.php?${params}`, { method: 'POST' });
  const submitBody = (await submit.json()) as { status: number; request: string };
  if (submitBody.status !== 1) {
    throw new Error(`2captcha submit failed: ${submitBody.request}`);
  }
  const captchaId = submitBody.request;
  logger.debug({ captchaId }, '2captcha submitted');

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const poll = await fetch(
      `${TWOCAPTCHA_BASE}/res.php?key=${TWOCAPTCHA_KEY}&action=get&id=${captchaId}&json=1`,
    );
    const pollBody = (await poll.json()) as { status: number; request: string };
    if (pollBody.status === 1) {
      logger.debug({ captchaId, attempts: attempt }, '2captcha solved');
      return pollBody.request;
    }
    if (pollBody.request !== 'CAPCHA_NOT_READY') {
      throw new Error(`2captcha poll failed: ${pollBody.request}`);
    }
  }
  throw new Error('2captcha timeout after 120s');
}

export interface ImageCaptchaInput {
  base64: string;
  hint?: string;
}

export async function solveImageCaptcha(input: ImageCaptchaInput): Promise<string> {
  if (!TWOCAPTCHA_KEY) throw new Error('TWOCAPTCHA_API_KEY not configured');
  const params = new URLSearchParams({
    key: TWOCAPTCHA_KEY,
    method: 'base64',
    body: input.base64,
    json: '1',
    ...(input.hint ? { textinstructions: input.hint } : {}),
  });
  const submit = await fetch(`${TWOCAPTCHA_BASE}/in.php?${params}`, { method: 'POST' });
  const submitBody = (await submit.json()) as { status: number; request: string };
  if (submitBody.status !== 1) {
    throw new Error(`2captcha image submit failed: ${submitBody.request}`);
  }
  const captchaId = submitBody.request;
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const poll = await fetch(
      `${TWOCAPTCHA_BASE}/res.php?key=${TWOCAPTCHA_KEY}&action=get&id=${captchaId}&json=1`,
    );
    const pollBody = (await poll.json()) as { status: number; request: string };
    if (pollBody.status === 1) return pollBody.request;
    if (pollBody.request !== 'CAPCHA_NOT_READY') {
      throw new Error(`2captcha image poll failed: ${pollBody.request}`);
    }
  }
  throw new Error('2captcha image timeout');
}
