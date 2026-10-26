import penguinsCsv from '../classical/data/penguins.csv?url';

/**
 * The address of the bundled penguins CSV on this site. Python lessons download it in the browser with
 * pyodide.http.open_url, because code in the Python runner has no access to the site's files otherwise.
 */
export const PENGUINS_URL =
  typeof document === 'undefined'
    ? `https://example.invalid/${penguinsCsv}`
    : new URL(penguinsCsv, document.baseURI).href;
