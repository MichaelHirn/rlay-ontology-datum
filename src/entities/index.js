const datumEntities = require('./datum.js');
const datumAggregateEntities = require('./datumAggregate.js');

module.exports = {
  ...datumEntities,
  ...datumAggregateEntities
};
