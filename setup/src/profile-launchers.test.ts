import { afterEach, expect, test } from "bun:test";
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { prepareProfileArtifacts, type ProfileArtifact, writeProfileArtifacts } from "./profile-launchers.ts";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const GPT: ProfileArtifact = {
  name: "omo-gpt",
  main: { provider: "chatgpt-subscription", model: "gpt-6.1-sol", reasoning: "high" },
  value: { "[native]": { model_profile: "geeky-normal", categories: { quick: { model: "other/fast" } } } },
};
const CLAUDE: ProfileArtifact = {
  name: "omo-claude",
  main: { provider: "anthropic", model: "claude-opus-5-5" },
  value: { "[native]": { model_profile: "daily-normal" } },
};
const DEFAULTS = ["--model", "chatgpt-subscription/gpt-6.1-sol", "--thinking", "high"];

async function fixture() {
  const root = await mkdtemp(join(process.env.TMPDIR ?? "/tmp", "omo-profile-owner-"));
  roots.push(root);
  const home = join(root, "config");
  await mkdir(home);
  return {
    root, home, config: join(home, "omo.jsonc"), bin: join(home, "bin"),
    manifest: join(home, ".omo-start-profiles.json"),
  };
}

async function install(home: Awaited<ReturnType<typeof fixture>>, profiles: readonly ProfileArtifact[] = [GPT]) {
  const plan = await prepareProfileArtifacts(home.config, "", profiles);
  const paths = await writeProfileArtifacts(plan);
  // Simulates the parent's separate config apply; artifacts never write this file.
  const configText = JSON.stringify({ profiles: Object.fromEntries(profiles.map((profile) => [profile.name, profile.value])) });
  await writeFile(home.config, configText);
  return { paths, configText };
}

async function fakeOmo(home: Awaited<ReturnType<typeof fixture>>) {
  const fakeBin = join(home.root, "fake-bin");
  await mkdir(fakeBin);
  const fake = join(fakeBin, "omo");
  await writeFile(fake, `#!${process.execPath}
console.log(JSON.stringify({
  argv: process.argv.slice(2),
  profile: process.env.OMO_PROFILE,
  home: process.env.HOME,
  agent: process.env.OMO_CODING_AGENT_DIR,
  credential: process.env.ANTHROPIC_API_KEY,
  dispatch: process.argv[2],
}));
process.exit(Number(process.env.FAKE_EXIT ?? "0"));
`);
  await chmod(fake, 0o755);
  return async (name: string, args: readonly string[], exit = 0) => {
    const child = Bun.spawn([join(home.bin, name), ...args], {
      env: {
        ...process.env,
        PATH: `${fakeBin}:/usr/bin:/bin`,
        HOME: join(home.root, "inherited-home"),
        OMO_CODING_AGENT_DIR: join(home.root, "inherited-agent"),
        ANTHROPIC_API_KEY: "inherited-test-credential",
        OMO_PROFILE: "must-be-replaced",
        FAKE_EXIT: String(exit),
      },
      stdout: "pipe", stderr: "pipe",
    });
    const [stdout, stderr, status] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    expect(stderr).toBe("");
    return { output: JSON.parse(stdout), status };
  };
}

test("prepare is read-only and write creates executable launchers without shared config writes", async () => {
  const home = await fixture();
  const before = '{ // existing\n "unrelated": true,\n }';
  await writeFile(home.config, before);
  const plan = await prepareProfileArtifacts(home.config, before, [GPT, CLAUDE]);
  expect(await readdir(home.home)).toEqual(["omo.jsonc"]);
  expect(plan.binDir).toBe(home.bin);

  const paths = await writeProfileArtifacts(plan);

  expect(paths).toEqual([join(home.bin, GPT.name), join(home.bin, CLAUDE.name)]);
  for (const path of paths) expect((await lstat(path)).mode & 0o777).toBe(0o755);
  expect(await readFile(home.config, "utf8")).toBe(before);
  expect(JSON.parse(await readFile(home.manifest, "utf8")).profiles).toEqual({
    [GPT.name]: GPT.value, [CLAUDE.name]: CLAUDE.value,
  });
});

test("normal executable preserves literal arguments, inherited credentials and nonzero status", async () => {
  const home = await fixture();
  await install(home);
  const run = await fakeOmo(home);
  const prompt = `literal "quotes" 'single' $HOME $(touch ${join(home.root, "injected")}); \`id\`\nnext line`;

  const result = await run(GPT.name, ["-p", prompt, "--", "--model", "prompt-only"], 37);

  expect(result.status).toBe(37);
  expect(result.output).toEqual({
    argv: [...DEFAULTS, "-p", prompt, "--", "--model", "prompt-only"],
    profile: GPT.name,
    home: join(home.root, "inherited-home"),
    agent: join(home.root, "inherited-agent"),
    credential: "inherited-test-credential",
    dispatch: "--model",
  });
  expect(await readdir(home.root)).not.toContain("injected");
});

