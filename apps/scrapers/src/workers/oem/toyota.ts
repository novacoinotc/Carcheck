import { makeOemRecallWorker } from './_shared';

// Toyota Motor — covers Toyota + Lexus + Scion. NHTSA backbone + toyota.com portal.
export const toyotaRecallWorker = makeOemRecallWorker({
  key: 'oem_toyota',
  url: 'https://www.toyota.com/recall/',
  makes: ['TOYOTA', 'LEXUS', 'SCION'],
});
