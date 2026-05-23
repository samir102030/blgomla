import { axiosInstance } from "./axios";

export const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function getCurrentPushStatus(): Promise<"subscribed" | "denied" | "default" | "unsupported"> {
  if (!isPushSupported()) return "unsupported";
  const permission = Notification.permission;
  if (permission === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? "subscribed" : permission === "granted" ? "subscribed" : "default";
  } catch {
    return "default";
  }
}

export async function subscribeToPush(): Promise<"subscribed" | "denied" | "error"> {
  if (!isPushSupported()) return "error";
  try {
    const { data } = await axiosInstance.get<{ publicKey: string }>("/notifications/push-key");
    const reg = await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    await axiosInstance.post("/notifications/push-subscribe", sub.toJSON());
    return "subscribed";
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "NotAllowedError") return "denied";
    return "error";
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await axiosInstance.delete("/notifications/push-subscribe", { data: { endpoint } });
  } catch {
    // ignore
  }
}
