const blobService = require("../services/blobService");

const postBlobData = async (req, res, next) => {
  try {
    const { rollupId, signature, data, bid } = req.body;
    if (!signature || !data || !bid) {
      return res
        .status(400)
        .json({ error: "Signature and data are required." });
    }

    const result = await blobService.handleBlobData(
      rollupId,
      signature,
      data,
      bid
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { postBlobData };
