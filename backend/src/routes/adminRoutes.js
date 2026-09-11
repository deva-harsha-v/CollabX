import express from "express";
import { adminLogin, getAllAdminPosts, adminDeletePost } from "../controllers/adminController.js";

const router = express.Router();

router.post("/login", adminLogin);
router.get("/posts", getAllAdminPosts);
router.post("/delete-post", adminDeletePost);

export default router;
