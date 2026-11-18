import { useState } from "react";
import { axiosInstance } from "./api";

export default function ImageUpload({ onUploaded, onBusy, disabled }: {
  onUploaded: (url: string) => void;
  onBusy: (busy: boolean) => void;
  disabled: boolean;
}) {
  const [error, setError] = useState("");
  return <div className="my-2 text-sm">
    <label className="grid gap-1">ارفع صورة JPG أو PNG لحد ٣ ميجابايت
      <input type="file" accept="image/jpeg,image/png" disabled={disabled} onChange={async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setError("");
        if (file.size > 3 * 1024 * 1024) {
          setError("حجم الصورة أكبر من ٣ ميجابايت.");
          return;
        }
        onBusy(true);
        try {
          const form = new FormData();
          form.append("image", file);
          const { data } = await axiosInstance.post<{ url: string }>("/social-inbox/images", form);
          onUploaded(data.url);
        } catch {
          setError("تعذّر رفع الصورة. جرّب ملف JPG أو PNG أصغر.");
        } finally {
          onBusy(false);
        }
      }} />
    </label>
    {error && <p role="alert" className="text-red-800">{error}</p>}
  </div>;
}
