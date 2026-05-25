# CarCheck — Catálogo de fuentes de datos

> 80+ fuentes catalogadas en 21 categorías. Verificadas a mayo 2026.
> Tier 1 = must-have. Tier 2 = nice-to-have. Tier 3 = requiere partnership.

## Resumen por país y categoría

| Categoría | MX | US | Total |
|---|---|---|---|
| Federal | 11 | 4 | 15 |
| Estatal (registro vehicular) | 32 | top 5 | 37 |
| Judicial / Criminal | 4 | 2 | 6 |
| Ambiental / Verificación | 4 | 2 | 6 |
| Financiero / Buró | 4 | 3 | 7 |
| Aseguradoras | (via OCRA) | 3 | 3 |
| Aduana / Importación | 4 | 1 | 5 |
| OEM directo | — | 6+ | 6 |
| Telemetría / Connected | — | 4 | 4 |
| Marketplace / Listings | 6 | 4 (vía MarketCheck) | 10 |
| Subastas | — | 5 | 5 |
| Imagen / Reverso | — | 4 | 4 |
| ONG / Open data | 5 | 2 | 7 |

---

## Tier 1 — Must-have (MVP completo)

### México federal
1. **REPUVE** — https://www2.repuve.gob.mx:8443/ciudadania/ — robo, NIV, placa, holograma. Scraping.
2. **OCRA/AMIS** — https://www.ocra.com.mx — robo de 23 aseguradoras + INTERPOL. Partner B2B.
3. **RUG** — https://www.rug.gob.mx — prendas/gravámenes. Scraping.
4. **SAT CFDI Validator** — https://verificacfdi.facturaelectronica.sat.gob.mx — autenticidad factura. Form público.
5. **AMDA Papel Seguridad** — https://www.amda.mx/factura-amda/ — factura agencia. QR público.
6. **ANAM Pediment Quick Query** — https://www.anam.gob.mx/consulta-rapida-de-pedimentos-de-vehiculos-y-contenedores/ — **CRÍTICO para chocolate cars**. Scraping.
7. **PROFECO Alertas** — https://alertas.gob.mx — recalls MX oficial. Scraping.

### México estatal (32 entidades — todas)
| # | Estado | Portal | Datos |
|---|---|---|---|
| 1 | Aguascalientes | eservicios2.aguascalientes.gob.mx | refrendo, multas |
| 2 | Baja California | tramites.ebajacalifornia.gob.mx + seguridadbc.gob.mx | control veh., recuperados |
| 3 | Baja California Sur | apps.bcs.gob.mx/pedimento | adeudo + pediment |
| 4 | Campeche | finanzas.campeche.gob.mx | control vehicular |
| 5 | Chiapas | ingresos.haciendachiapas.gob.mx | adeudo (incl. otros estados) |
| 6 | Chihuahua | chihuahua.gob.mx | refrendo, tenencia |
| 7 | Coahuila | pagafacil.gob.mx | control vehicular |
| 8 | Colima | secfinanzas.col.gob.mx | refrendo, tenencia |
| 9 | **CDMX** | data.finanzas.cdmx.gob.mx + verificacionvehicular.sedema.cdmx.gob.mx | adeudos, fotocívicas, **verificentros historial** |
| 10 | Durango | durango.gob.mx | refrendo |
| 11 | **Edo. de México** | sfpya.edomexico.gob.mx + fgjem.edomex.gob.mx + sma.edomex.gob.mx | adeudos, recuperados, verificación |
| 12 | Guanajuato | refrendo.guanajuato.gob.mx + consultaveh.guanajuato.gob.mx | refrendo |
| 13 | Guerrero | finanzas.guerrero.gob.mx | tenencia, derechos |
| 14 | Hidalgo | finanzas.hidalgo.gob.mx | control vehicular |
| 15 | **Jalisco** | sfp.jalisco.gob.mx | refrendo, tenencia |
| 16 | Michoacán | secfinanzas.michoacan.gob.mx | tenencia, refrendo |
| 17 | Morelos | hacienda.morelos.gob.mx | control vehicular |
| 18 | Nayarit | hacienda.nayarit.gob.mx | control vehicular |
| 19 | **Nuevo León** | icvnl.gob.mx/EstadodeCuenta | adeudos (mejor UI) |
| 20 | Oaxaca | finanzasoaxaca.gob.mx + siox.finanzasoaxaca.gob.mx | tenencia, movilidad |
| 21 | **Puebla** | finanzas.puebla.gob.mx + fotoinfraccion.puebla.gob.mx | adeudos, multas |
| 22 | Querétaro | finanzas.queretaro.gob.mx | refrendo |
| 23 | Quintana Roo | satq.qroo.gob.mx/controlvehicular | control vehicular |
| 24 | San Luis Potosí | finanzas.slp.gob.mx | control vehicular |
| 25 | Sinaloa | ase.sinaloa.gob.mx | refrendo |
| 26 | Sonora | cuentaunica.siiafhacienda.gob.mx/expressvehicular | revalidación |
| 27 | Tabasco | finanzas.tabasco.gob.mx | refrendo, tenencia |
| 28 | Tamaulipas | sat.tamaulipas.gob.mx | refrendo (border state) |
| 29 | Tlaxcala | a-tenenciaonline.sefintlax.gob.mx | tenencia |
| 30 | Veracruz | of-virtual.haciendaveracruz.gob.mx | impuesto vehicular |
| 31 | Yucatán | reemplacamiento.yucatan.gob.mx + pontealdia.yucatan.gob.mx | reemplacamiento, adeudos |
| 32 | Zacatecas | finanzas.zacatecas.gob.mx | refrendo |

