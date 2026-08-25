function isIdentifierStart(char) {
  return /[A-Za-z_$]/.test(char);
}

function isIdentifierPart(char) {
  return /[A-Za-z0-9_$]/.test(char);
}

function tokenize(source) {
  const text = String(source);
  const tokens = [];
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (/\s/.test(char)) {
      i += 1;
      continue;
    }

    if (char === "/" && text[i + 1] === "/") {
      i += 2;
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }

    if (char === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i = Math.min(text.length, i + 2);
      continue;
    }

    if (char === '"' || char === "'") {
      const quote = char;
      let value = "";
      i += 1;
      while (i < text.length) {
        const current = text[i];
        if (current === "\\" && i + 1 < text.length) {
          value += text[i + 1];
          i += 2;
          continue;
        }
        if (current === quote) {
          i += 1;
          break;
        }
        value += current;
        i += 1;
      }
      tokens.push({ type: "string", value });
      continue;
    }

    // Template literals are not valid static module specifiers. Skip their raw
    // text so examples such as `import("dep")` do not become false positives.
    if (char === "`") {
      i += 1;
      while (i < text.length) {
        if (text[i] === "\\" && i + 1 < text.length) {
          i += 2;
          continue;
        }
        if (text[i] === "`") {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (isIdentifierStart(char)) {
      let value = char;
      i += 1;
      while (i < text.length && isIdentifierPart(text[i])) {
        value += text[i];
        i += 1;
      }
      tokens.push({ type: "id", value });
      continue;
    }

    tokens.push({ type: "punct", value: char });
    i += 1;
  }

  return tokens;
}

function isDirectCall(tokens, index, name) {
  return (
    tokens[index]?.type === "id" &&
    tokens[index]?.value === name &&
    tokens[index - 1]?.value !== "." &&
    tokens[index + 1]?.value === "(" &&
    tokens[index + 2]?.type === "string"
  );
}

function namedClauseIsTypeOnly(tokens) {
  if (tokens[0]?.value !== "{") return false;
  const end = tokens.findIndex((token, index) => index > 0 && token.value === "}");
  if (end < 0) return false;
  const body = tokens.slice(1, end);
  if (body.length === 0) return false;

  const specifiers = [];
  let current = [];
  for (const token of body) {
    if (token.value === ",") {
      if (current.length) specifiers.push(current);
      current = [];
    } else {
      current.push(token);
    }
  }
  if (current.length) specifiers.push(current);
  if (specifiers.length === 0) return false;

  return specifiers.every((specifier) => {
    const first = specifier[0];
    const second = specifier[1];
    return first?.type === "id" && first.value === "type" && second?.value !== "as";
  });
}

function declarationSpecifier(tokens, start, keyword) {
  const next = tokens[start + 1];

  if (keyword === "import") {
    if (next?.value === ".") return null; // import.meta
    if (next?.value === "(" && tokens[start + 2]?.type === "string") {
      return { specifier: tokens[start + 2].value, runtime: true };
    }
    if (next?.type === "string") {
      return { specifier: next.value, runtime: true };
    }
  }

  const clause = [];
  for (let i = start + 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.value === ";") break;
    if (token.type === "id" && token.value === "from" && tokens[i + 1]?.type === "string") {
      const typeOnlyDeclaration = clause[0]?.type === "id" && clause[0].value === "type";
      const typeOnlyNamed = namedClauseIsTypeOnly(clause);
      return {
        specifier: tokens[i + 1].value,
        runtime: !typeOnlyDeclaration && !typeOnlyNamed,
      };
    }
    clause.push(token);
  }
  return null;
}

/** Return runtime module specifiers while ignoring comments and literal examples. */
export function runtimeModuleSpecifiers(text) {
  const tokens = tokenize(text);
  const found = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type !== "id") continue;

    if ((token.value === "import" || token.value === "export") && tokens[i - 1]?.value !== ".") {
      const result = declarationSpecifier(tokens, i, token.value);
      if (result?.runtime) found.push(result.specifier);
      continue;
    }

    if (isDirectCall(tokens, i, "require")) {
      found.push(tokens[i + 2].value);
    }
  }

  return [...new Set(found)];
}

export function importsDependency(text, dep) {
  return runtimeModuleSpecifiers(text).some(
    (specifier) => specifier === dep || specifier.startsWith(`${dep}/`),
  );
}

/** npm 10 returns an array of listings; npm 12 returns `{ [name]: listing }`. */
export function npmPackListing(parsed) {
  if (Array.isArray(parsed)) return parsed[0] ?? null;
  if (parsed && Array.isArray(parsed.files)) return parsed;
  if (parsed && typeof parsed === "object") {
    const listings = Object.values(parsed).filter(
      (value) => value && typeof value === "object" && Array.isArray(value.files),
    );
    return listings[0] ?? null;
  }
  return null;
}
