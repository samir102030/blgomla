import Advertisement from "../models/advertisement.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

// Create Advertisement
export const createAdvertisement = controllerWrapper(
  "createAdvertisement",
  async (req, res) => {
    const {
      title,
      description,
      image,
      link,
      position,
      isActive,
      startDate,
      endDate,
      sortOrder,
    } = req.body;

    const advertisement = new Advertisement({
      title,
      description,
      image,
      link,
      position,
      isActive,
      startDate,
      endDate,
      sortOrder,
    });

    await advertisement.save();
    res.status(201).json({ success: true, advertisement });
  }
);

// Get All Advertisements (Admin)
export const getAllAdvertisements = controllerWrapper(
  "getAllAdvertisements",
  async (req, res) => {
    const advertisements = await Advertisement.find({ deleted: { $ne: true } })
      .sort({ sortOrder: 1, createdAt: -1 });

    res.status(200).json({ success: true, advertisements });
  }
);

// Get Active Advertisements (Public)
export const getActiveAdvertisements = controllerWrapper(
  "getActiveAdvertisements",
  async (req, res) => {
    const { position } = req.query;
    const now = new Date();

    const query = {
      isActive: true,
      deleted: { $ne: true },
      $or: [
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: null },
      ],
    };

    if (position) {
      query.position = position;
    }

    const advertisements = await Advertisement.find(query)
      .sort({ sortOrder: 1, createdAt: -1 });

    res.status(200).json({ success: true, advertisements });
  }
);

// Get Advertisement by ID
export const getAdvertisementById = controllerWrapper(
  "getAdvertisementById",
  async (req, res) => {
    const { advertisementId } = req.params;
    const advertisement = await Advertisement.findById(advertisementId);

    if (!advertisement || advertisement.deleted) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    res.status(200).json({ success: true, advertisement });
  }
);

// Update Advertisement
export const updateAdvertisement = controllerWrapper(
  "updateAdvertisement",
  async (req, res) => {
    const { advertisementId } = req.params;
    const updateData = req.body;

    const advertisement = await Advertisement.findByIdAndUpdate(
      advertisementId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    res.status(200).json({ success: true, advertisement });
  }
);

// Delete Advertisement (Soft Delete)
export const deleteAdvertisement = controllerWrapper(
  "deleteAdvertisement",
  async (req, res) => {
    const { advertisementId } = req.params;

    const advertisement = await Advertisement.findByIdAndUpdate(
      advertisementId,
      { deleted: true },
      { new: true }
    );

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Advertisement deleted successfully",
    });
  }
);

// Increment View Count
export const incrementViewCount = controllerWrapper(
  "incrementViewCount",
  async (req, res) => {
    const { advertisementId } = req.params;

    const advertisement = await Advertisement.findByIdAndUpdate(
      advertisementId,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    res.status(200).json({ success: true });
  }
);

// Increment Click Count
export const incrementClickCount = controllerWrapper(
  "incrementClickCount",
  async (req, res) => {
    const { advertisementId } = req.params;

    const advertisement = await Advertisement.findByIdAndUpdate(
      advertisementId,
      { $inc: { clickCount: 1 } },
      { new: true }
    );

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: "Advertisement not found",
      });
    }

    res.status(200).json({ success: true });
  }
);

