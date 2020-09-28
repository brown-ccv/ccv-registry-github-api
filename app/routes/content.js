const express = require('express');
const router = express.Router();
const fs = require('fs');
const { paths, organization, repository, defaultBranch, fileName } = require('../utils'); 

paths(organization, repository, defaultBranch).then(paths => {
  paths.forEach(folder => {
    router.get(`/${folder}`, (req, res) => {
      fs.readFile(fileName(folder), (err, json) => {
        let obj = JSON.parse(json);
        res.json(obj);
      });
    });
  });
});

module.exports = router;

/**
* @swagger
* /about:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /about/facilities:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /about/opportunities:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /about/people:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /home:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /home/banners:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /our-work:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /our-work/apps:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /our-work/software:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /our-work/talks:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /our-work/workshops:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /services:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /services/classroom:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /services/computing:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /services/consulting:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /services/help:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /services/rates:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /services/storage:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/
/**
* @swagger
* /services/visualization:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/