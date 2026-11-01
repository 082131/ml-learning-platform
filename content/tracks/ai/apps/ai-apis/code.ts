// Code for the AI APIs lesson. The SSE encoder and incremental parser, the network split and the timing model live
// in src/lib/ai/sse.ts (unit-tested); the reply text is scripted and the times follow the stated formula. The FastAPI
// and fetch samples follow the FastAPI, anthropic SDK 1.x and MDN docs and are not run here. The pure-Python runner
// was run with CPython 3.13 and its output copied here.
import { streamExperiment } from '@/lib/ai/sse';
import type { CodeExample } from '@/lib/types';

export const stream = streamExperiment('stream', {
  ttft: 1,
  tokensPerSecond: 40,
  outputTokens: 800,
  timeout: 15,
  pieces: 5,
});

export const serverCode: CodeExample = {
  id: 'fastapi-endpoint',
  language: 'python',
  source: `import json, logging
import anthropic
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

app = FastAPI()
client = anthropic.AsyncAnthropic(timeout=30.0, max_retries=2)  # key from ANTHROPIC_API_KEY

class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)

def sse(event, payload):
    return f"event: {event}\\ndata: {json.dumps(payload)}\\n\\n"

@app.post("/api/ask")
async def ask(req: AskRequest):  # invalid bodies get a 422 before this runs
    async def events():
        try:
            async with client.messages.stream(
                model="claude-opus-5-5",
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": req.question}],
            ) as stream:
                async for text in stream.text_stream:
                    yield sse("text_delta", {"text": text})
            yield sse("done", {})
        except anthropic.APIError:
            logging.exception("model call failed")
            yield sse("error", {"message": "The assistant is unavailable. Please try again."})

    return StreamingResponse(events(), media_type="text/event-stream")`,
  annotations: [
    {
      id: 'client',
      range: { line: 8 },
      kind: 'framework',
      title: 'AsyncAnthropic(timeout=30.0, max_retries=2)',
      what: 'One shared async client with a 30-second timeout and two automatic retries for 429 and 5xx errors.',
      why: 'The key is read from the server’s environment and never reaches the browser. Set a timeout: the default is minutes long.',
    },
    {
      id: 'model-validation',
      range: { line: 11 },
      kind: 'syntax',
      title: 'Field(min_length=1, max_length=2000)',
      what: 'The request must contain a question of 1 to 2000 characters.',
      why: 'Validation runs before any model call, so empty or huge inputs cost nothing and get a clear 422 error.',
    },
    {
      id: 'sse-helper',
      range: { line: 13 },
      kind: 'function',
      title: 'sse(event, payload)',
      what: 'Formats one server-sent event: an event line, a data line with JSON, and a blank line.',
      why: 'JSON in the data line keeps newlines and quotes in the text from breaking the format.',
    },
    {
      id: 'stream',
      range: { line: 20 },
      kind: 'framework',
      title: 'client.messages.stream(...)',
      what: 'Asks the provider to stream the reply as it is generated.',
      why: 'The first text reaches the user after the time to first token instead of after the whole reply.',
    },
    {
      id: 'forward',
      range: { line: 27 },
      kind: 'syntax',
      title: 'yield sse("text_delta", …)',
      what: 'Forwards each piece of text to the browser as soon as it arrives.',
      why: 'Your server re-encodes the provider’s events in your own small format, so the frontend doesn’t depend on one provider.',
    },
    {
      id: 'error',
      range: { line: 29 },
      kind: 'syntax',
      title: 'except anthropic.APIError',
      what: 'If the provider fails after the SDK’s retries, log the details and send the browser a short error event.',
      why: 'The HTTP status was already sent as 200 when streaming began, so errors mid-stream must travel as events.',
    },
    {
      id: 'media-type',
      range: { line: 33 },
      kind: 'framework',
      title: 'media_type="text/event-stream"',
      what: 'Marks the response as an SSE stream.',
      why: 'Some proxies buffer other content types, which would deliver the whole stream at once at the end.',
    },
  ],
};

export const clientCode: CodeExample = {
  id: 'fetch-stream',
  language: 'typescript',
  source: `const res = await fetch('/api/ask', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question }),
  signal: AbortSignal.timeout(60_000),
});
if (!res.ok || !res.body) throw new Error(\`HTTP \${res.status}\`);

const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
const parser = new SseParser();
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  for (const event of parser.feed(value)) {
    if (event.event === 'text_delta') answer.textContent += JSON.parse(event.data).text;
    if (event.event === 'error') showRetryButton(JSON.parse(event.data).message);
  }
}`,
  annotations: [
    {
      id: 'own-endpoint',
      range: { line: 1 },
      kind: 'syntax',
      title: "fetch('/api/ask')",
      what: 'The browser calls your server, never the model provider.',
      why: 'No key in the browser, and your server can validate, rate-limit and log every request.',
    },
    {
      id: 'timeout',
      range: { line: 5 },
      kind: 'parameter',
      title: 'AbortSignal.timeout(60_000)',
      what: 'Gives up on the whole request after 60 seconds.',
      why: 'Without a limit, a stalled connection leaves the user waiting forever.',
    },
    {
      id: 'reader',
      range: { line: 9 },
      kind: 'framework',
      title: 'pipeThrough(new TextDecoderStream())',
      what: 'Turns the response body into a stream of text pieces as they arrive.',
      why: 'EventSource, the browser’s built-in SSE client, only supports GET without a body, so POST requests read the stream with fetch.',
    },
    {
      id: 'feed',
      range: { line: 14 },
      kind: 'function',
      title: 'parser.feed(value)',
      what: 'The incremental parser from the experiment: it returns only the events that are complete so far.',
      why: 'A network piece can end in the middle of a line. Parsing each piece on its own would break.',
    },
  ],
};

export const sseRunner: CodeExample = {
  id: 'sse-runner',
  language: 'python',
  run: 'pyodide',
  source: `import json


def parse_sse(pieces):
    """Yields (event, data) pairs from SSE text that arrives in arbitrary pieces."""
    buffer, event, data = "", "message", []
    for piece in pieces:
        buffer += piece
        while "\\n" in buffer:
            line, buffer = buffer.split("\\n", 1)
            if line == "":
                if data:
                    yield event, "\\n".join(data)
                event, data = "message", []
            elif line.startswith("event:"):
                event = line[6:].removeprefix(" ")
            elif line.startswith("data:"):
                data.append(line[5:].removeprefix(" "))


wire = (
    'event: text_delta\\ndata: {"text": "Error E-402"}\\n\\n'
    'event: text_delta\\ndata: {"text": " means your quota is full."}\\n\\n'
    'event: message_stop\\ndata: {}\\n\\n'
)
pieces = [wire[:30], wire[30:71], wire[71:]]      # cut mid-line, like network packets
for event, data in parse_sse(pieces):
    print(event, json.loads(data))`,
  annotations: [],
  expectedOutput: `text_delta {'text': 'Error E-402'}
text_delta {'text': ' means your quota is full.'}
message_stop {}`,
};
