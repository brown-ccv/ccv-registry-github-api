const express = require('express');
const logger = require('morgan');
const createError = require('http-errors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerOptions = require('./swaggerDef');
const { reload } = require('./utils');

const app = express();
const port = process.env.CCV_API_PORT || 3001;

const specs = swaggerJsdoc(swaggerOptions);

app.use(logger('dev'));
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*'); // update to match the domain you will make the request from
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(specs)
);

const statusRouter = require('./routes/status');
const reloadRouter = require('./routes/reload');
const contentRouter = require('./routes/content');

app.use('/status', statusRouter);
app.use('/reload', reloadRouter);
app.use('/', contentRouter);

// start reloader before listening
reload();

app.listen(port, () => console.log(`CCV Content App listening on port ${port}!`));

app.use(function (_req, _res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, _next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({ error: err });
});


module.exports = app;
