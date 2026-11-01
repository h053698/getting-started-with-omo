import { expect, test } from "bun:test";
import { chatgptIdentity, claudePlan, copilotSku, humanizePlan, jwtClaims } from "./identity.ts";

const jwt = (claims: object) => `x.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.y`;

test("ChatGPT email and plan come from the access token claims", () => {
  const token = jwt({
    "https://api.openai.com/profile": { email: "me@example.com" },
    "https://api.openai.com/auth": { chatgpt_plan_type: "prolite" },
  });
  expect(chatgptIdentity(token)).toEqual({ email: "me@example.com", plan: "Pro Lite" });
  expect(chatgptIdentity("not-a-jwt")).toEqual({});
  expect(jwtClaims(undefined)).toBeNull();
});

test("Copilot plan comes from the sku field of the Copilot token", () => {
  expect(copilotSku("tid=abc;exp=1;sku=copilot_for_business_seat:quota;rt=1")).toBe("copilot_for_business_seat");
  expect(copilotSku("tid=abc;exp=1")).toBeUndefined();
  expect(humanizePlan("free_limited_copilot")).toBe("Free Limited Copilot");
});

test("Claude plan reads the rate limit tier before the organization type", () => {
  expect(claudePlan({ organization_type: "claude_max", rate_limit_tier: "default_claude_max_20x" })).toBe("Max 20x");
  expect(claudePlan({ organization_type: "claude_max", rate_limit_tier: "default_claude_max_5x" })).toBe("Max 5x");
  expect(claudePlan({ organization_type: "claude_pro" })).toBe("Pro");
  expect(claudePlan(undefined)).toBeUndefined();
});