test("generated static provider and model are shell quoted and optional reasoning stays optional", async () => {
  const home = await fixture();
  const model = `model 'quote' "$(touch ${join(home.root, "injected")})"\nline`;
  const profile = { ...CLAUDE, main: { provider: "custom'provider", model } };
  await install(home, [profile]);
  const run = await fakeOmo(home);

  const result = await run(profile.name, ["hello"]);

  expect(result.output.argv).toEqual(["--model", `custom'provider/${model}`, "hello"]);
  expect(result.status).toBe(0);
  expect(await readdir(home.root)).not.toContain("injected");
});

test.each([
  ["--model", "other/model:low"],
  ["--provider", "other"],
  ["--models", "other/one:low,other/two:high"],
  ["--model=other/model:low"],
  ["--provider=other"],
  ["--models=other/*"],
].map((args) => ({ args })))("explicit selection %j suppresses both generated defaults", async ({ args }) => {
  const home = await fixture();
  await install(home);
  const run = await fakeOmo(home);
  const result = await run(GPT.name, [...args, "prompt"]);
  expect(result.output.argv).toEqual([...args, "prompt"]);
});

test.each([["--thinking", "low"], ["--thinking=off"]].map((args) => ({ args })))(
  "explicit thinking %j suppresses only generated thinking",
  async ({ args }) => {
    const home = await fixture();
    await install(home);
    const run = await fakeOmo(home);
    const result = await run(GPT.name, [...args, "prompt"]);
    expect(result.output.argv).toEqual(["--model", "chatgpt-subscription/gpt-6.1-sol", ...args, "prompt"]);
  },
);

test.each([
  ["ulw-loop", "status"], ["thread", "list"], ["daemon", "status"], ["doctor", "--models"],
  ["setup"], ["install", "./extension"], ["remove", "./extension"], ["uninstall"], ["update"],
  ["list"], ["config", "show"], ["auth", "check"], ["host", "status"], ["schedule", "list"],
  ["app-server"], ["models", "discover"], ["--help"], ["-h"], ["prompt", "--help"],
  ["login"], ["logout"], ["whoami"], ["sync"], ["account", "list"], ["remote", "list"],
  ["--version"], ["-v"],
].map((args) => ({ args })))("native command or help %j retains first-argument dispatch", async ({ args }) => {
  const home = await fixture();
  await install(home);
  const run = await fakeOmo(home);
  const result = await run(GPT.name, args);
  expect(result.output.argv).toEqual(args);
  expect(result.output.dispatch).toBe(args[0]);
  expect(result.output.profile).toBe(GPT.name);
});

test.each([
  ["models"], ["models", "not-discover"], ["prompt", "doctor"], ["--", "--help"],
  ["--", "--thinking", "low"], ["--version", "prompt"], ["-v", "prompt"],
  ["--system-prompt", "--model"], ["--append-system-prompt", "--help"],
  ["--name", "--thinking"], ["--", "--models=literal"],
].map((args) => ({ args })))("ordinary input %j does not accidentally disable defaults", async ({ args }) => {
  const home = await fixture();
  await install(home);
  const run = await fakeOmo(home);
  const result = await run(GPT.name, args);
  expect(result.output.argv).toEqual([...DEFAULTS, ...args]);
});

test("all config conflicts are preflighted before any launcher or manifest is written", async () => {
  const home = await fixture();
  const before = JSON.stringify({ profiles: { [CLAUDE.name]: { "[native]": { mine: true } } } });
  await writeFile(home.config, before);

  await expect(prepareProfileArtifacts(home.config, before, [GPT, CLAUDE])).rejects.toThrow("profile conflicts");

  expect(await readdir(home.home)).toEqual(["omo.jsonc"]);
  expect(await readFile(home.config, "utf8")).toBe(before);
});

test("a generated-looking prefix cannot claim an unrelated launcher", async () => {
  const home = await fixture();
  await mkdir(home.bin);
  const text = "#!/bin/sh\n# Generated by omo-start\nprintf 'mine'\n";
  await writeFile(join(home.bin, CLAUDE.name), text);

  await expect(prepareProfileArtifacts(home.config, "", [GPT, CLAUDE])).rejects.toThrow("launcher conflicts");

  expect(await readdir(home.bin)).toEqual([CLAUDE.name]);
  expect(await readdir(home.home)).toEqual(["bin"]);
  expect(await readFile(join(home.bin, CLAUDE.name), "utf8")).toBe(text);
});

