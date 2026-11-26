// The part of sql.js (1.16) this project uses. The package ships no types.
declare module 'sql.js' {
  export type BindValue = number | string | null | Uint8Array;
  export interface Statement {
    getColumnNames(): string[];
    step(): boolean;
    get(): BindValue[];
    getSQL(): string;
    free(): boolean;
  }
  export interface StatementIterator extends Iterable<Statement> {
    getRemainingSQL(): string;
  }
  export interface Database {
    exec(sql: string, params?: BindValue[]): { columns: string[]; values: BindValue[][] }[];
    run(sql: string, params?: BindValue[]): Database;
    iterateStatements(sql: string): StatementIterator;
    getRowsModified(): number;
    close(): void;
  }
  export interface SqlJsStatic {
    Database: new () => Database;
  }
  export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
}
