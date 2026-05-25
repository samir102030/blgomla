/**
 * Magnific (Freepik) Mystic text-to-image helper.
 *
 * Docs: https://docs.magnific.com — POST /v1/ai/mystic is asynchronous: it
 * returns a task_id; poll GET /v1/ai/mystic/{task_id} until status is
 * COMPLETED, then read the image URL(s) from data.generated[].
 *
 * Requires env MAGNIFIC_API_KEY.
 */

const BASE_URL = "https://api.magnific.com";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const apiKey = () => {
  const key = process.env.MAGNIFIC_API_KEY;
  if (!key) throw new Error("MAGNIFIC_API_KEY is not set");
  return key;
};

/**
 * Kick off a Mystic generation. Returns the task_id.
 */
export const startMysticGeneration = async ({
  prompt,
  aspectRatio = "square_1_1",
  resolution = "2k",
  model = "realism",
}) => {
  const res = await fetch(`${BASE_URL}/v1/ai/mystic`, {
    method: "POST",
    headers: {
      "x-magnific-api-key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: aspectRatio,
      resolution,
      model,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Mystic start failed (${res.status}): ${JSON.stringify(body)}`
    );
  }
  const taskId = body?.data?.task_id;
  if (!taskId) throw new Error(`No task_id in response: ${JSON.stringify(body)}`);
  return taskId;
};

/**
 * Poll a Mystic task until it finishes. Returns the array of generated image URLs.
 */
export const pollMysticTask = async (
  taskId,
  { intervalMs = 4000, timeoutMs = 240000 } = {}
) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE_URL}/v1/ai/mystic/${taskId}`, {
      headers: { "x-magnific-api-key": apiKey() },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `Mystic poll failed (${res.status}): ${JSON.stringify(body)}`
      );
    }
    const status = body?.data?.status;
    if (status === "COMPLETED") {
      const urls = body?.data?.generated || [];
      if (urls.length === 0) throw new Error("Task completed but no images returned");
      return urls;
    }
    if (status === "FAILED") {
      throw new Error(`Mystic task failed: ${JSON.stringify(body?.data)}`);
    }
    await sleep(intervalMs);
  }
  throw new Error(`Mystic task ${taskId} timed out after ${timeoutMs}ms`);
};

/**
 * Generate a single image from a prompt and return its (temporary) Magnific URL.
 */
export const generateImage = async (opts) => {
  const taskId = await startMysticGeneration(opts);
  const urls = await pollMysticTask(taskId, opts);
  return urls[0];
};
