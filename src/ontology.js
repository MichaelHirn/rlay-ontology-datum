const rlay = require('@rlay/web3-rlay');
const utils = require('./utils');

const classes = () => ({
  ...utils.class({
    name: 'datumDatum',
    label: 'Datum',
    description: 'A Datum individual. Many properties, usually no assertions',
  }),

  ...utils.class({
    name: 'datumDatumAggregate',
    label: 'DatumAggregate',
    description: 'A DatumAggregate individual. Few properties, usually many assertions',
  }),
});

const dataProperties = () => ({
  ...utils.dataProp({
    name: 'datumPrefix',
    label: 'Datum Prefix',
    description: 'The prefix that was used to generate the Datum. Includes RlayTransform',
  }),
})

const objectProperties = () => ({
  ...utils.objectProp({
    name: 'datumDatumAggregate',
    label: 'A Jigsaw Datum Aggregate Relationship',
    description: 'Points to the associated DatumAggregate',
  }),

  ...utils.objectProp({
    name: 'datumDatum',
    label: 'A Jigsaw Datum Relationship',
    description: 'Points to the associated Datum',
  }),
})

module.exports = {
  version: '2',
  includeImportsInOutput: true,
  imports: {
    ...rlay.builtins,
  },
  entities: {
    ...classes(),
    ...dataProperties(),
    ...objectProperties(),
  },
};