### Estados Unidos
8. **NMVTIS via VinAudit** — vinaudit.com/nmvtis-data — title brands, salvage, junk, robo histórico. API paga ~$2.49/reporte.
9. **NHTSA vPIC** — vpic.nhtsa.dot.gov/api — decoder VIN. API gratis.
10. **NHTSA Recalls** — nhtsa.gov/recalls — recalls por VIN. API gratis.
11. **NICB VINCheck** — nicb.org/vincheck — robo + salvage. Scraping (5/día/IP).
12. **MarketCheck VIN History** — docs.marketcheck.com — 5B listings desde 2015, historial de precio y odómetro por VIN. API paga.
13. **Copart + IAA Auctions** — copart.com + iaai.com — VIN, fotos, daño, precio venta. Scraping vía Stat.vin/Auction-API.

### Verificación ambiental
14. **CDMX Verificentros** — smahologramas.dsinet.com.mx/ConsultaVerificaciones — historial verificación por placa (odómetro + holograma).
15. **EdoMex Verificación** — sma.edomex.gob.mx/verificacion-vehicular

### OEM Recalls (complementan NHTSA)
16. Toyota — toyota.com/recall — scraping VIN
17. GM (Chevy, Buick, GMC, Cadillac) — experience.gm.com/ownercenter/recalls
18. Ford — ford.com/support/recalls
19. Honda / Acura — owners.honda.com/recalls
20. Nissan, BMW, Mercedes, VW, Audi, Stellantis — portales propios

### Mercado MX
21. Mercado Libre Autos — autos.mercadolibre.com.mx
22. Seminuevos.com
23. Kavak — kavak.com/mx
24. Autocosmos México — autocosmos.com.mx

### Judicial estatal (top 6 por robo)
25. Fiscalía EdoMex — fgjem.edomex.gob.mx/reporte-robo
26. FGJ CDMX — fgjcdmx.gob.mx
27. Fiscalía Jalisco — fge.jalisco.gob.mx
28. Fiscalía Nuevo León — fiscalianl.gob.mx
29. Fiscalía Puebla — fiscalia.puebla.gob.mx
30. Fiscalía Veracruz — fiscaliaveracruz.gob.mx

---

## Tier 2 — Nice-to-have

- **AutoCheck via VinAudit reseller** — historial Experian
- **Bumper / EpicVIN / ClearVin** — NMVTIS resellers
- **Manheim API** — developer.manheim.com — precios subasta mayorista
- **LexisNexis C.L.U.E. Auto** — 7 años claims insurance
- **VUCEM full pediment** — ventanillaunica.gob.mx — requiere e.firma
- **Foto-multas estatales** — Puebla, CDMX, EdoMex, Jalisco (multas a foráneos)
- **TinEye + Google Lens (SerpAPI)** — reverse image en listings
- **EPA + state smog check histories** — emissions historical (CA BAR, AZ, CO, IL)
- **DataOne specs** — OEM specs enterprise
- **OpenCorporates / SIEM MX** — fleet owner attribution
- **Smartcar (consent)** — odómetro live con OAuth
- **VinAudit Market Value** — comparables US
- **Datos.gob.mx** — heatmaps robo + accidentes
- **Cars.com / AutoTrader (via MarketCheck)** — listings históricos US
- **Carfax MX (carfax.mx / Carinfo)** — partnership opportunity

---

## Tier 3 — Exotic / partnership-only

- **Carfax US enterprise API** — gated
- **ISO ClaimSearch (Verisk)** — insurance industry only
- **CCC Intelligent Solutions** — repair industry
- **NCIC Vehicle File (FBI)** — law enforcement only
- **INTERPOL SMV** — via OCRA only
- **Plataforma México** — government only
- **Buró de Crédito vehicle loans** — SOFOM convenio
- **Círculo de Crédito**
- **CBP cross-border records** — FOIA only
- **AAMVA state-to-state**
- **Wejo / Otonomo connected car** — partnership-gated
- **OEM dealer-portal feeds** — dealer-network partnership

---

## Aduana / Importación (todas relevantes para chocolate cars)

- **ANAM Quick Query** (Tier 1)
- **ANAM Extracción Formal** — anam.gob.mx/solicitud-de-consulta — certificado pedimento, 30 días
- **VUCEM** — full pedimento, requiere e.firma
- **ANAM Regularización Autos Usados** — anam.gob.mx/importaciones-definitivas — folio de regularización decreto 2022-2025
- **SAT Importación Vehículos** — sat.gob.mx — IVA, ISAN pagados

---

## Insights estratégicos del análisis

1. **Diferenciador chocolate cars**: ANAM pediment + MarketCheck US history + Copart/IAA + reverse image search = chain que ningún competidor MX hace bien.

2. **Verificentros CDMX/EdoMex (sec. 14-15)**: la señal de mayor valor por vehículo que NO está en el plan original. Revela odómetro real y cumplimiento continuo del dueño.

3. **32 estados vs 6 estados**: los otros 26 son scrapers con el mismo patrón (placa + últimos 4-5 de VIN). Lift bajo, duplica cobertura.

4. **Carfax MX**: competidor + posible partner. Aproximar temprano.

5. **PROFECO Alertas**: faltaba en el plan; es el canal oficial MX de recalls.

6. **Buró de Crédito es por RFC, no VIN**: solo útil si tenemos RFC del vendedor. Puede ser un add-on de "seller verification" en lugar de vehicle audit.

7. **OEM recall portals** complementan NHTSA (incluyen TSBs y campañas warranty que no siempre llegan a NHTSA).
