import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const verifier = fileURLToPath(new URL("./verify-pi-package-contract.mjs", import.meta.url));

function basePackage() {
  return {
    name: "pi-contract-fixture",
    version: "1.0.0",
    description: "A useful Pi package fixture with enough detail for gallery validation.",
    keywords: ["pi-package"],
    author: "Test Author",
    license: "MIT",
    repository: "https://example.com/pi-contract-fixture.git",
    homepage: "https://example.com/pi-contract-fixture",
    bugs: "https://example.com/pi-contract-fixture/issues",
    files: ["extensions", "README.md"],
    pi: {
      extensions: ["extensions/index.js"],
      image: "https://example.com/preview.png",
    },
    peerDependencies: {
      "@earendil-works/pi-coding-agent": "*",
    },
  };
}

function createFixture(t) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pi-package-contract-"));
  const packageRoot = path.join(fixtureRoot, "package");
  fs.mkdirSync(path.join(packageRoot, "extensions"), { recursive: true });
  fs.writeFileSync(path.join(packageRoot, "README.md"), "# Fixture\n");
  fs.writeFileSync(
    path.join(packageRoot, "extensions", "index.js"),
    'import "./helper.js";\nimport { Tool } from "@earendil-works/pi-coding-agent";\n',
  );
  fs.writeFileSync(path.join(packageRoot, "extensions", "helper.ts"), "export const helper = true;\n");
  fs.writeFileSync(path.join(packageRoot, "package.json"), `${JSON.stringify(basePackage(), null, 2)}\n`);
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));
  return { fixtureRoot, packageRoot };
}

function readPackage(packageRoot) {
  return JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
}

