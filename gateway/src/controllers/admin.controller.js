import { RatePolicy } from "../models/RatePolicy.js";
import { AbuseLog } from "../models/AbuseLog.js";
import { BlockedIP } from "../models/BlockedIP.js";

export const createPolicy = async (req, res, next) => {
  try {
    const { name, windowSize, maxRequests } = req.body;

    const policy = await RatePolicy.create({
      name,
      windowSize,
      maxRequests
    });

    res.status(201).json(policy);
  } catch (error) {
    next(error);
  }
};

export const getAbuseLogs = async (req, res, next) => {
  try {
    const logs = await AbuseLog.find().populate("userId");

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

export const getBlockedIPs = async (req, res, next) => {
  try {
    const blocked = await BlockedIP.find();

    res.status(200).json(blocked);
  } catch (error) {
    next(error);
  }
};
