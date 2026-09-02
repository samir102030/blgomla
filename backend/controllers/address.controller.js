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
      link: "/account?tab=addresses",
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
    // `!==` on two ObjectId instances compares references, so this was true
    // for the owner as well and the endpoint answered 403 to everybody.
    if (String(address.user._id) !== String(req.user._id))
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
    /*
      Scoped to the caller, which it was not.

      `findByIdAndDelete(req.params.id)` deleted whatever id it was handed:
      any signed-in account could remove any other customer's address by id,
      and an address id travels — it is on every order that ships to it. The
      orders then populate `shippingAddress` as null, so a live order loses
      the address it was meant to be delivered to, on the courier's screen and
      the customer's alike.

      404 rather than 403 when the row belongs to somebody else: a distinct
      "not yours" would confirm that the id exists.
    */
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
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
    // Same gap as the delete above: this loaded by id alone and then wrote
    // against `address.user`, so one account could switch another account's
    // default delivery address and have their next order go to it.
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
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
