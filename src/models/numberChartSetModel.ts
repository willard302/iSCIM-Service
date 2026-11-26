import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { getStorageDirectory } from "../config/numberCharts.js";
import type { NumberChartSetManifest, NumberChartUserPointer } from "../types/numberChart.js";

/**
 * 數字圖卡組的檔案儲存：
 *   storage/numbers/sets/{setId}/manifest.json、{cardId}.{ext}
 *   storage/numbers/users/{userId}.json → 會員目前的圖卡組
 * 呼叫端需先驗證 setId、userId、fileName 只含安全字元（見 services/numberChartInput.ts）。
 */
const numbersDirectory = () => resolve(getStorageDirectory(), "numbers");
const setsDirectory = () => resolve(numbersDirectory(), "sets");
const usersDirectory = () => resolve(numbersDirectory(), "users");

export const getSetDirectory = (setId: string) => resolve(setsDirectory(), setId);
export const getChartFilePath = (setId: string, fileName: string) => resolve(getSetDirectory(setId), fileName);

const isNotFound = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";

const readJson = async <T>(path: string): Promise<T | null> => {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
};

/** 先寫暫存檔再 rename，讀取端不會讀到寫一半的檔案 */
export const writeFileAtomic = async (path: string, data: string | Uint8Array) => {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(tempPath, data);
  await rename(tempPath, path);
};

export const findManifest = (setId: string) =>
  readJson<NumberChartSetManifest>(resolve(getSetDirectory(setId), "manifest.json"));

export const saveManifest = (manifest: NumberChartSetManifest) =>
  writeFileAtomic(resolve(getSetDirectory(manifest.id), "manifest.json"), JSON.stringify(manifest, null, 2));

export const removeSet = (setId: string) => rm(getSetDirectory(setId), { recursive: true, force: true });

export const listSetIds = async (): Promise<string[]> => {
  try {
    return (await readdir(setsDirectory(), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
};

const userPointerPath = (userId: string) => resolve(usersDirectory(), `${userId}.json`);

export const findUserPointer = (userId: string) => readJson<NumberChartUserPointer>(userPointerPath(userId));

export const saveUserPointer = (userId: string, pointer: NumberChartUserPointer) =>
  writeFileAtomic(userPointerPath(userId), JSON.stringify(pointer, null, 2));

export const removeUserPointer = (userId: string) => rm(userPointerPath(userId), { force: true });

export const listUserPointers = async (): Promise<NumberChartUserPointer[]> => {
  let fileNames: string[];
  try {
    fileNames = (await readdir(usersDirectory())).filter((name) => name.endsWith(".json"));
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
  const pointers = await Promise.all(fileNames.map((name) => readJson<NumberChartUserPointer>(resolve(usersDirectory(), name))));
  return pointers.filter((pointer): pointer is NumberChartUserPointer => pointer !== null);
};
