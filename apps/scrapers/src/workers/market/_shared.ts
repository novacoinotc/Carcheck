/**
 * Shared helpers for the MX marketplace workers (autocosmos/kavak/seminuevos/
 * mercadolibre). These commercial sites aggressively bot-wall datacenter IPs —
 * MercadoLibre/Kavak redirect to a login/verification page. Counting that page's
 * chrome as "listings" is a false positive, so detect it and report honestly.
 */
export function isBotWalled(finalUrl: string, bodyText: string): boolean {
  const u = (finalUrl || '').toLowerCase();
  const t = (bodyText || '').toLowerCase().slice(0, 600);
  return (
    /account-verification|\/gz\/|\/login|signin|sign-in|\/captcha|challenge|just a moment|attention required|cf-browser-verification/.test(
      u,
    ) ||
    /para continuar, ingresa a tu cuenta|soy nuevo\s+ya tengo cuenta|verifica que eres (humano|una persona)|habilita javascript|enable javascript/.test(
      t,
    )
  );
}
