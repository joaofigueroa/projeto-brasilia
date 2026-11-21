import "server-only";

export function businessError(message: string) {
  return Object.assign(new Error(message), { name: "BusinessError" });
}
