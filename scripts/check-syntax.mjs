// Verifica la sintaxis de todos los modulos JS del frontend con el analizador de Node.
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])));
  return files.flat().filter((f) => f.endsWith(".js") || f.endsWith(".mjs"));
}

const files = [...(await walk("js")), "server.mjs", "config.js"];
let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    failed++;
    console.error(`ERROR ${file}\n${result.stderr}`);
  }
}
console.log(`${files.length - failed}/${files.length} archivos sin errores de sintaxis`);
process.exit(failed ? 1 : 0);
