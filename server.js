require('dotenv').config()
const GraphQLClient = require('graphql-request').GraphQLClient
const yaml = require('yaml')
const express = require('express')

const app = express()
const port = 3000

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "*");
    next();
  });

  app.listen(port, () => console.log(`Example app listening on port ${port}!`))

const endpoint = 'https://api.github.com/graphql' 

const client = new GraphQLClient(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'User-Agent': process.env.GITHUB_USER
    },
  })

const normalize = response => {
    const content = response.repository.object.entries
    const filtered = content.filter(entry => entry.name.includes('yml'))
    const normalized = filtered.map(entry => {
      return (entry.text = yaml.parse(entry.object.text))
    })
    return normalized
  } 

 
const query = folder => {
    return `{
      repository(owner: "brown-ccv", name: "ccv-registry") {
        object(expression: "action-test:${folder}") {
          ... on Tree {
            entries {
              name
              object {
                ... on Blob {
                  text
                }
              }
            }
          }
        }
      }
    }
    `
  }
 

const data = (folder) => client.request(query(folder)).then((response) => normalize(response))

app.get('/workshops', (req, res) => {
    data('workshops').then(res.send.bind(res))
})

app.get('/talks', (req, res) => {
    data('talks').then(res.send.bind(res))
})

app.get('/software', (req, res) => {
    data('software').then(res.send.bind(res))
})
