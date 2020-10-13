let express = require('express');
let router = express.Router();
const { client, statusQuery } = require('../utils');

/**
 * @swagger
 * /status:
 *   get:
 *     description: Returns number of open issuses in CCV's services repos.
 *     responses:
 *       200:
 *         description:
 */
client.request(statusQuery('ccv-status', 'CLOSED')).then((response) => {
  let status = [];
  response.organization.repositories.nodes.map((repo) => {
    let repoObj = { name: repo.name, open_issues: repo.issues.edges.length };
    status.push(repoObj);
  });
  let totalOpen = status.map((a) => a.open_issues).reduce((a,b) => a + b, 0);
  let disrrupted = status.filter((a) => a.open_issues > 0).map((a) => a.name);
  status.push({name: 'all', open_issues: totalOpen, disrrupted});

  router.get('/', (req, res) => {
    res.json(status);
  });

});

module.exports = router;
