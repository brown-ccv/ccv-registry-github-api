const express = require('express');
const router = express.Router();
const { reload } = require('../utils');

/**
 * @swagger
 * /reload:
 *   get:
 *     description: Reload Content. Replace current data with new data from GitHub.
 *     responses:
 *       200:
 *         description: Success! New content is now available.
 */
router.get('/', async (req, res) => {
  const status = await reload();
  res.send(status);
});

module.exports = router;
