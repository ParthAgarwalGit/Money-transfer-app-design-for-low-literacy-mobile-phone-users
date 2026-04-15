import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const htmlPath = new URL("prototypes.html", root);
const packageJsonPath = new URL("package.json", root);
const serverPath = new URL("server.mjs", root);
const readmePath = new URL("README.md", root);
const keysExamplePath = new URL("keys.example.env", root);
const gitignorePath = new URL(".gitignore", root);

assert.equal(existsSync(packageJsonPath), true, "Missing package.json");
assert.equal(existsSync(serverPath), true, "Missing server.mjs");
assert.equal(existsSync(readmePath), true, "Missing README.md");
assert.equal(existsSync(keysExamplePath), true, "Missing keys.example.env");
assert.equal(existsSync(gitignorePath), true, "Missing .gitignore");

const html = readFileSync(htmlPath, "utf8");
const packageJson = readFileSync(packageJsonPath, "utf8");
const server = readFileSync(serverPath, "utf8");
const readme = readFileSync(readmePath, "utf8");
const gitignore = readFileSync(gitignorePath, "utf8");

const requiredHtmlChecks = [
  ["shared voice capture hook", /function useVoiceCapture\s*\(/],
  ["tts proxy client helper", /\/api\/tts/],
  ["runtime diagnostics component", /function RuntimeDiagnosticsPanel\s*\(/],
  ["microphone preflight helper", /async function ensureMicrophoneAccess\s*\(/],
  ["four-language spoken repeat helper", /function buildRepeatedSpeech\s*\(/],
  ["english repeated speech entry", /code:\s*'en'/],
  ["dynamic c2 speech builder", /function buildC2SpeechCopy\s*\(/],
  ["c2 uses pin step", /const steps = \["Call", "Menu", "Who", "Amount", "Confirm", "PIN", "Done"\]/],
  ["b2 silence countdown", /const \[silenceCountdown, setSilenceCountdown\] = useState\(10\)/],
  ["b5 silence countdown", /const \[silenceCountdown, setSilenceCountdown\] = useState\(10\)/],
  ["c3r cancelled result state", /const \[resultType, setResultType\] = useState\('sent'\)/],
  ["c3r timeout cancellation copy", /No tap = cancel/],
  ["diagnostics visible status text", /TTS status/],
  ["persistence store", /const cbcStore = \(\(\) => \{/],
  ["indic digit normalization", /function normalizeDigitsToAscii\s*\(/],
  ["stt multi-alternatives", /maxAlternatives\s*=\s*5/],
  ["b2 hard recording cap", /120000/],
];

for (const [label, pattern] of requiredHtmlChecks) {
  assert.match(html, pattern, `Missing ${label}`);
}

const forbiddenHtmlChecks = [
  ["voice passphrase step", /Voice Passphrase/],
  ["voice auth step label", /Voice Auth/],
  ["passphrase copy key", /passphrase:/],
];

for (const [label, pattern] of forbiddenHtmlChecks) {
  assert.doesNotMatch(html, pattern, `Unexpected ${label}`);
}

assert.match(packageJson, /"dev"\s*:\s*"node server\.mjs"/, "Missing dev script");
assert.match(packageJson, /"test"\s*:\s*"node tests\/prototype-hardening\.test\.mjs"/, "Missing test script");

assert.match(server, /\/api\/tts/, "Server must expose /api/tts");
assert.match(server, /gpt-4o-mini-tts/, "Server must use gpt-4o-mini-tts");
assert.match(server, /keys\.env/, "Server must read keys.env");

assert.match(readme, /localhost:3000/, "README should document localhost usage");
assert.match(readme, /npm\.cmd run dev/, "README should include Windows PowerShell npm.cmd guidance");
assert.match(readme, /keys\.env/, "README should document keys.env setup");

assert.match(gitignore, /keys\.env/, ".gitignore must exclude keys.env");

console.log("prototype hardening smoke test passed");
