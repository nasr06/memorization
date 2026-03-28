declare module "sql.js/dist/sql-asm.js" {
  import type { SqlJsStatic } from "sql.js";
  function initSqlJs(config?: Partial<import("sql.js").EmscriptenModule>): Promise<SqlJsStatic>;
  export default initSqlJs;
}
