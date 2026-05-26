import { makeOemRecallWorker } from './_shared';

// Nissan — covers Nissan + Infiniti. Portal takes VIN as query param.
export const nissanRecallWorker = makeOemRecallWorker({
  key: 'oem_nissan',
  url: 'https://owners.nissanusa.com/nowners/vinlookup/vinlookupresults',
  makes: ['NISSAN', 'INFINITI'],
  vinQueryParam: 'vin',
  proxy: 'residential',
});
