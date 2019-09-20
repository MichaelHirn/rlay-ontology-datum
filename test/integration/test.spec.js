/* eslint-env node, mocha */
const assert = require('assert');
const rlayClient = require('../../src');

const jsonObject = { key: 'value' };
const transformOptions = {transform: {prefix: 'test'}};
const datumAggSchemaPayload = {
  'RlayTransform.test.key.DataProperty': 'valueTest'
}

const cleanEntity = (entity) => {
  return Object.keys(entity).
    filter(key => {
      const exclude = ['client', '_remoteCid', '_payload', 'cid', '$$datum'];
      return !exclude.includes(key)
    }).
    map(key => ({ key: key, value: entity[key] })).
    reduce((all, one) => {
      all[one.key] = one.value
      return all;
    }, {});
  //Reflect.deleteProperty(entity, 'client');
  //Reflect.deleteProperty(entity, '_remoteCid');
  //Reflect.deleteProperty(entity, '_payload');
  //Reflect.deleteProperty(entity, 'cid');
  //Reflect.deleteProperty(entity, '$$datum');
  //return entity;
}

describe('RlayOntologyDatum', () => {
  let DatumMock, DatumAggMock;
  let datumEntity;
  before(() => {
    return rlayClient.findEntityByCypher('MATCH (n) DETACH DELETE n');
  });
  before(() => {
    DatumMock = class extends rlayClient.DatumDatumMixin(rlayClient.Individual) { }
    DatumMock.client = rlayClient;
    DatumMock.type = rlayClient.Rlay_Individual.type;
    DatumMock.fields = rlayClient.Rlay_Individual.fields;
    DatumMock.fieldsDefault = rlayClient.Rlay_Individual.fieldsDefault;
  });
  before(() => {
    DatumAggMock = class extends rlayClient.DatumDatumAggregateMixin(rlayClient.Individual) { }
    DatumAggMock.client = rlayClient;
    DatumAggMock.type = rlayClient.Rlay_Individual.type;
    DatumAggMock.fields = rlayClient.Rlay_Individual.fields;
    DatumAggMock.fieldsDefault = rlayClient.Rlay_Individual.fieldsDefault;
  });

  describe('Datum', () => {
    it('returns a resolved and correct entity', async () => {
      datumEntity = DatumMock.from(jsonObject, transformOptions);
      await datumEntity.create();
      assert.deepEqual(cleanEntity(datumEntity),
        { properties:
          { 'RlayTransform.test.Class': true,
            'RlayTransform.test.key.DataProperty': 'value' },
          datumDatumClass: true,
          datumPrefixDataProperty: 'RlayTransform.test' }
      );
    });

    it('returns same result for static create and .create', async () => {
      const staticCreate = await DatumMock.create(jsonObject, transformOptions);
      const dotCreate = await DatumMock.from(jsonObject, transformOptions);
      // returns a ResolvedEntity <-> SchemaPayload
      await dotCreate.create();
      assert.deepEqual(staticCreate, dotCreate);
    });

    it('returns correct field value', () => {
      assert.equal(datumEntity.field('key'), 'value');
    });
  });

  let datumAggEntity;
  describe('DatumAggregate', () => {
    it('returns a resolved and correct DatumAggregate', async () => {
      datumAggEntity = await DatumAggMock.create(datumAggSchemaPayload, datumEntity);
      assert.deepEqual(cleanEntity(datumAggEntity),
        {
          properties: {
            'RlayTransform.test.key.DataProperty': 'valueTest'
          },
          datumDatumObjectProperty: await rlayClient.Individual.find(datumEntity.cid),
          datumDatumAggregateClass: true,
          'RlayTransform.test.Class': true,
          'RlayTransform.test.key.DataProperty': 'value',
          datumPrefixDataProperty: 'RlayTransform.test'
        }
      );
    });

    it('returns same result for static create and .create', async () => {
      const staticCreate = await DatumAggMock.create(datumAggSchemaPayload, datumEntity);
      const dotCreate = await DatumAggMock.from(datumAggSchemaPayload, datumEntity);
      // returns a ResolvedEntity <-> SchemaPayload
      await dotCreate.create();
      assert.deepEqual(staticCreate, dotCreate);
    });

    it('returns correct field value', async () => {
      assert.equal(datumAggEntity.field('key'), 'value');
    });
  });
});
