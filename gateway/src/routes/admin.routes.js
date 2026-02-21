import express from "express";
import {
  createPolicy,
  getAbuseLogs,
  getBlockedIPs
} from "../controllers/admin.controller.js";

const router = express.Router();

router.post("/policy", createPolicy);
router.get("/abuse-logs", getAbuseLogs);
router.get("/blocked-ips", getBlockedIPs);

export default router;
