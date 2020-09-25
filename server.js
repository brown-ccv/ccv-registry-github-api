require('dotenv').config();
const GraphQLClient = require('graphql-request').GraphQLClient;
const yaml = require('yaml');
const fm = require('front-matter');
const express = require('express');
const Showdown  = require('showdown');
const fs = require('fs');

const converter = new Showdown.Converter();

const organization = 'brown-ccv';
const repository = 'ccv-website-content';
const defaultBranch = 'main';

const app = express();
const port = 3001;

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*'); // update to match the domain you will make the request from
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

app.listen(port, () => console.log(`CCV Content App listening on port ${port}!`));

const endpoint = 'https://api.github.com/graphql'; 

const client = new GraphQLClient(endpoint, {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    'User-Agent': process.env.GITHUB_USER
  },
});

const normalize = (response) => {
  const content = response.repository.object.entries;
  const filtered = content.filter(entry => entry.name.includes('.md') || entry.name.includes('.yml') || entry.name.includes('.yaml'));
  let normalized;
  content.map(entry => {
    if (entry.name.includes('.yml') || entry.name.includes('.yaml')) {
      normalized = filtered.map(entry => {
        return yaml.parse(entry.object.text);
      });
    }
    else if (entry.name.includes('.md')) {
      normalized = filtered.map(entry => {
        const content = fm(entry.object.text);
        if (content.body.length) {
          return {
            ...content.attributes,
            body: `<main>${converter.makeHtml(content.body)}</main>`
          };
        } 
        else {
          return content.attributes;
        }
      });
    }
  });
  return normalized;
}; 

const dataQuery = (folder, repository, branch) => {
  return `{
      repository(owner: "brown-ccv", name: "${repository}") {
        object(expression: "${branch}:${folder}") {
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
    `;
};

const pathsQuery = (organization, repository, branch) => {
  return `{
    repository(owner: "${organization}", name: "${repository}") {
      object(expression: "${branch}:") {
        ... on Tree {
          entries {
            path
            object {
              ... on Tree {
                entries {
                  path
                }
              }
            }
          }
        }
      }
    }
  }`;
};

const data = (folder, repository, defaultBranch) => client
  .request(dataQuery(folder, repository, defaultBranch))
  .then((response) => normalize(response));

const paths = () => client.request(pathsQuery(organization, repository, defaultBranch))
  .then((response) => {
    let paths = [];
    response.repository.object.entries.forEach((obj) => {
      paths.push(obj.path);
      if (Object.keys(obj.object).includes('entries')) {
        obj.object.entries.forEach((innerObject) => paths.push(innerObject.path));
      }
    });
    const result = paths.filter((path) => !path.includes('.'));
    return result;
  });

const fileName = (folder) => `content/${folder.replace('/', '-')}.json`;

app.get('/fetch', async (req, res) => { 
  paths().then(paths => {
    paths.forEach(path => {
      data(path, repository, defaultBranch).then(response => {
        fs.writeFile(fileName(path), JSON.stringify(response), (err) => {
          if (err) throw err;
        });
      }); 
    });
    res.send('Content updated.');
  });
});

paths().then(paths => {
  paths.forEach(folder => {
    app.get(`/${folder}`, (req, res) => {
      fs.readFile(fileName(folder), (err, json) => {
        let obj = JSON.parse(json);
        res.json(obj);
      });
    });
  });
});

// Status

const statusQuery = `{
  organization(login: "ccv-status") {
    repositories(first: 10) {
      nodes {
        id
        name
        issues(first: 10, states: CLOSED) {
          edges {
            node {
              id
              labels(first: 10) {
                nodes {
                  color
                  name
                }
              }
              author {
                login
              }
              createdAt
              closedAt
              editor {
                login
              }
              title
              updatedAt
            }
          }
        }
      }
    }
  }
}
`;

client.request(statusQuery).then((response) => {
  app.get('/status', (req, res) => {
    let status = [];
    response.organization.repositories.nodes.map((repo) => {
      let repoObj = { name: repo.name, open_issues: repo.issues.edges.length };
      status.push(repoObj);
    });
    let totalOpen = status.map((a) => a.open_issues).reduce((a,b) => a + b);
    let disrrupted = status.filter((a) => a.open_issues > 0).map((a) => a.name);
    status.push({name: 'all', open_issues: totalOpen, disrrupted});
    res.json(status);
  });
});


