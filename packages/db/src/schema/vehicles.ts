import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Denormalized canonical record per VIN. Used to deduplicate report work
 * and to cross-reference plate ↔ VIN ↔ historical aliases over time.
 */
export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    vin: text('vin').unique(),
    make: text('make'),
    model: text('model'),
    year: integer('year'),
    trim: text('trim'),
    bodyClass: text('body_class'),
    engine: text('engine'),
    transmission: text('transmission'),
    fuelType: text('fuel_type'),
    driveType: text('drive_type'),
    plantCountry: text('plant_country'),
    plantState: text('plant_state'),
    plantCity: text('plant_city'),
    manufacturer: text('manufacturer'),
    gvwrLb: integer('gvwr_lb'),
    decodedData: jsonb('decoded_data').$type<Record<string, unknown>>(),
    knownPlatesMx: jsonb('known_plates_mx').$type<Array<{ plate: string; state: string; seenAt: string }>>(),
    knownPlatesUs: jsonb('known_plates_us').$type<Array<{ plate: string; state: string; seenAt: string }>>(),
    isChocolate: text('is_chocolate'),
    importPedimento: text('import_pedimento'),
    importYear: integer('import_year'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('vehicles_vin_idx').on(t.vin),
    index('vehicles_make_model_year_idx').on(t.make, t.model, t.year),
  ],
);

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
