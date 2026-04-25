const axios = require('axios');

const COPYLEAKS_API_BASE = 'https://api.copyleaks.com/v3';
let authToken = null;
let tokenExpiry = null;

const getAuthToken = async () => {
  // Check if we have a valid token
  if (authToken && tokenExpiry && new Date() < tokenExpiry) {
    return authToken;
  }

  try {
    const response = await axios.post(`${COPYLEAKS_API_BASE}/account/login/api`, {
      email: process.env.COPYLEAKS_EMAIL,
      key: process.env.COPYLEAKS_API_KEY
    });

    authToken = response.data.access_token;
    // Set token expiry to 24 hours from now
    tokenExpiry = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
    return authToken;
  } catch (error) {
    console.error('Error getting Copyleaks auth token:', error);
    throw new Error('Failed to authenticate with plagiarism service');
  }
};

const checkPlagiarism = async (req, res) => {
  try {
    const { title, text } = req.body;

    if (!title || !text) {
      return res.status(400).json({
        success: false,
        message: 'Title and text are required'
      });
    }

    // Get auth token
    const token = await getAuthToken();

    // Start a new scan
    const scanResponse = await axios.post(
      `${COPYLEAKS_API_BASE}/scans/submit/file`,
      {
        base64: Buffer.from(text).toString('base64'),
        filename: `${title.replace(/[^a-z0-9]/gi, '_')}.txt`,
        properties: {
          scanning: {
            languageCode: 'en',
            sensitivityLevel: 0.8, // 0-1, higher means more sensitive
            cheatDetection: true,
            duplicateWords: true,
            citations: true,
            references: true,
            minCopiedWords: 5
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const scanId = scanResponse.data.scannedDocument.scanId;

    // Poll for results (usually takes 30s-2min)
    let results = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (!results && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds between checks

      try {
        const resultsResponse = await axios.get(
          `${COPYLEAKS_API_BASE}/scans/${scanId}/results`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (resultsResponse.data.status === 'Completed') {
          results = resultsResponse.data;
        }
      } catch (error) {
        if (error.response?.status !== 404) { // 404 means still processing
          throw error;
        }
      }

      attempts++;
    }

    if (!results) {
      return res.status(408).json({
        success: false,
        message: 'Plagiarism check timed out. Please try again.'
      });
    }

    // Format results
    const formattedResults = {
      similarityScore: results.statistics.identicalWords / results.statistics.totalWords * 100,
      matches: results.results.map(match => ({
        source: match.url || 'Unknown Source',
        similarity: match.statistics.identicalWords / results.statistics.totalWords * 100,
        matchedText: match.matchedText
      }))
    };

    res.json({
      success: true,
      data: formattedResults
    });

  } catch (error) {
    console.error('Plagiarism check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check plagiarism',
      error: error.message
    });
  }
};

module.exports = {
  checkPlagiarism
};