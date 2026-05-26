import { makeOemRecallWorker } from './_shared';

// Stellantis (Mopar) — Jeep/RAM/Dodge/Chrysler/Fiat. NHTSA backbone + mopar.com portal.
export const stellantisRecallWorker = makeOemRecallWorker({
  key: 'oem_stellantis',
  url: 'https://www.mopar.com/en-us/care/recall-info.html',
  makes: ['JEEP', 'RAM', 'DODGE', 'CHRYSLER', 'FIAT'],
  proxy: 'residential',
});
