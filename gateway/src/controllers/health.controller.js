export const healthCheck = async (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "APIShield Gateway running",
    timestamp: new Date()
  });
};
