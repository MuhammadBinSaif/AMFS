const express = require('express');
const router = express.Router();
const blobController = require('../api/blobsController');

// Define the route for posting blob data
router.post('/post-blob', blobController.postBlobData);

module.exports = router;
