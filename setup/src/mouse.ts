import { EventEmitter } from "node:events";
import { writeSync } from "node:fs";
import { PassThrough } from "node:stream";
import { StringDecoder } from "node:string_decoder";

export type MouseInput = {
  readonly button: number;
  readonly x: number;
  readonly y: number;
  readonly release: boolean;
};

export const mouse = new EventEmitter();

const COMPLETE = /\u001B\[<(\d+);(\d+);(\d+)([Mm])/g;
const PARTIAL = /\u001B\[<[\d;]*$/;
const ENABLE = "\u001B[?1000h\u001B[?1006h";
const DISABLE = "\u001B[?1000l\u001B[?1006l";

export function splitMouse(buffer: string): { text: string; events: MouseInput[]; rest: string } {
  const events: MouseInput[] = [];
  const text = buffer.replace(COMPLETE, (_match, button: string, x: string, y: string, kind: string) => {
    events.push({ button: Number(button), x: Number(x) - 1, y: Number(y) - 1, release: kind === "m" });
    return "";
  });
  const partial = PARTIAL.exec(text);
  if (partial) return { text: text.slice(0, partial.index), events, rest: partial[0] };
  return { text, events, rest: "" };
}

function emit(event: MouseInput): void {
  if (event.button === 64) mouse.emit("wheel", -1);
  else if (event.button === 65) mouse.emit("wheel", 1);
  else if (!event.release && (event.button & 3) === 0 && event.button < 32) mouse.emit("press", event);
}

export function withMouse(tty: NodeJS.ReadStream): NodeJS.ReadStream {
  const out = new PassThrough();
  const decoder = new StringDecoder("utf8");
  let rest = "";
  tty.on("data", (chunk: Buffer | string) => {
    const result = splitMouse(rest + (typeof chunk === "string" ? chunk : decoder.write(chunk)));
    rest = result.rest;
    for (const event of result.events) emit(event);
    if (result.text) out.write(result.text);
  });
  const proxy = Object.assign(out, {
    isTTY: true,
    setRawMode(mode: boolean) {
      tty.setRawMode(mode);
      return proxy;
    },
    ref() {
      tty.ref();
      return proxy;
    },
    unref() {
      tty.unref();
      return proxy;
    },
  });
  return proxy as unknown as NodeJS.ReadStream;
}

let enabled = false;

export function enableMouse(): void {
  if (enabled) return;
  enabled = true;
  writeSync(1, ENABLE);
  process.once("exit", disableMouse);
}

export function disableMouse(): void {
  if (!enabled) return;
  enabled = false;
  writeSync(1, DISABLE);
}
