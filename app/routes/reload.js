const express = require('express');
const router = express.Router();
const fs = require('fs');
const { paths, data, fileName, organization, repository, defaultBranch, swaggerString } = require('../utils');

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
  paths(organization, repository, defaultBranch).then(paths => {
    paths.forEach(path => {
    //   let contentRoute = fs.openSync('./app/routes/content.js', 'a+');
    //   fs.appendFile(contentRoute, swaggerString(path), err => {
    //     console.log(err);
    //   });      
      data(path, repository, defaultBranch).then(response => {
        fs.writeFile(fileName(path), JSON.stringify(response), (err) => {
          if (err) throw err;
        });
      }); 
    });
    res.send('Content updated.');
  });
});
  
module.exports = router;