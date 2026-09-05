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
    'const api = import("@earendil-works/pi-coding-agent", { with: { type: "json" } });',
    'const api = require("@earendil-works/pi-coding-agent");',
    'export * from "@earendil-works/pi-coding-agent";',
    'export * as api from "@earendil-works/pi-coding-agent";',
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

test("treats mixed named clauses and empty imports as runtime dependencies", () => {
  for (const source of [
    'import { type Tool, runtimeValue } from "@earendil-works/pi-coding-agent";',
    'export { runtimeValue, type Tool } from "@earendil-works/pi-coding-agent";',
    'import {} from "@earendil-works/pi-coding-agent";',
  ]) {
    assert.equal(importsDependency(source, dep), true, source);
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
    'require?.("@earendil-works/pi-coding-agent");',
    'const api = import(specifier);',
    'const api = require(specifier);',
    'const api = import(`@earendil-works/pi-coding-agent`);',
    'const quotient = value / 2 / importExample;',
    'const importation = "from @earendil-works/pi-coding-agent";',
  ]) {
    assert.equal(importsDependency(source, dep), false, source);
  }
});

test("ignores quotes inside regex literals before later imports", () => {
  const source = `
    const quoted = /["']/g;
    const escaped = /foo\\/bar[\"']/i;
    import { Tool } from "@earendil-works/pi-coding-agent";
  `;
  assert.deepEqual(runtimeModuleSpecifiers(source), ["@earendil-works/pi-coding-agent"]);
  assert.equal(importsDependency(source, dep), true);
});

test("recognizes regex literals after expression operators before later imports", () => {
  const source = `
    const matcher = () => /["']/;
    const compared = value > /["']/.test(value);
    import { Tool } from "@earendil-works/pi-coding-agent";
  `;
  assert.deepEqual(runtimeModuleSpecifiers(source), ["@earendil-works/pi-coding-agent"]);
  assert.equal(importsDependency(source, dep), true);
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

test("returns unique runtime specifiers in first-seen order", () => {
  assert.deepEqual(
    runtimeModuleSpecifiers(`
      import "first";
      const again = require("first");
      export * from "second";
      import("first/subpath");
    `),
    ["first", "second", "first/subpath"],
  );
});

test("handles empty and non-string scanner inputs", () => {
  assert.deepEqual(runtimeModuleSpecifiers(""), []);
  assert.deepEqual(runtimeModuleSpecifiers(null), []);
  assert.deepEqual(runtimeModuleSpecifiers(undefined), []);
  assert.equal(importsDependency(false, dep), false);
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
  assert.equal(npmPackListing({ metadata: null, package: listing }), listing);
  assert.equal(npmPackListing([]), null);
  assert.equal(npmPackListing({}), null);
  assert.equal(npmPackListing(null), null);
  assert.equal(npmPackListing("invalid"), null);
});
