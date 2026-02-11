declare module "sql.js" {
  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => Database;
  }
  export interface Database {
    run(sql: string, params?: unknown[]): void;
    exec(sql: string): unknown;
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }
  export interface Statement {
    bind(values: unknown[]): void;
    run(params?: unknown[]): void;
    step(): boolean;
    get(): unknown[];
    free(): void;
  }
  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
  }): Promise<SqlJsStatic>;
}
