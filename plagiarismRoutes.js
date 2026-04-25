const express = require('express');
const router = express.Router();
const { checkPlagiarism } = require('../controllers/plagiarismController.js');
const { verifyToken } = require('../middleware/verifyToken.js');

router.post('/check', verifyToken, checkPlagiarism);

module.exports = router;