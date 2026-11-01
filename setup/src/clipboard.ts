import { writeSync } from "node:fs";

const COMMANDS: Readonly<Record<string, readonly (readonly string[])[]>> = {
  darwin: [["pbcopy"]],
  win32: [["clip"]],
  linux: [["wl-copy"], ["xclip", "-selection", "clipboard"], ["xsel", "--clipboard", "--input"]],
};

export function osc52(text: string): string {
  return `\u001B]52;c;${Buffer.from(text, "utf8").toString("base64")}\u0007`;
}

async function viaCommand(command: readonly string[], text: string): Promise<boolean> {
  const [bin, ...args] = command;
  if (!bin || !Bun.which(bin)) return false;
  const proc = Bun.spawn([bin, ...args], { stdin: "pipe", stdout: "ignore", stderr: "ignore" });
  proc.stdin.write(text);
  await proc.stdin.end();
  return (await proc.exited) === 0;
}

export async function copyText(text: string): Promise<void> {
  for (const command of COMMANDS[process.platform] ?? []) {
    if (await viaCommand(command, text)) return;
  }
  writeSync(1, osc52(text));
}
