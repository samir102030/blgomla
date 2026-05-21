import ProductQuestion from "../models/productQuestion.model.js";
import Product from "../models/product.model.js";
import Store from "../models/store.model.js";
import { controllerWrapper } from "../utils/wrappers.js";

// Is this user the product's store owner or an admin? Drives the "official"
// answer badge and delete permissions.
const isStaffFor = async (user, productId) => {
  if (["admin", "super_admin"].includes(user.role)) return true;
  const product = await Product.findById(productId).select("store");
  if (!product?.store) return false;
  const store = await Store.findById(product.store).select("owner");
  return !!store && String(store.owner) === String(user._id);
};

// GET /api/questions/product/:productId — public list of visible Q&A.
export const getProductQuestions = controllerWrapper(
  "getProductQuestions",
  async (req, res) => {
    const questions = await ProductQuestion.find({
      product: req.params.productId,
      isVisible: true,
    })
      .sort({ createdAt: -1 })
      .populate("user", "name profilePicture")
      .populate("answers.user", "name profilePicture role");
    res.status(200).json({ success: true, questions });
  }
);

// POST /api/questions/product/:productId — ask a question (auth).
export const askQuestion = controllerWrapper("askQuestion", async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Question text is required" });
  }
  const product = await Product.findById(req.params.productId).select("_id");
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  const question = await ProductQuestion.create({
    product: req.params.productId,
    user: req.user._id,
    text: text.trim(),
  });
  await question.populate("user", "name profilePicture");
  res.status(201).json({ success: true, question });
});

// POST /api/questions/:id/answers — answer a question (auth). Marks the answer
// official when the responder is the store owner or an admin.
export const answerQuestion = controllerWrapper(
  "answerQuestion",
  async (req, res) => {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Answer text is required" });
    }
    const question = await ProductQuestion.findById(req.params.id);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }
    const official = await isStaffFor(req.user, question.product);
    question.answers.push({
      user: req.user._id,
      text: text.trim(),
      isOfficial: official,
    });
    await question.save();
    await question.populate([
      { path: "user", select: "name profilePicture" },
      { path: "answers.user", select: "name profilePicture role" },
    ]);
    res.status(201).json({ success: true, question });
  }
);

// DELETE /api/questions/:id — asker, store owner, or admin can remove.
export const deleteQuestion = controllerWrapper(
  "deleteQuestion",
  async (req, res) => {
    const question = await ProductQuestion.findById(req.params.id);
    if (!question) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }
    const isAsker = String(question.user) === String(req.user._id);
    const staff = isAsker ? true : await isStaffFor(req.user, question.product);
    if (!isAsker && !staff) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    await ProductQuestion.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Question deleted" });
  }
);
