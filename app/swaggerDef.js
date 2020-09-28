/* istanbul ignore next */
// This file is an example, it's not functionally used by the module.This

const host = `http://${process.env.IP}:${process.env.PORT}`;

module.exports = {
  definition: {
    info: {
    // API informations (required)
      title: 'CCV Content REST API', // Title (required)
      version: '1.0.0', // Version (required)
      description: 'A simple API that serves content to CCV\'s website and more!', // Description (optional)
    },
    host, // Host (optional)
    basePath: '/', // Base path (optional),
  },
  apis: ['app/routes/*.js'] 
};