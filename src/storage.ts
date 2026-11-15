import { Preferences } from "@capacitor/preferences";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { initial, readBackup, type Data } from "./domain";
export const Native = registerPlugin<{
  readSms(options?: { requestPermission?: boolean; since?: number }): Promise<{
    messages: { id: string; body: string; timestamp: number; sender?: string }[];
  }>;
  authenticate(): Promise<void>;
}>("CountyNative");
export const isAndroid = Capacitor.getPlatform() === "android";
export async function load() {
  const { value } = await Preferences.get({ key: "county-data" });
  return value ? readBackup(value) : initial();
}
let writes = Promise.resolve();
export function save(data: Data) {
  const value = JSON.stringify(data);
  const next = writes
    .catch(() => {})
    .then(() => Preferences.set({ key: "county-data", value }));
  writes = next;
  return next;
}
export async function download(name: string, text: string, type: string) {
  if (isAndroid) {
    const file = await Filesystem.writeFile({
      path: name,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: name, url: file.uri });
  } else {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
