import { Daytona } from "@daytona/sdk";

let _daytona: Daytona | null = null;

export function getDaytonaClient(): Daytona {
  if (!_daytona) {
    _daytona = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
    });
  }
  return _daytona;
}

export const daytona = new Proxy({} as Daytona, {
  get(_target, prop) {
    const client = getDaytonaClient();
    const value = (client as any)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});