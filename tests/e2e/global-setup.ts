import { execFileSync } from "node:child_process";

export default function globalSetup() {
  execFileSync(process.execPath, ["tests/fixtures/generate.mjs"], { stdio: "inherit" });
}
