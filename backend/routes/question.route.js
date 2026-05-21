import express from "express";
import {
  getProductQuestions,
  askQuestion,
  answerQuestion,
  deleteQuestion,
} from "../controllers/question.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/product/:productId", getProductQuestions);
router.post("/product/:productId", protectRoute, askQuestion);
router.post("/:id/answers", protectRoute, answerQuestion);
router.delete("/:id", protectRoute, deleteQuestion);

export default router;
