import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import { useMosaicStore, type MosaicCard, type MosaicTile } from "../../stores/mosaic.store";

interface MosaicCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card?: MosaicCard | null;
}

type CardType = MosaicCard["type"];

interface FormState {
  title: string;
  titleAr: string;
  type: CardType;
  image: string;
  link: string;
  tiles: MosaicTile[];
  isActive: boolean;
  sortOrder: number;
}

const emptyTiles = (): MosaicTile[] =>
  Array.from({ length: 4 }, () => ({ label: "", labelAr: "", image: "", link: "" }));

const getInitialState = (): FormState => ({
  title: "",
  titleAr: "",
  type: "single",
  image: "",
  link: "",
  tiles: emptyTiles(),
  isActive: true,
  sortOrder: 0,
});

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002B5B] focus:border-transparent";

const MosaicCardModal: React.FC<MosaicCardModalProps> = ({ isOpen, onClose, card }) => {
  const { createMosaicCard, updateMosaicCard } = useMosaicStore();
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(getInitialState());

  useEffect(() => {
    if (card) {
      const tiles = emptyTiles().map((empty, i) => ({ ...empty, ...(card.tiles?.[i] || {}) }));
      setForm({
        title: card.title || "",
        titleAr: card.titleAr || "",
        type: card.type || "single",
        image: card.image || "",
        link: card.link || "",
        tiles,
        isActive: card.isActive ?? true,
        sortOrder: card.sortOrder || 0,
      });
    } else {
      setForm(getInitialState());
    }
  }, [card]);

  const uploadImage = async (file: File, key: string): Promise<string | null> => {
    const fd = new FormData();
    fd.append("image", file);
    setUploadingKey(key);
    try {
      const { data } = await axiosInstance.post("/upload/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.url as string;
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to upload image");
      return null;
    } finally {
      setUploadingKey(null);
    }
  };

  const handleMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, "main");
    if (url) setForm((p) => ({ ...p, image: url }));
  };

  const handleTileImage = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, `tile-${index}`);
    if (url) {
      setForm((p) => {
        const tiles = [...p.tiles];
        tiles[index] = { ...tiles[index], image: url };
        return { ...p, tiles };
      });
    }
  };

  const updateTile = (index: number, field: keyof MosaicTile, value: string) => {
    setForm((p) => {
      const tiles = [...p.tiles];
      tiles[index] = { ...tiles[index], [field]: value };
      return { ...p, tiles };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (form.type === "single" && !form.image) {
      toast.error("A single-image card needs an image");
      return;
    }

    // Keep only tiles that have at least an image or a label.
    const tiles =
      form.type === "quadrant"
        ? form.tiles.filter((tl) => (tl.image && tl.image.trim()) || (tl.label && tl.label.trim()))
        : [];

    if (form.type === "quadrant" && tiles.length === 0) {
      toast.error("Add at least one tile for a quadrant card");
      return;
    }

    const payload: Partial<MosaicCard> = {
      title: form.title,
      titleAr: form.titleAr,
      type: form.type,
      image: form.type === "single" ? form.image : "",
      link: form.link,
      tiles,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    };

    const success = card
      ? await updateMosaicCard(card._id, payload)
      : await createMosaicCard(payload);

    if (success) {
      toast.success(`Mosaic card ${card ? "updated" : "created"} successfully`);
      onClose();
    } else {
      toast.error(`Failed to ${card ? "update" : "create"} mosaic card`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {card ? "Edit Mosaic Card" : "Create Mosaic Card"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title + Arabic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title (Arabic)
              </label>
              <input
                type="text"
                dir="rtl"
                value={form.titleAr}
                onChange={(e) => setForm({ ...form, titleAr: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Card Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as CardType }))}
              className={inputCls}
            >
              <option value="single">Single image (one big lifestyle image)</option>
              <option value="quadrant">Quadrant (2x2 sub-category tiles)</option>
            </select>
          </div>

          {/* Single image */}
          {form.type === "single" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image *</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleMainImage}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              {uploadingKey === "main" && (
                <p className="text-sm text-gray-500 mt-1">Uploading...</p>
              )}
              {form.image && (
                <img
                  src={form.image}
                  alt="Preview"
                  className="mt-2 h-32 object-cover rounded-lg"
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
          )}

          {/* Quadrant tiles */}
          {form.type === "quadrant" && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Tiles (up to 4)</p>
              {form.tiles.map((tile, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Tile {i + 1}</span>
                    {uploadingKey === `tile-${i}` && (
                      <span className="text-xs text-gray-500">Uploading...</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Label"
                      value={tile.label || ""}
                      onChange={(e) => updateTile(i, "label", e.target.value)}
                      className={inputCls}
                    />
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="Label (Arabic)"
                      value={tile.labelAr || ""}
                      onChange={(e) => updateTile(i, "labelAr", e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Link (e.g. /products?category=123)"
                    value={tile.link || ""}
                    onChange={(e) => updateTile(i, "link", e.target.value)}
                    className={inputCls}
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleTileImage(e, i)}
                      className="text-sm"
                    />
                    {tile.image && (
                      <img
                        src={tile.image}
                        alt={`Tile ${i + 1}`}
                        className="h-12 w-12 object-cover rounded"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.type === "quadrant" ? '"See more" Link' : "Link URL"} (Optional)
            </label>
            <input
              type="text"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="/products?category=123 or https://example.com"
              className={inputCls}
            />
          </div>

          {/* Sort order + active */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sortOrder: parseInt(e.target.value, 10) || 0 }))
                }
                className={inputCls}
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="w-4 h-4 text-[#002B5B] border-gray-300 rounded focus:ring-[#002B5B]"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadingKey !== null}
              className="flex-1 px-4 py-2 bg-[#FFD600] text-[#333333] rounded-lg hover:bg-[#e6c100] transition-colors font-medium disabled:opacity-50"
            >
              {card ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MosaicCardModal;
