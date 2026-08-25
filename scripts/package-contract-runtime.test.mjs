import assert from "node:assert/strict";
import test from "node:test";
import { importsDependency, npmPackListing, runtimeModuleSpecifiers } from "./package-contract-runtime.mjs";

const dep = "@earendil-works/pi-coding-agent";

test("detects runtime module syntax including compact and multiline forms", () => {
  for (const source of [
    'import { Tool } from "@earendil-works/pi-coding-agent";',
    'import{Tool}from"@earendil-works/pi-coding-agent";',
    'import {\n Tool,\n} from "@earendil-works/pi-coding-agent";',
    'export { Tool } from "@earendil-works/pi-coding-agent";',
    'import "@earendil-works/pi-coding-agent";',
    'const api = await import("@earendil-works/pi-coding-agent");',
    'const api = require("@earendil-works/pi-coding-agent");',
  ]) {
    assert.equal(importsDependency(source, dep), true, source);
  }
});

test("ignores type-only imports and exports", () => {
  for (const source of [
    'import type { Tool } from "@earendil-works/pi-coding-agent";',
    'export type { Tool } from "@earendil-works/pi-coding-agent";',
    'import { type Tool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";',
    'export { type Tool } from "@earendil-works/pi-coding-agent";',
  ]) {
    assert.equal(importsDependency(source, dep), false, source);
  }
});

test("does not mistake a runtime binding named type for a type modifier", () => {
  for (const source of [
    'import { type as RuntimeType } from "@earendil-works/pi-coding-agent";',
    'export { type as RuntimeType } from "@earendil-works/pi-coding-agent";',
  ]) {
    assert.equal(importsDependency(source, dep), true, source);
  }
});

test("ignores comments, literal examples, and member methods", () => {
  for (const source of [
    '// import("@earendil-works/pi-coding-agent")',
    '/* require("@earendil-works/pi-coding-agent") */',
    'const text = \'require("@earendil-works/pi-coding-agent")\';',
    'const text = `import("@earendil-works/pi-coding-agent")`;',
    'loader.import("@earendil-works/pi-coding-agent");',
    'module.require("@earendil-works/pi-coding-agent");',
    'const importation = "from @earendil-works/pi-coding-agent";',
  ]) {
    assert.equal(importsDependency(source, dep), false, source);
  }
});

test("keeps local runtime specifiers for graph traversal", () => {
  assert.deepEqual(
    runtimeModuleSpecifiers(`
      import "./guardrails.ts";
      export { run } from './commands/run.ts';
      import type { Config } from './types.ts';
    `),
    ["./guardrails.ts", "./commands/run.ts"],
  );
});

test("matches dependency subpaths but not prefix collisions", () => {
  assert.equal(importsDependency(`import "${dep}/internal";`, dep), true);
  assert.equal(importsDependency(`import "${dep}-extra";`, dep), false);
});

test("reads npm pack --json from npm 10 arrays and npm 12 name maps", () => {
  const listing = { files: [{ path: "package.json" }, { path: "extensions/pi-control/index.ts" }] };
  assert.equal(npmPackListing([listing]), listing);
  assert.equal(npmPackListing({ "@groeponline/pi-control": listing }), listing);
  assert.equal(npmPackListing(listing), listing);
  assert.equal(npmPackListing({}), null);
});
