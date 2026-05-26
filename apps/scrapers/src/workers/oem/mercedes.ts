import { makeOemRecallWorker } from './_shared';

// Merc-Benz USA. NHTSA backbone + mbusa.com portal.
export const mercedesRecallWorker = makeOemRecallWorker({
  key: 'oem_mercedes',
  url: 'https://www.mbusa.com/en/owners/recalls',
  makes: ['MERCEDES-BENZ'],
});
