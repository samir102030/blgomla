const CLOUDINARY_HOST = "res.cloudinary.com";

const PLACEHOLDER = "/placeholder.png";

const isCloudinary = (url: string) => url.includes(CLOUDINARY_HOST + "/");

const injectTransforms = (url: string, transforms: string): string => {
  const uploadIdx = url.indexOf("/upload/");
  if (uploadIdx === -1) return url;
  const before = url.slice(0, uploadIdx + 8);
  const after = url.slice(uploadIdx + 8);
  if (/^(?:[a-z]_[^/]+(?:,[a-z]_[^/]+)*\/)/.test(after)) return url;
  return `${before}${transforms}/${after}`;
};

export interface CldOpts {
  w?: number;
  q?: "auto" | "auto:eco" | "auto:low" | "auto:good" | "auto:best" | number;
}

export const cldImg = (url: string | undefined | null, opts: CldOpts = {}): string => {
  if (!url) return PLACEHOLDER;
  if (!isCloudinary(url)) return url;
  const { w, q = "auto" } = opts;
  const parts = ["f_auto", `q_${q}`, "dpr_auto"];
  if (w) parts.push(`c_limit`, `w_${w}`);
  return injectTransforms(url, parts.join(","));
};

export const cldSrcSet = (url: string | undefined | null, w: number, q: CldOpts["q"] = "auto"): string | undefined => {
  if (!url || !isCloudinary(url)) return undefined;
  const widths = [w, w * 2];
  return widths
    .map((width) => `${cldImg(url, { w: width, q })} ${width}w`)
    .join(", ");
};
