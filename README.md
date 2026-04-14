# Claude Builder Club

Voice-first wage-worker interaction prototypes with Chrome localhost speech input and OpenAI-backed multilingual TTS.

## What This Demo Includes

- Wage slip playback flows
- Grievance capture with transcript review
- Voice or keypad amount entry with explicit confirmation and PIN entry
- Weekly remittance reminder with timeout-driven cancellation
- Runtime diagnostics for microphone and TTS health

## Prerequisites

- Node.js 22+
- Google Chrome or Microsoft Edge
- A local `keys.env` file with `OPENAI_API_KEY`

## Setup

1. Copy `keys.example.env` to `keys.env`.
2. Add your OpenAI API key to `keys.env`.

## Run

1. Start the server:

```bash
npm.cmd run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge.
3. Grant microphone access when prompted.

## Test

```bash
npm.cmd test
```

## Important Usage Notes

- Voice input is supported only from a secure browser context. For this demo, use `http://localhost:3000`, not `file://`.
- Browser-native speech recognition can still vary by browser and OS, so the diagnostics panel is part of intended usage.
- Spoken prompts are AI-generated with OpenAI TTS. The UI explicitly discloses that these are synthetic voices.
- Use PowerShell with `npm.cmd`, not `npm`, if script execution is restricted on Windows.

## Project Files

- `prototypes.html`: the React-in-HTML demo surface
- `server.mjs`: localhost server and `/api/tts` proxy
- `tests/prototype-hardening.test.mjs`: smoke test for the prototype contract
