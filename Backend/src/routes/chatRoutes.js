import express from "express";
import { askBot } from "../controllers/chatController.js";

const router = express.Router();


router.post("/", askBot);

export default router;