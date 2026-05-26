import { makeOemRecallWorker } from './_shared';

// BMW of North America — covers BMW + MINI. NHTSA backbone + bmwusa.com portal.
export const bmwRecallWorker = makeOemRecallWorker({
  key: 'oem_bmw',
  url: 'https://www.bmwusa.com/vehicles/bmwvalue/recall-information.html',
  makes: ['BMW', 'MINI'],
});