function updatePackage(packageRoot, mutate) {
  const pkg = readPackage(packageRoot);
  mutate(pkg);
  fs.writeFileSync(path.join(packageRoot, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);
}

function writeFixtureFile(packageRoot, relativePath, contents) {
  const target = path.join(packageRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function runVerifier(packageRoot, options = {}) {
  const result = spawnSync(process.execPath, [verifier, packageRoot], {
    encoding: "utf8",
    env: options.env,
    timeout: 15_000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
  };
}

function assertFailed(result, ...messages) {
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Pi package contract FAILED/);
  for (const message of messages) assert.match(result.output, message);
}

test("accepts a complete package and traverses packed local runtime modules", (t) => {
  const { packageRoot } = createFixture(t);
  const result = runVerifier(packageRoot);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Pi package contract OK: pi-contract-fixture@1\.0\.0/);
  assert.match(result.output, /2 runtime modules traversed from pi\.extensions/);
});

test("accepts descriptions at both inclusive length boundaries", (t) => {
  const minimum = createFixture(t);
  updatePackage(minimum.packageRoot, (pkg) => {
    pkg.description = "x".repeat(40);
  });
  assert.equal(runVerifier(minimum.packageRoot).status, 0);

  const maximum = createFixture(t);
  updatePackage(maximum.packageRoot, (pkg) => {
    pkg.description = "x".repeat(240);
  });
  assert.equal(runVerifier(maximum.packageRoot).status, 0);
});

test("supports positive and negative globs while resolving directory index modules", (t) => {
  const { packageRoot } = createFixture(t);
  fs.writeFileSync(path.join(packageRoot, "extensions", "index.js"), 'import "./nested";\n');
  writeFixtureFile(packageRoot, "extensions/nested/index.ts", "export const nested = true;\n");
  writeFixtureFile(
    packageRoot,
    "extensions/private.js",
    'import "@earendil-works/pi-ai";\n',
  );
  updatePackage(packageRoot, (pkg) => {
    pkg.pi.extensions = ["extensions/**/*.js", "!extensions/private.js"];
    pkg.pi.image = "https://example.com/preview.JPG?raw=1";
    delete pkg.peerDependencies;
  });

  const result = runVerifier(packageRoot);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /2 runtime modules traversed from pi\.extensions/);
});

test("returns exit code 2 when package.json is absent", (t) => {
  const { packageRoot } = createFixture(t);
  fs.rmSync(path.join(packageRoot, "package.json"));

  const result = runVerifier(packageRoot);

  assert.equal(result.status, 2, result.output);
  assert.match(result.output, /package\.json not found/);
});

test("reports package metadata and manifest violations together", (t) => {
  const { packageRoot } = createFixture(t);
  updatePackage(packageRoot, (pkg) => {
    pkg.name = "@groeponline/invalid";
    pkg.private = true;
    pkg.description = "too short";
    pkg.keywords = ["pi-package"];
    delete pkg.author;
    delete pkg.license;
    delete pkg.repository;
    delete pkg.homepage;
    delete pkg.bugs;
    delete pkg.publishConfig;
    delete pkg.pi;
  });

  assertFailed(
    runVerifier(packageRoot),
    /package must not be private/,
    /GroepOnline packages must include the "groeponline" keyword/,
    /description must be 40-240 characters/,
    /missing package metadata: author/,
    /missing package metadata: license/,
    /missing package metadata: repository/,
    /missing package metadata: homepage/,
    /missing package metadata: bugs/,
    /publishConfig\.access = "public"/,
    /explicit pi manifest is required/,
    /pi manifest must expose at least one/,
    /requires pi\.video or pi\.image/,
  );
});

test("validates preview URL protocols and media formats", (t) => {
  const { packageRoot } = createFixture(t);
  updatePackage(packageRoot, (pkg) => {
    pkg.pi.image = "http://example.com/preview.svg";
    pkg.pi.video = "not-an-absolute-url";
  });

  assertFailed(
    runVerifier(packageRoot),
    /pi\.image must use HTTPS/,
    /pi\.image has unsupported format \.svg/,
    /pi\.video must be an absolute HTTPS URL/,
  );
});

test("rejects a missing same-repository raw preview asset", (t) => {
  const { fixtureRoot, packageRoot } = createFixture(t);
  const bin = path.join(fixtureRoot, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "git"), '#!/bin/sh\nprintf "%s\\n" "$PI_CONTRACT_TEST_GIT_ROOT"\n');
  fs.chmodSync(path.join(bin, "git"), 0o755);
  updatePackage(packageRoot, (pkg) => {
    pkg.pi.image = "https://raw.githubusercontent.com/example/project/main/docs/missing.png";
  });

  assertFailed(
    runVerifier(packageRoot, {
      env: {
        ...process.env,
        PATH: `${bin}${path.delimiter}${process.env.PATH}`,
        PI_CONTRACT_TEST_GIT_ROOT: packageRoot,
      },
    }),
    /pi\.image points at a same-repo raw asset that does not exist: docs\/missing\.png/,
  );
});

test("rejects invalid, escaping, and unmatched resource patterns", (t) => {
  const { packageRoot } = createFixture(t);
  updatePackage(packageRoot, (pkg) => {
    pkg.pi.extensions = [null, "../outside.js", "/absolute.js", "missing.js", "extensions/*.tsx"];
  });

  assertFailed(
    runVerifier(packageRoot),
    /pi\.extensions contains an invalid resource path/,
    /pi\.extensions resource escapes package root: \.\.\/outside\.js/,
    /pi\.extensions resource escapes package root: \/absolute\.js/,
    /pi\.extensions resource does not exist after build: missing\.js/,
    /pi\.extensions resource glob matches nothing: extensions\/\*\.tsx/,
    /pi\.extensions resolves to no packaged files after exclusions/,
  );
});

test("rejects resource declarations that are not arrays", (t) => {
  const { packageRoot } = createFixture(t);
  updatePackage(packageRoot, (pkg) => {
    pkg.pi.extensions = "extensions/index.js";
  });

  assertFailed(
    runVerifier(packageRoot),
    /pi\.extensions must be an array when present/,
    /pi manifest must expose at least one extension, skill, prompt, or theme resource/,
  );
});

