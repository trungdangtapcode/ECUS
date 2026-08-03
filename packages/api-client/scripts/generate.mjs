import { readFile, writeFile } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";

const input = new URL("../openapi.json", import.meta.url);
const output = new URL("../src/schema.d.ts", import.meta.url);
const content = astToString(await openapiTS(input));
if (process.argv.includes("--check")) {
  if ((await readFile(output, "utf8")) !== content) {
    throw new Error("Generated API types are stale. Run npm run api:generate.");
  }
} else {
  await writeFile(output, content);
}
