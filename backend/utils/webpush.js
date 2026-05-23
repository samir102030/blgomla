import webpush from "web-push";
import User from "../models/user.model.js";

let configured = false;

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || "noreply@belgomla.com"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  configured = true;
}

export const isWebPushEnabled = () => configured;
export const getPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? null;

export async function sendPushToUser(userId, payload) {
  if (!configured) return;

  const user = await User.findById(userId).select("pushSubscriptions").lean();
  if (!user?.pushSubscriptions?.length) return;

  const payloadStr = JSON.stringify(payload);
  const expiredEndpoints = [];

  await Promise.allSettled(
    user.pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payloadStr);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (expiredEndpoints.length) {
    await User.findByIdAndUpdate(userId, {
      $pull: { pushSubscriptions: { endpoint: { $in: expiredEndpoints } } },
    });
  }
}
