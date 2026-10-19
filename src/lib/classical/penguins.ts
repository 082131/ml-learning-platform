// The Palmer penguins dataset (CC0), bundled unmodified. Source and citation: ./data/SOURCE.md.
import raw from './data/penguins.csv?raw';

export type Species = 'Adelie' | 'Chinstrap' | 'Gentoo';
export const SPECIES: readonly Species[] = ['Adelie', 'Chinstrap', 'Gentoo'];

/** One row of penguins.csv. Missing values (`NA` in the file) are null. */
export interface Penguin {
  /** 0-based position in the file (row 1 of the CSV after the header is 0), as pandas numbers rows. */
  row: number;
  species: Species;
  island: 'Biscoe' | 'Dream' | 'Torgersen';
  bill_length_mm: number | null;
  bill_depth_mm: number | null;
  flipper_length_mm: number | null;
  body_mass_g: number | null;
  sex: 'male' | 'female' | null;
  year: number;
}

export const NUMERIC_COLUMNS = [
  'bill_length_mm',
  'bill_depth_mm',
  'flipper_length_mm',
  'body_mass_g',
] as const;
export type NumericColumn = (typeof NUMERIC_COLUMNS)[number];

const num = (v: string) => (v === 'NA' ? null : Number(v));

/** Parses the CSV text. Exported for tests; lessons use `PENGUINS`. */
export function parsePenguins(text: string): Penguin[] {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const expected = 'species,island,bill_length_mm,bill_depth_mm,flipper_length_mm,body_mass_g,sex,year';
  if (header !== expected) throw new Error(`Unexpected penguins.csv header: ${header}`);
  return lines.map((line, row) => {
    const [species, island, bl, bd, fl, bm, sex, year] = line.split(',');
    return {
      row,
      species: species as Species,
      island: island as Penguin['island'],
      bill_length_mm: num(bl!),
      bill_depth_mm: num(bd!),
      flipper_length_mm: num(fl!),
      body_mass_g: num(bm!),
      sex: sex === 'NA' ? null : (sex as 'male' | 'female'),
      year: Number(year),
    };
  });
}

/** All 344 rows, in file order. */
export const PENGUINS: readonly Penguin[] = parsePenguins(raw);

/** Rows where every listed column has a value. */
export function complete(rows: readonly Penguin[], columns: readonly (keyof Penguin)[]): Penguin[] {
  return rows.filter((r) => columns.every((c) => r[c] !== null));
}

/** The values of a numeric column, skipping missing ones (as pandas' describe() does). */
export function column(rows: readonly Penguin[], c: NumericColumn): number[] {
  return rows.flatMap((r) => (r[c] === null ? [] : [r[c]]));
}
