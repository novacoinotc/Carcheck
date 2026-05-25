import { chromium } from 'playwright';


export interface HealthStatus {
  ok: boolean;
  service: string;
  uptime: number;
  checks: {
    playwright: boolean;
    captcha_configured: boolean;
    proxy_configured: boolean;
    auth_configured: boolean;
  };
}

export async function healthCheck(): Promise<HealthStatus> {
  let playwrightOk = false;
  try {
    await chromium.executablePath();
    playwrightOk = true;
  } catch {
    /* ignore */
  }

  return {
    ok: playwrightOk && Boolean(process.env.SCRAPERS_AUTH_TOKEN),
    service: 'carcheck-scrapers',
    uptime: process.uptime(),
    checks: {
      playwright: playwrightOk,
      captcha_configured: Boolean(process.env.TWOCAPTCHA_API_KEY),
      proxy_configured: Boolean(process.env.PROXY_USERNAME ?? process.env.BRIGHTDATA_USERNAME),
      auth_configured: Boolean(process.env.SCRAPERS_AUTH_TOKEN),
    },
  };
}