test("applies negative resource globs and rejects an empty result", (t) => {
  const { packageRoot } = createFixture(t);
  updatePackage(packageRoot, (pkg) => {
    pkg.pi.extensions = ["extensions/*.js", "!extensions/*.js"];
  });

  assertFailed(
    runVerifier(packageRoot),
    /pi\.extensions resolves to no packaged files after exclusions/,
    /pi manifest must resolve to at least one packaged Pi resource/,
  );
});

test("rejects resources that resolve through a symlink outside the package", (t) => {
  const { fixtureRoot, packageRoot } = createFixture(t);
  const outside = path.join(fixtureRoot, "outside.js");
  fs.writeFileSync(outside, "export default true;\n");
  fs.symlinkSync(outside, path.join(packageRoot, "extensions", "outside.js"));
  updatePackage(packageRoot, (pkg) => {
    pkg.pi.extensions = ["extensions/outside.js"];
  });

  assertFailed(
    runVerifier(packageRoot),
    /resource resolves through a symlink outside package root: extensions\/outside\.js/,
  );
});

test("requires resolved resources and README to be present in the tarball", (t) => {
  const { packageRoot } = createFixture(t);
  fs.rmSync(path.join(packageRoot, "README.md"));
  updatePackage(packageRoot, (pkg) => {
    pkg.files = [];
  });

  assertFailed(
    runVerifier(packageRoot),
    /npm tarball is missing README/,
    /pi\.extensions resource file is not present in npm tarball: extensions\/index\.js/,
  );
});

test("enforces Pi core dependency placement and wildcard peer ranges", (t) => {
  const { packageRoot } = createFixture(t);
  updatePackage(packageRoot, (pkg) => {
    pkg.peerDependencies["@earendil-works/pi-coding-agent"] = "^1.0.0";
    pkg.dependencies = { "@earendil-works/pi-ai": "1.0.0" };
    pkg.bundledDependencies = ["@earendil-works/pi-tui"];
  });

  assertFailed(
    runVerifier(packageRoot),
    /Pi core peer @earendil-works\/pi-coding-agent must use "\*"/,
    /Pi core package @earendil-works\/pi-ai must not be in dependencies/,
    /Pi core package @earendil-works\/pi-tui must not be bundled/,
    /packed runtime imports @earendil-works\/pi-coding-agent; peerDependencies/,
  );
});

test("detects missing local modules throughout the runtime graph", (t) => {
  const { packageRoot } = createFixture(t);
  fs.writeFileSync(path.join(packageRoot, "extensions", "helper.ts"), 'import "./missing.js";\n');

  assertFailed(
    runVerifier(packageRoot),
    /packed runtime module extensions\/helper\.ts imports missing local module \.\/missing\.js/,
  );
});

test("requires third-party typebox imports to be regular dependencies", (t) => {
  const { packageRoot } = createFixture(t);
  fs.writeFileSync(
    path.join(packageRoot, "extensions", "helper.ts"),
    'import { Type } from "@sinclair/typebox/value";\n',
  );

  assertFailed(
    runVerifier(packageRoot),
    /packed runtime imports @sinclair\/typebox;.*must be in dependencies/,
  );
});

test("requires extension resources to resolve to a runtime entrypoint", (t) => {
  const { packageRoot } = createFixture(t);
  writeFixtureFile(packageRoot, "extensions/notes.txt", "not executable\n");
  updatePackage(packageRoot, (pkg) => {
    pkg.pi.extensions = ["extensions/notes.txt"];
  });

  assertFailed(
    runVerifier(packageRoot),
    /pi\.extensions declares resources but resolves to no runtime module entrypoint/,
  );
});

test("accepts a skill-only package without runtime entrypoints", (t) => {
  const { packageRoot } = createFixture(t);
  writeFixtureFile(packageRoot, "skills/example/SKILL.md", "# Example skill\n");
  updatePackage(packageRoot, (pkg) => {
    pkg.files = ["skills", "README.md"];
    pkg.pi = {
      skills: ["skills"],
      image: "https://example.com/preview.webp",
    };
    delete pkg.peerDependencies;
  });

  const result = runVerifier(packageRoot);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /0 runtime modules traversed from pi\.extensions/);
});
