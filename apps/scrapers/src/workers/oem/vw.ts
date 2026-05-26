import { makeOemRecallWorker } from './_shared';

// Volkswagen of America. NHTSA backbone + vw.com portal.
export const vwRecallWorker = makeOemRecallWorker({
  key: 'oem_vw',
  url: 'https://www.vw.com/en/owners/safety-and-recalls.html',
  makes: ['VOLKSWAGEN'],
});
