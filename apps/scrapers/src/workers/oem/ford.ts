import { makeOemRecallWorker } from './_shared';

// Ford Motor Company — covers Ford + Lincoln. NHTSA backbone (ford.com blocks DC IPs).
export const fordRecallWorker = makeOemRecallWorker({
  key: 'oem_ford',
  url: 'https://www.ford.com/support/recalls/',
  makes: ['FORD', 'LINCOLN'],
});
