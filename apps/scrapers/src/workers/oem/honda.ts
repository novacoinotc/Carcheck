import { makeOemRecallWorker } from './_shared';

// Honda Motor Co. — covers Honda + Acura. NHTSA backbone + owners.honda.com portal.
export const hondaRecallWorker = makeOemRecallWorker({
  key: 'oem_honda',
  url: 'https://owners.honda.com/recalls',
  makes: ['HONDA', 'ACURA'],
});
