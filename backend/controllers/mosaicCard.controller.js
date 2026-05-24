import MosaicCard from "../models/mosaicCard.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

const ALLOWED_FIELDS = [
  "title",
  "titleAr",
  "type",
  "image",
  "link",
  "tiles",
  "isActive",
  "sortOrder",
];

const pick = (body) =>
  ALLOWED_FIELDS.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});

// Create (Admin)
export const createMosaicCard = controllerWrapper(
  "createMosaicCard",
  async (req, res) => {
    const card = new MosaicCard(pick(req.body));
    await card.save();
    res.status(201).json({ success: true, card });
  }
);

// Get all (Admin)
export const getAllMosaicCards = controllerWrapper(
  "getAllMosaicCards",
  async (req, res) => {
    const cards = await MosaicCard.find({ deleted: { $ne: true } }).sort({
      sortOrder: 1,
      createdAt: -1,
    });
    res.status(200).json({ success: true, cards });
  }
);

// Get active (Public)
export const getActiveMosaicCards = controllerWrapper(
  "getActiveMosaicCards",
  async (req, res) => {
    const cards = await MosaicCard.find({
      isActive: true,
      deleted: { $ne: true },
    }).sort({ sortOrder: 1, createdAt: -1 });
    res.status(200).json({ success: true, cards });
  }
);

// Update (Admin)
export const updateMosaicCard = controllerWrapper(
  "updateMosaicCard",
  async (req, res) => {
    const { mosaicCardId } = req.params;
    const card = await MosaicCard.findByIdAndUpdate(mosaicCardId, pick(req.body), {
      new: true,
      runValidators: true,
    });
    if (!card || card.deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Mosaic card not found" });
    }
    res.status(200).json({ success: true, card });
  }
);

// Delete (Soft, Admin)
export const deleteMosaicCard = controllerWrapper(
  "deleteMosaicCard",
  async (req, res) => {
    const { mosaicCardId } = req.params;
    const card = await MosaicCard.findByIdAndUpdate(
      mosaicCardId,
      { deleted: true },
      { new: true }
    );
    if (!card) {
      return res
        .status(404)
        .json({ success: false, message: "Mosaic card not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Mosaic card deleted successfully" });
  }
);
