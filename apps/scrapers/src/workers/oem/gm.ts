import { makeOemRecallWorker } from './_shared';

// General Motors — Chevrolet/GMC/Buick/Cadillac. NHTSA backbone (GM portal CDN-walled).
export const gmRecallWorker = makeOemRecallWorker({
  key: 'oem_gm',
  url: 'https://experience.gm.com/ownercenter/recalls',
  makes: ['CHEVROLET', 'GMC', 'BUICK', 'CADILLAC'],
  proxy: 'always',
});
