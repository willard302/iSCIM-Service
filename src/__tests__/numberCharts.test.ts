import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";

// 每次測試使用獨立的儲存目錄；config 於呼叫時才讀取環境變數
const storageRoot = await mkdtemp(join(tmpdir(), "iscim-number-charts-"));
process.env.STORAGE_DIR = storageRoot;
delete process.env.CHARTS_API_KEY;

const { default: app } = await import("../app.js");
const { parseChartInput, parseTodayDate, digestInput } = await import("../services/numberChartInput.js");
const { cleanupNumberCharts } = await import("../services/numberChartCleanup.js");
const numberChartSetModel = await import("../models/numberChartSetModel.js");

const DAY_MS = 24 * 60 * 60 * 1000;
const today = new Date().toISOString().slice(0, 10);
let baseUrl = "";
let server: ReturnType<typeof app.listen>;

const request = async (method: string, path: string, body?: unknown) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const statusOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    return (error as { statusCode?: number }).statusCode;
  }
  return undefined;
};

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/charts/numbers`;
});

after(async () => {
  server.close();
  await rm(storageRoot, { recursive: true, force: true });
});

beforeEach(async () => {
  await rm(join(storageRoot, "numbers"), { recursive: true, force: true });
});

describe("chart input", () => {
  it("normalizes the same data to the same digest regardless of extra fields", () => {
    const first = parseChartInput({ birthDate: "1990-05-20", birthTime: "08:30", gender: "male", name: "A" });
    const second = parseChartInput({ gender: "male", birthTime: "08:30", birthDate: "1990-05-20" });

    assert.deepEqual(first, { birthDate: "1990-05-20", birthTime: "08:30", gender: "male" });
    assert.equal(digestInput(first), digestInput(second));
    assert.notEqual(digestInput(first), digestInput({ birthDate: "1990-05-20" }));
  });

  for (const [name, payload] of [
    ["missing body", undefined],
    ["non-existent date", { birthDate: "2026-02-30" }],
    ["future date", { birthDate: "2999-01-01" }],
    ["malformed time", { birthDate: "1990-05-20", birthTime: "8:30" }],
    ["unknown gender", { birthDate: "1990-05-20", gender: "x" }],
  ] as const) {
    it(`rejects ${name} with 400`, () => {
      assert.equal(statusOf(() => parseChartInput(payload)), 400);
    });
  }

  it("accepts today within one day of UTC to cover every device time zone", () => {
    const now = new Date("2026-11-26T12:00:00.000Z");
    assert.equal(parseTodayDate("2026-11-25", now), "2026-11-25");
    assert.equal(parseTodayDate("2026-11-27", now), "2026-11-27");
    assert.equal(statusOf(() => parseTodayDate("2026-11-28", now)), 400);
  });
});

describe("number chart API", () => {
  it("shares one today set for everyone on the same day", async () => {
    const first = await request("GET", `/today/${today}?cardIds=five_traits`);
    const second = await request("GET", `/today/${today}?cardIds=five_traits`);

    assert.equal(first.status, 200);
    assert.equal(first.body.result.setId, `today-${today}`);
    assert.deepEqual(second.body.result, first.body.result);
    assert.deepEqual(first.body.result.cards.map((card: { cardId: string }) => card.cardId), ["five_traits"]);
  });

  it("generates a calculation set once for concurrent identical requests and only the requested cards", async () => {
    const body = { birthDate: "1990-05-20", gender: "female", cardIds: ["five_traits", "odd_even"] };
    const [first, second] = await Promise.all([request("POST", "/calculations", body), request("POST", "/calculations", body)]);

    assert.equal(first.status, 200);
    assert.equal(first.body.result.setId, second.body.result.setId);
    assert.match(first.body.result.setId, /^calc-[0-9a-f]{32}$/);
    // setId 不含生日原文
    assert.doesNotMatch(first.body.result.setId, /1990/);

    const files = await readdir(numberChartSetModel.getSetDirectory(first.body.result.setId));
    assert.deepEqual(files.sort(), ["five_traits.png", "manifest.json", "odd_even.png"]);
  });

  it("serves only files listed in the set", async () => {
    const { body } = await request("POST", "/calculations", { birthDate: "1990-05-20", cardIds: ["five_traits"] });
    const image = await fetch(`${baseUrl.replace(/\/api\/charts\/numbers$/, "")}${body.result.cards[0].url}`);

    assert.equal(image.status, 200);
    assert.match(image.headers.get("content-type") ?? "", /^image\//);
    assert.equal((await request("GET", `/sets/${body.result.setId}/odd_even.png`)).status, 404);
    assert.equal((await request("GET", `/sets/..%2F..%2Fsecret/five_traits.png`)).status, 404);
  });

  it("rejects unknown card IDs with 400", async () => {
    const response = await request("POST", "/calculations", { birthDate: "1990-05-20", cardIds: ["nope"] });
    assert.equal(response.status, 400);
  });

  it("keeps each member's set, adds cards lazily and rebuilds when the birth data changes", async () => {
    const created = await request("PUT", "/users/user-a", { birthDate: "1990-05-20", cardIds: ["five_traits"] });
    const other = await request("PUT", "/users/user-b", { birthDate: "1990-05-20", cardIds: ["five_traits"] });
    assert.notEqual(created.body.result.setId, other.body.result.setId);

    const unlocked = await request("PUT", "/users/user-a", { birthDate: "1990-05-20", cardIds: ["five_traits", "crash_hesitation"] });
    assert.equal(unlocked.body.result.setId, created.body.result.setId);
    assert.equal(unlocked.body.result.cards.length, 2);

    const changed = await request("PUT", "/users/user-a", { birthDate: "1991-01-01", cardIds: ["five_traits"] });
    assert.notEqual(changed.body.result.setId, created.body.result.setId);
    assert.equal(await numberChartSetModel.findManifest(created.body.result.setId), null);
  });

  it("deletes a member's charts", async () => {
    const { body } = await request("PUT", "/users/user-a", { birthDate: "1990-05-20", cardIds: ["five_traits"] });

    assert.equal((await request("DELETE", "/users/user-a")).status, 204);
    assert.equal(await numberChartSetModel.findManifest(body.result.setId), null);
    assert.equal(await numberChartSetModel.findUserPointer("user-a"), null);
    assert.equal((await request("DELETE", "/users/user-a")).status, 204);
  });
});

describe("number chart cleanup", () => {
  it("removes expired today and calculation sets and orphaned member sets", async () => {
    const todaySet = (await request("GET", `/today/${today}?cardIds=five_traits`)).body.result.setId;
    const calcSet = (await request("POST", "/calculations", { birthDate: "1990-05-20", cardIds: ["five_traits"] })).body.result.setId;
    const userSet = (await request("PUT", "/users/user-a", { birthDate: "1990-05-20", cardIds: ["five_traits"] })).body.result.setId;
    await numberChartSetModel.saveManifest({
      id: "user-orphan",
      kind: "user",
      input: { birthDate: "1990-05-20" },
      cards: [],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      lastAccessedAt: new Date().toISOString(),
    });

    assert.deepEqual(await cleanupNumberCharts(), ["user-orphan"]);

    const removed = await cleanupNumberCharts(new Date(Date.now() + 8 * DAY_MS));
    assert.deepEqual(removed.sort(), [calcSet, todaySet].sort());
    assert.notEqual(await numberChartSetModel.findManifest(userSet), null);
  });
});