test("unchanged managed updates preserve other manifest entries and back up replaced artifacts", async () => {
  const home = await fixture();
  const { configText } = await install(home, [GPT, CLAUDE]);
  const previousLauncher = await readFile(join(home.bin, GPT.name), "utf8");
  const oldManifest = JSON.parse(await readFile(home.manifest, "utf8"));
  oldManifest.unrelated = { retained: true };
  await writeFile(home.manifest, JSON.stringify(oldManifest));
  const manifestBefore = await readFile(home.manifest, "utf8");
  const next = { ...GPT, main: { ...GPT.main, model: "next-model" }, value: { "[native]": { model_profile: "new-lane" } } };

  await writeProfileArtifacts(await prepareProfileArtifacts(home.config, configText, [next]));

  const manifest = JSON.parse(await readFile(home.manifest, "utf8"));
  expect(manifest.profiles).toEqual({ [GPT.name]: next.value, [CLAUDE.name]: CLAUDE.value });
  expect(manifest.launchers[CLAUDE.name]).toBe(oldManifest.launchers[CLAUDE.name]);
  expect(manifest.unrelated).toEqual({ retained: true });
  const binBackups = (await readdir(home.bin)).filter((name) => name.startsWith(`${GPT.name}.bak-omo-start-`));
  expect(binBackups).toHaveLength(1);
  expect(await readFile(join(home.bin, binBackups[0] ?? ""), "utf8")).toBe(previousLauncher);
  const manifestBackups = (await readdir(home.home)).filter((name) => name.startsWith(".omo-start-profiles.json.bak-omo-start-"));
  expect(manifestBackups).toHaveLength(1);
  expect(await readFile(join(home.home, manifestBackups[0] ?? ""), "utf8")).toBe(manifestBefore);
  const run = await fakeOmo(home);
  expect((await run(GPT.name, [])).output.argv).toEqual(["--model", "chatgpt-subscription/next-model", "--thinking", "high"]);
});

test("same-value applies are idempotent and create no backups", async () => {
  const home = await fixture();
  const { configText } = await install(home);
  const manifestBefore = await readFile(home.manifest, "utf8");

  await writeProfileArtifacts(await prepareProfileArtifacts(home.config, configText, [GPT]));

  expect(await readFile(home.manifest, "utf8")).toBe(manifestBefore);
  expect(await readdir(home.home)).toEqual([".omo-start-profiles.json", "bin", "omo.jsonc"]);
  expect(await readdir(home.bin)).toEqual([GPT.name]);
});

test.each(["profile", "launcher"])("modified generated %s is refused without writes", async (kind) => {
  const home = await fixture();
  const { configText } = await install(home);
  const modifiedConfig = kind === "profile" ? JSON.stringify({ profiles: { [GPT.name]: { mine: true } } }) : configText;
  await writeFile(home.config, modifiedConfig);
  if (kind === "launcher") await writeFile(join(home.bin, GPT.name), "#!/bin/sh\nexit 9\n");
  const filesBefore = await readdir(home.home);
  const binBefore = await readdir(home.bin);
  const manifestBefore = await readFile(home.manifest, "utf8");

  await expect(prepareProfileArtifacts(home.config, modifiedConfig, [GPT])).rejects.toThrow(`${kind} conflicts`);

  expect(await readdir(home.home)).toEqual(filesBefore);
  expect(await readdir(home.bin)).toEqual(binBefore);
  expect(await readFile(home.manifest, "utf8")).toBe(manifestBefore);
});

test.each(["home", "config", "bin", "manifest", "launcher"])("preflight refuses symlink %s paths", async (kind) => {
  const home = await fixture();
  const outside = join(home.root, "outside");
  await mkdir(outside);
  const target = join(outside, "target");
  await writeFile(target, "do not touch");
  let config = home.config;
  switch (kind) {
    case "home":
      await symlink(home.home, join(home.root, "linked-home"));
      config = join(home.root, "linked-home", "omo.jsonc");
      break;
    case "config": await symlink(target, home.config); break;
    case "bin": await symlink(outside, home.bin); break;
    case "manifest": await symlink(target, home.manifest); break;
    case "launcher":
      await mkdir(home.bin);
      await symlink(target, join(home.bin, GPT.name));
      break;
  }
  const filesBefore = await readdir(home.home);

  await expect(prepareProfileArtifacts(config, "", [GPT])).rejects.toThrow("symlink");

  expect(await readFile(target, "utf8")).toBe("do not touch");
  expect(await readdir(home.home)).toEqual(filesBefore);
});

test.each(["manifest", "launcher", "bin"])("write refuses a changed %s snapshot before any writes", async (kind) => {
  const home = await fixture();
  const plan = await prepareProfileArtifacts(home.config, "", [GPT, CLAUDE]);
  if (kind === "manifest") await writeFile(home.manifest, "{}");
  if (kind === "launcher") {
    await mkdir(home.bin);
    await writeFile(join(home.bin, CLAUDE.name), "new owner");
  }
  if (kind === "bin") await symlink(home.root, home.bin);
  const filesBefore = await readdir(home.home);

  await expect(writeProfileArtifacts(plan)).rejects.toThrow();

  expect(await readdir(home.home)).toEqual(filesBefore);
  if (kind === "launcher") expect(await readdir(home.bin)).toEqual([CLAUDE.name]);
});

test.each([
  ["broken JSONC", '{"profiles":', [GPT]],
  ["nonobject profiles", '{"profiles":[]}', [GPT]],
  ["unsupported name", "{}", [{ ...GPT, name: "../other" }]],
  ["duplicate name", "{}", [GPT, GPT]],
  ["nonobject profile", "{}", [{ ...GPT, value: null }]],
])("preflight rejects %s without creating artifacts", async (_name, before, profiles) => {
  const home = await fixture();
  await expect(prepareProfileArtifacts(home.config, before, profiles)).rejects.toThrow();
  expect(await readdir(home.home)).toEqual([]);
});
