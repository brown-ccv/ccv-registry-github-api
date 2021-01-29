require('dotenv').config();
const Showdown  = require('showdown');
const converter = new Showdown.Converter();
const yaml = require('js-yaml');
const fm = require('front-matter');
const GraphQLClient = require('graphql-request').GraphQLClient;
const fs = require('fs');

const organization = 'brown-ccv';
const repository = 'ccv-website-content';
const defaultBranch = 'main';

const endpoint = 'https://api.github.com/graphql';
const client = new GraphQLClient(endpoint, {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    'User-Agent': process.env.GITHUB_USER
  },
});

const swaggerString = (path) => {
  return `
/**
* @swagger
* /${path}:
*   get:
*     description: Returns the homepage
*     responses:
*       200:
*         description: hello world
*/`;
};

/**
 * Generate GrahpQL String to fetch data from GitHub API v4.
 *
 * @function dataQuery
 * @param {string} folder - Folder in repository to fetch contents
 * @param {string} repository - GitHub repository name
 * @param {string} branch - Git branch
 * @return {string} The GraphQL query string.
 */
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

/**
   * Get GraphQL query string to fetch list of paths present in a GitHub repository (2 levels deep).
   *
   * @function pathsQuery
   * @param {string} organization - Name of GitHub organization
   * @param {string} repository - GitHub repository name
   * @param {string} branch - Git branch
   * @return {string} The GraphQL query string.
   */
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
          }
        }
      }
    }`;
};

/**
   * Get GraphQL query string to fetch list of issues for all repos in a organization.
   *
   * @function pathsQuery
   * @param {string} organization - Name of GitHub organization
   * @param {string} issueState - State of issues (eg. OPEN, CLOSED)
   * @return {string} The GraphQL query string.
   */
const statusQuery = (organization, issueState) => `{
    organization(login: "${organization}") {
      repositories(first: 10) {
        nodes {
          id
          name
          issues(first: 10, states: [${issueState}]) {
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

/**
   * Get list of paths present in a GitHub repository (2 levels deep), using GitHub API v4
   *
   * @async
   * @function paths
   * @param {string} organization - Name of GitHub organization
   * @param {string} repository - GitHub repository name
   * @param {string} branch - Git branch
   * @return {Promise<Array>} Promise that resolves in a list of paths.
   */
const paths = (organization, repository, defaultBranch) => client.request(pathsQuery(organization, repository, defaultBranch))
  .then((response) => {
    let paths = [];
    response.repository.object.entries.forEach((level0) => {
      paths.push(level0.path);
      if (Object.keys(level0.object).includes('entries')) {
        level0.object.entries.forEach((level1) => {
          paths.push(level1.path);
          if (Object.keys(level1.object).includes('entries')) {
            level1.object.entries.forEach((level2) => {
              paths.push(level2.path);
            });
          }
        });
      }
    });
    const result = paths.filter((path) => !path.includes('.'));
    return result;
  });


/**
   * Normalize response from GraphQL GitHub API v4. Reduce file array to contain MD and YAML only.
   * For MD, parses the yaml front-matter, converts the body to HTML and add it to the JSON object as `body`.
   * YAML files simply get parset into JSON objects.
   * Combine all files into one array.
   *
   * @function normalize
   * @param {string} response - Response from GraphQL client with the content of files in the repository.
   * @return {Array<object>} Returns an array of objects with file contents.
   */
const normalize = (response) => {
  const content = response.repository.object.entries;
  const yamlFiles = content.filter(entry => entry.name.includes('.yml') || entry.name.includes('.yaml') || !entry.name.includes('.'));
  const mdFiles = content.filter(entry =>  entry.name.includes('.md') || !entry.name.includes('.'));

  const normalizedYaml = yamlFiles.map((entry) => {
    let obj;
    if (entry.name.includes('.yml') || entry.name.includes('.yaml')) {
      try {
        obj = yaml.safeLoad(entry.object.text);
      } catch (e) {
        console.log(entry.object);
        console.log(e);
      }
    }
    if (!entry.name.includes('.')) {
      obj = entry.name;
    }
    if (entry.name.includes('index')) {
      obj.index = true;
    }
    return obj;
  });

  const normalizedMd = mdFiles.map((entry) => {
    const md = fm(entry.object.text);
    var obj = {};
    if (md.body.length) {
      obj = {
        ...md.attributes,
        body: `<main>${converter.makeHtml(md.body)}</main>`
      };
    }
    else {
      obj = md.attributes;
    }
    if (entry.name.includes('index')) {
      obj.index = true;
    }
    if (!entry.name.includes('.')) {
      obj = entry.name;
    }
    return obj;
  });
  return organizeJson(normalizedMd.concat(normalizedYaml));
};

/**
   * Send a request to GitHub API v4 to get all contents of files in the folder/repo/branch.
   *
   * @async
   * @function data
   * @param {string} folder - Folder in repository to fetch contents
   * @param {string} repository - GitHub repository name
   * @param {string} branch - Git branch
   * @return {Promise<Array>} Promise that resolves in a list of objects with file contents.
   */
const data = (folder, repository, defaultBranch) => client
  .request(dataQuery(folder, repository, defaultBranch))
  .then((response) => normalize(response));

/**
   * Generates file name with full path to content folder.
   *
   * @function fileName
   * @param {string} folder - Path to folder from GitHub
   * @return {string} New path to content folder
   */
const fileName = (folder) => `app/content/${folder.replace(/\//g, '-')}.json`;

const uniq = (value, index, self) => self.indexOf(value) === index;

/**
   * Organizes JSON response.
   *
   * @function fileName
   * @param {Array} arr - Array of objects (response from Github API call)
   * @return {Object} Object with index, and data keys.
   */
const organizeJson = (arr) => {
  var obj = {index: {}, data: [], toc: []};
  arr.forEach(a => {
    if (Object.prototype.hasOwnProperty.call(a, 'index')) {
      obj.index = a;
    }
    else if (typeof a === 'object' && Object.keys(a).length > 0) {
      obj.data.push(a);
      if (a.title) obj.toc.push(a.title);
    }
    else if (typeof a === 'string') {
      obj.toc.push(a);
    }
  });
  obj.toc = obj.toc.filter(uniq);
  return obj;
};

/**
   * Refresh content.
   *
   * @function fileName
   * @return {String} Status of reload.
   */
const reload = () => {
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
    return 'Content updated.';
  });
}

module.exports = {
  organization,
  repository,
  defaultBranch,
  fileName,
  data,
  normalize,
  paths,
  statusQuery,
  pathsQuery,
  dataQuery,
  client,
  swaggerString,
  organizeJson,
  reload
};
