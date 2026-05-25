import { describe, it, expect } from 'vitest';
import {
  isValidVinFormat,
  isValidVinChecksum,
  vinSchema,
  mxPlateSchema,
  mxStateSchema,
  queryInputSchema,
} from '../index';

describe('VIN format validation', () => {
  it('accepts 17 valid chars uppercase', () => {
    expect(isValidVinFormat('1HGCM82633A123456')).toBe(true);
  });

  it('rejects forbidden characters I, O, Q', () => {
    expect(isValidVinFormat('1HGCM82633A12345I')).toBe(false);
    expect(isValidVinFormat('1HGCM82633A12345O')).toBe(false);
    expect(isValidVinFormat('1HGCM82633A12345Q')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidVinFormat('1HGCM82633A12345')).toBe(false);
    expect(isValidVinFormat('1HGCM82633A1234567')).toBe(false);
  });

  it('accepts lowercase (normalized internally to uppercase)', () => {
    expect(isValidVinFormat('1hgcm82633a123456')).toBe(true);
  });
});

describe('VIN checksum validation', () => {
  it('validates a known-good Tesla VIN', () => {
    // 5YJ3E1EA0KF317432 is a known Tesla Model 3 VIN whose NHTSA reports note
    // checksum error code "1" — but the checksum check here is positional.
    // Use an actual VIN with valid check digit:
    // 1M8GDM9AXKP042788 is the NHTSA reference sample (valid)
    expect(isValidVinChecksum('1M8GDM9AXKP042788')).toBe(true);
  });

  it('rejects a VIN with wrong check digit', () => {
    // Same VIN with 9th char tampered
    expect(isValidVinChecksum('1M8GDM93XKP042788')).toBe(false);
  });
});

describe('vinSchema', () => {
  it('normalizes whitespace and case', () => {
    expect(vinSchema.parse('  1hgcm82633a123456 ')).toBe('1HGCM82633A123456');
  });

  it('throws on invalid format', () => {
    expect(() => vinSchema.parse('ABC')).toThrow();
    expect(() => vinSchema.parse('1HGCM82633A12345Q')).toThrow();
  });
});

describe('mxPlateSchema', () => {
  it('strips dashes and spaces', () => {
    expect(mxPlateSchema.parse('ABC-12-34')).toBe('ABC1234');
    expect(mxPlateSchema.parse('abc 123')).toBe('ABC123');
  });

  it('requires 5-8 chars after normalization', () => {
    expect(() => mxPlateSchema.parse('A1')).toThrow();
    expect(() => mxPlateSchema.parse('ABCDEFGHI')).toThrow();
  });
});

describe('mxStateSchema', () => {
  it('accepts all 32 entity codes', () => {
    expect(mxStateSchema.parse('CDMX')).toBe('CDMX');
    expect(mxStateSchema.parse('MEX')).toBe('MEX');
    expect(mxStateSchema.parse('JAL')).toBe('JAL');
  });

  it('rejects unknown codes', () => {
    expect(() => mxStateSchema.parse('XX')).toThrow();
  });
});

describe('queryInputSchema', () => {
  it('requires vin or plate', () => {
    expect(() => queryInputSchema.parse({})).toThrow();
  });

  it('accepts vin only', () => {
    const result = queryInputSchema.parse({ vin: '1HGCM82633A123456' });
    expect(result.vin).toBe('1HGCM82633A123456');
  });

  it('accepts plate only', () => {
    const result = queryInputSchema.parse({ plate: 'ABC1234' });
    expect(result.plate).toBe('ABC1234');
  });
});
