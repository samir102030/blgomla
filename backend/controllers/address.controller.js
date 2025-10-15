import Address from "../models/address.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import Notification from "../models/notification.model.js";

export const createAddress = controllerWrapper(
  "createAddress",
  async (req, res) => {
    // If creating a default address, unset all other default addresses for this user
    if (req.body.isDefault === true) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }

    const address = new Address({
      phone: req.user.phoneNumber || "",
      ...req.body,
      user: req.user._id,
    });
    await address.save();

    // Create notification for new address
    await Notification.create({
      user: req.user._id,
      title: "New Address Added",
      message: "A new address has been added to your account",
      type: "address",
    });

    res.status(201).json({ success: true, address });
  }
);

export const getAddresses = controllerWrapper(
  "getAddresses",
  async (req, res) => {
    const addresses = await Address.find({ user: req.user._id })
      .populate("user")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, addresses });
  }
);

export const getAddressById = controllerWrapper(
  "getAddressById",
  async (req, res) => {
    const address = await Address.findById(req.params.id).populate("user");
    if (!address)
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    if (address.user._id !== req.user._id)
      return res.status(403).json({
        success: false,
        message: "Access denied - You are not authorized to view this address",
      });
    res.status(200).json({ success: true, address });
  }
);

export const updateAddress = controllerWrapper(
  "updateAddress",
  async (req, res) => {
    // first get address then check the user then update address
    const address = await Address.findById(req.params.id).populate("user");
    // console.log(req.user._id.toString());
    // // console.log(address.user._id.toString() !== req.user._id.toString());
    // return;
    if (!address)
      return res

        .status(404)
        .json({ success: false, message: "Address not found" });
    if (address.user._id.toString() !== req.user._id.toString())
      return res.status(403).json({
        success: false,
        message:
          "Access denied - You are not authorized to update this address",
      });

    // If setting this address as default, unset all other default addresses for this user
    if (req.body.isDefault === true) {
      await Address.updateMany(
        { user: address.user, _id: { $ne: address._id } },
        { isDefault: false }
      );
    }

    address.name = req.body.name;
    address.address = req.body.address;
    address.city = req.body.city;
    address.state = req.body.state;
    address.zipCode = req.body.zipCode;
    address.phone = req.body.phone;
    address.isDefault = req.body.isDefault;
    await address.save();
    res.status(200).json({ success: true, address });
  }
);

export const deleteAddress = controllerWrapper(
  "deleteAddress",
  async (req, res) => {
    const address = await Address.findByIdAndDelete(req.params.id);
    if (!address)
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    res.status(200).json({ success: true, message: "Address deleted" });
  }
);

export const setDefaultAddress = controllerWrapper(
  "setDefaultAddress",
  async (req, res) => {
    const address = await Address.findById(req.params.id);
    if (!address)
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    // Unset previous default for this user
    await Address.updateMany({ user: address.user }, { isDefault: false });
    address.isDefault = true;
    await address.save();
    res.status(200).json({ success: true, address });
  }
);
