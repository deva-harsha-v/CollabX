import express from "express";
import { getLivePosts, getPostDetails, createPost, updateProgress } from "../controllers/postsController.js";

const router = express.Router();

router.get("/", getLivePosts);
router.get("/:id", getPostDetails);
router.post("/", createPost);
router.patch("/:id/progress", updateProgress);

export default router;
