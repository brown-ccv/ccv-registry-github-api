require('dotenv').config();
const Showdown  = require('showdown');
const converter = new Showdown.Converter();
const yaml = require('yaml');
const fm = require('front-matter');
const GraphQLClient = require('graphql-request').GraphQLClient;

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
    response.repository.object.entries.forEach((obj) => {
      paths.push(obj.path);
      if (Object.keys(obj.object).includes('entries')) {
        obj.object.entries.forEach((innerObject) => paths.push(innerObject.path));
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
  const yamlFiles = content.filter(entry => entry.name.includes('.yml') || entry.name.includes('.yaml'));
  const mdFiles = content.filter(entry =>  entry.name.includes('.md'));
  
  const normalizedYaml = yamlFiles.map((entry) => yaml.parse(entry.object.text));
  
  const normalizedMd = mdFiles.map((entry) => {
    const md = fm(entry.object.text);
    if (md.body.length) {
      return {
        ...md.attributes,
        body: `<main>${converter.makeHtml(md.body)}</main>`
      };
    } 
    else {
      return md.attributes;
    }
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
const fileName = (folder) => `app/content/${folder.replace('/', '-')}.json`;
  

const organizeJson = (arr) => {
  var obj = {};
  let data = [];
  arr.map(a => {
    if (Object.prototype.hasOwnProperty.call(a, 'hidden')) {
      obj.index = a;
    }
    else {
      data.push(a);
    }
    obj.data = data;
    return obj;
  });
  return obj;
};

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
  organizeJson
};