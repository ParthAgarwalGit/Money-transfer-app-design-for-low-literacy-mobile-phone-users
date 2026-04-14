import { createReadStream, existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { createServer } from "node:http";

const cwd = process.cwd();
const port = Number(process.env.PORT || 3000);
const rootFile = resolve(cwd, "prototypes.html");
const keysEnvPath = resolve(cwd, "keys.env");
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function readEnvFile(filepath) {
  if (!existsSync(filepath)) return {};
  const source = readFileSync(filepath, "utf8");
  return source.split(/\r?\n/).reduce((acc, rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return acc;
    const sep = line.indexOf("=");
    if (sep === -1) return acc;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    acc[key] = value;
    return acc;
  }, {});
}

const envFromFile = readEnvFile(keysEnvPath);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || envFromFile.OPENAI_API_KEY || "";

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function getVoiceForLanguage(lang) {
  switch ((lang || "").toLowerCase()) {
    case "hi":
    case "mr":
      return "cedar";
    case "bn":
      return "marin";
    case "en":
    default:
      return "coral";
  }
}

function getInstructionsForLanguage(lang) {
  switch ((lang || "").toLowerCase()) {
    case "hi":
      return "Speak clearly in Hindi with a calm, accessible IVR style.";
    case "bn":
      return "Speak clearly in Bengali with a calm, accessible IVR style.";
    case "mr":
      return "Speak clearly in Marathi with a calm, accessible IVR style.";
    case "en":
    default:
      return "Speak clearly in Indian English with a calm, accessible IVR style.";
  }
}

async function handleTts(req, res) {
  if (!OPENAI_API_KEY) {
    return json(res, 503, {
      error: "missing_api_key",
      message: "OPENAI_API_KEY is missing from keys.env or the environment.",
    });
  }

  let payload;
  try {
    const body = await new Promise((resolveBody, rejectBody) => {
      let raw = "";
      req.on("data", chunk => {
        raw += chunk;
        if (raw.length > 1_000_000) {
          rejectBody(new Error("Body too large"));
          req.destroy();
        }
      });
      req.on("end", () => resolveBody(raw));
      req.on("error", rejectBody);
    });
    payload = JSON.parse(body || "{}");
  } catch (error) {
    return json(res, 400, { error: "bad_json", message: "Invalid JSON payload." });
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const lang = typeof payload.lang === "string" ? payload.lang.trim() : "en";
  const purpose = typeof payload.purpose === "string" ? payload.purpose.trim() : "prompt";

  if (!text) {
    return json(res, 400, { error: "missing_text", message: "Request must include text." });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: getVoiceForLanguage(lang),
        input: text,
        instructions: `${getInstructionsForLanguage(lang)} Purpose: ${purpose}.`,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      return json(res, response.status, {
        error: "tts_failed",
        message: message.slice(0, 400),
      });
    }

    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    });
    response.body.pipeTo(
      new WritableStream({
        write(chunk) {
          res.write(Buffer.from(chunk));
        },
        close() {
          res.end();
        },
        abort(error) {
          res.destroy(error);
        },
      }),
    ).catch(error => {
      if (!res.headersSent && !res.writableEnded) {
        json(res, 500, { error: "stream_failed", message: String(error.message || error) });
      } else if (!res.writableEnded) {
        res.destroy(error);
      }
    });
  } catch (error) {
    return json(res, 502, {
      error: "network_error",
      message: String(error.message || error),
    });
  }
}

function serveFile(res, filepath) {
  const ext = extname(filepath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
  createReadStream(filepath).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "POST" && url.pathname === "/api/tts") {
    return handleTts(req, res);
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, {
      ok: true,
      secureContextHint: "Open http://localhost:3000 in Chrome or Edge.",
      hasOpenAiKey: Boolean(OPENAI_API_KEY),
    });
  }

  if (req.method !== "GET") {
    return json(res, 405, { error: "method_not_allowed" });
  }

  const requestPath = url.pathname === "/" ? rootFile : resolve(cwd, `.${url.pathname}`);
  if (existsSync(requestPath) && requestPath.startsWith(cwd)) {
    return serveFile(res, requestPath);
  }

  if (existsSync(rootFile)) {
    return serveFile(res, rootFile);
  }

  json(res, 404, { error: "not_found" });
});

server.listen(port, () => {
  console.log(`Claude Builder Club running at http://localhost:${port}`);
});
