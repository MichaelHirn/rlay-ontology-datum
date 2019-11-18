/* eslint-env node, mocha */
const sinon = require('sinon');
const assert = require('assert');
const rlayClient = require('../src');
const check = require('check-types');

const datumFactories = (client, startWith = 'Datum') => {
  return Object.keys(client).filter(key => key.startsWith(startWith))
}

const countSinonCalls = stubs => {
  return stubs.
    map(stub => stub.args.reduce((all, one) => [...all, ...one], [])).
    reduce((all, one) => [...all, ...one], []).
    reduce((all, one) => {
      if (check.not.array(one)) return all + 1
      return all + one.length
    }, 0);
}

const cleanEntity = entity => {
  const object = {}
  const excluded = ['client', '$$datum'];
  Object.keys(entity).forEach(key => {
    if(!excluded.includes(key)) {
      object[key] = entity[key]
    }
  })
  return object;
}

describe('RlayOntologyDatum', () => {
  let rlayClientCreateStub, rlayClientCreateEntitiesStub, schemaRegistrySpy;
  before(() => {
    // setup spies and stubs
    rlayClientCreateStub = sinon.stub(rlayClient, 'createEntity').resolves('0x000');
    rlayClientCreateEntitiesStub = sinon.stub(rlayClient, 'createEntities').resolves(['0x000']);
    sinon.stub(rlayClient, 'findEntityByCID').resolves({type: 'Individual'});
    sinon.stub(rlayClient, 'findEntityByCypher').resolves([{type: 'Individual'}]);
    schemaRegistrySpy = { writeSchemaFromClient: () => {} };
    sinon.spy(schemaRegistrySpy, 'writeSchemaFromClient');
  });
  describe('module', () => {
    it('returns a proper rlay-client', () => {
      /* eslint-disable-next-line global-require */
      const schemaCids = require('../src/generated/cids.json');
      Object.keys(schemaCids).forEach(schemaCidKey => {
        assert.equal(rlayClient.schema[schemaCidKey] instanceof Object, true);
      });
    });

    it('has the special entityFactories attached', () => {
      const expectedEntityFactories = [
        'DatumDatumMixin',
        'DatumDatumAggregateMixin',
      ];
      assert.deepEqual(datumFactories(rlayClient).sort(), expectedEntityFactories.sort());
    });
  });

  let DatumMock;
  describe('Datum', () => {
    let datumEntity;
    let toRlayEntitiesSpy, $updateClientWithGeneratedSchemaSpy;
    before(() => {
      DatumMock = class extends rlayClient.DatumDatumMixin(rlayClient.Individual) { }
      DatumMock.client = rlayClient;
      DatumMock.type = rlayClient.Rlay_Individual.type;
      DatumMock.fields = rlayClient.Rlay_Individual.fields;
      DatumMock.fieldsDefault = rlayClient.Rlay_Individual.fieldsDefault;
    });
    before(() => {
      // setup spies and stubs
      toRlayEntitiesSpy = sinon.spy(DatumMock.$$datum.RlayTransform, 'toRlayEntities');
      $updateClientWithGeneratedSchemaSpy = sinon.spy(DatumMock, '$updateClientWithGeneratedSchema');
    });

    describe('static from', () => {
      before(() => rlayClientCreateStub.resetHistory());
      before(() => {
        datumEntity = DatumMock.from({key: 'value'}, {transform: {prefix: 'test'}});
      })

      context('options: transform.unordered = true', () => {
        let toUnorderedJsonSpy, datumEntityUnorderedJson;
        before(() => {
          toUnorderedJsonSpy = sinon.spy(DatumMock.$$datum.RlayTransform, 'toUnorderedJson');
        });
        before(() => {
          datumEntityUnorderedJson = DatumMock.from({key: 'value'}, {transform: {
            unordered: true,
            prefix: 'test'
          }});
        });

        it('calls $$datum.RlayTransform.toUnorderedJson()', () => {
          assert.equal(toUnorderedJsonSpy.calledOnce, true);
        });
      });

      context('schemaRegistry', () => {
        let datumEntitySchemaRegistry;
        before(() => {
          DatumMock.$$datum.schemaRegistry = schemaRegistrySpy;
          datumEntitySchemaRegistry = DatumMock.from({key: 'value'}, {transform: {
            unordered: true,
            prefix: 'test'
          }});
        });

        it('passes schemaRegistry on', () => {
          assert.equal(datumEntitySchemaRegistry.$$datum.schemaRegistry, schemaRegistrySpy);
        });
      });

      it('returns a Datum instance', () => {
        assert.equal(datumEntity instanceof rlayClient.DatumDatumMixin, true);
      });

      it('calls $$datum.RlayTransform.toRlayEntities()', () => {
        assert.equal(toRlayEntitiesSpy.calledOnce, true);
      });

      it('calls $updateClientWithGeneratedSchema', () => {
        assert.equal($updateClientWithGeneratedSchemaSpy.calledOnce, true);
      });

      it('populates $$datum.entityDependencies correctly', () => {
        assert.equal(datumEntity.$$datum.entityDependencies.length, 8);
      });

      it('asserts correct DatumDatumClass', () => {
        const ca = datumEntity.$$datum.entityDependencies.slice(-1)[0];
        assert.equal(ca.payload.type, 'ClassAssertion');
        assert.equal(ca.payload.subject, datumEntity.cid);
        assert.equal(ca.payload.class, rlayClient.schema.datumDatumClass.cid);
      });

      it('asserts correct DatumPrefixDataProperty', () => {
        const ca = datumEntity.$$datum.entityDependencies.slice(-2)[0];
        assert.equal(ca.payload.type, 'DataPropertyAssertion');
        assert.equal(ca.payload.subject, datumEntity.cid);
        assert.equal(ca.payload.target, datumEntity.client.rlay.encodeValue('RlayTransform.test'));
      });
    });

    describe('static create', () => {
      let staticFromSpy, datumEntityCreateSpy;
      let datumStaticFromStub;
      before(() => rlayClientCreateStub.resetHistory());
      before(() => {
        // setup spies and stubs
        const datumEntityFrom = DatumMock.from({key: 'value'}, {transform: { prefix: 'test' }});
        datumEntityCreateSpy = sinon.spy(datumEntityFrom, 'create');
        datumStaticFromStub = sinon.stub(DatumMock, 'from').returns(datumEntityFrom);
      });
      before(async () => {
        datumEntity = await DatumMock.create({key: 'value'}, {transform: { prefix: 'test' }});
      });

      it('returns a DatumMock instance', () => {
        assert.equal(datumEntity instanceof DatumMock, true);
      });

      it('calls static from', () => {
        assert.equal(datumStaticFromStub.calledOnce, true);
      });

      it('calls create', () => {
        assert.equal(datumEntityCreateSpy.calledOnce, true);
      });
    });

    describe('static mcreate', () => {
      let staticFromSpy, datumEntityCreateSpy;
      let payloadCounter, findCounter;
      before(() => rlayClientCreateStub.resetHistory());
      before(() => rlayClientCreateEntitiesStub.resetHistory());
      before(() => rlayClient.findEntityByCypher.resetHistory());
      before(async () => {
        // we create 2 datums the normal way
        await DatumMock.create({key: 'value1'}, {transform: { prefix: 'test' }});
        await DatumMock.create({key: 'value2'}, {transform: { prefix: 'test' }});
        // now we record all the payloads we sent
        payloadCounter = countSinonCalls([
          rlayClientCreateStub,
          rlayClientCreateEntitiesStub
        ]);
        // and the find counter to measure .resolve calls
        findCounter = rlayClient.findEntityByCypher.args.length;
      });
      before(() => rlayClientCreateStub.resetHistory());
      before(() => rlayClientCreateEntitiesStub.resetHistory());
      before(() => rlayClient.findEntityByCypher.resetHistory());

      it('send the same payloads as all via create', async () => {
        await DatumMock.mcreate(
          [{key: 'value1'}, {key: 'value2'}],
          {transform: { prefix: 'test' }});

        const newPayloadCounter = countSinonCalls([
          rlayClientCreateStub,
          rlayClientCreateEntitiesStub
        ]);

        assert.equal(newPayloadCounter, payloadCounter);
        assert.equal(rlayClient.findEntityByCypher.args.length, findCounter);
      });

      it('return the resolved datums correctly', async () => {
        const response = (await DatumMock.mcreate(
          [{key: 'value1'}, {key: 'value2'}],
          {transform: { prefix: 'test' }})).map(cleanEntity);
        const d1 = cleanEntity(await DatumMock.create({key: 'value1'}));
        const d2 = cleanEntity(await DatumMock.create({key: 'value2'}));
        assert.deepEqual(response, [d1, d2]);
      });
    });

    describe('.create', () => {
      let staticFromSpy, datumEntityCreateSpy;
      let datumStaticFromStub;
      before(() => rlayClientCreateStub.resetHistory());
      before(() => rlayClientCreateEntitiesStub.resetHistory());
      before(async () => {
        datumEntity = DatumMock.from({key: 'value'}, {transform: { prefix: 'test' }});
      });

      context('schemaRegistry', () => {
        let datumEntitySchemaRegistry;
        before(() => schemaRegistrySpy.writeSchemaFromClient.resetHistory());
        before(() => {
          DatumMock.$$datum.schemaRegistry = schemaRegistrySpy;
          datumEntitySchemaRegistry = DatumMock.from({key: 'value'}, {transform: {
            unordered: true,
            prefix: 'test'
          }});
        });

        it('calls $$datum.schemaRegistry.writeSchemaFromClient', async () => {
          await datumEntitySchemaRegistry.create();
          assert.equal(schemaRegistrySpy.writeSchemaFromClient.callCount, 1);
          assert.equal(schemaRegistrySpy.writeSchemaFromClient.lastCall.lastArg, rlayClient);
        });
      })

      it('returns a DatumMock instance', () => {
        assert.equal(datumEntity instanceof DatumMock, true);
      });

      it('creates all entities in $$datum.entityDependencies', async () => {
        await datumEntity.create();
        const depCount = datumEntity.$$datum.entityDependencies.length
        assert.equal(rlayClientCreateStub.callCount, 1);
        assert.equal(rlayClientCreateEntitiesStub.callCount, 1);
        assert.equal(rlayClientCreateEntitiesStub.args[0][0].length, depCount);
      });
    });
  });

  describe('DatumAggregate', () => {
    let DatumAggMock, datumAggEntity, datumEntity;
    before(() => {
      DatumAggMock = class extends rlayClient.DatumDatumAggregateMixin(rlayClient.Individual) { }
      DatumAggMock.client = rlayClient;
      DatumAggMock.type = rlayClient.Rlay_Individual.type;
      DatumAggMock.fields = rlayClient.Rlay_Individual.fields;
      DatumAggMock.fieldsDefault = rlayClient.Rlay_Individual.fieldsDefault;
    });
    before(() => {
      // setup spies and stubs
    });

    describe('static from', () => {
      before(() => rlayClientCreateStub.resetHistory());
      before(() => {
        datumEntity = DatumMock.from({key: 'value'}, {transform: { prefix: 'test' }});
        // we fake a .resolve here
        datumEntity.properties = {
          datumDatumClass: true
        };
        datumEntity.datumPrefixDataProperty = 'RlayTransform.test'
        datumAggEntity = DatumAggMock.from(
          datumEntity, {datumDatumAggregateClass: true});
      })
      context('invalid input: not a datum instance', () => {
        it('throws', () => {
          assert.throws(() => DatumAggMock.from({key: 'value'}),
            /expected input to be instance of DatumDatumMixin/u);
        });
      });

      it('returns a DatumAggregate instance', () => {
        assert.equal(datumAggEntity instanceof rlayClient.DatumDatumAggregateMixin, true);
      });

      it('populates $$datum.entityDependencies correctly', () => {
        assert.equal(datumAggEntity.$$datum.entityDependencies.length, 1 + 5);
      });

      it('asserts correct DatumDatumAggregateClass', () => {
        const ca = datumAggEntity.$$datum.entityDependencies.slice(-4)[0];
        assert.equal(ca.payload.type, 'ClassAssertion');
        assert.equal(ca.payload.subject, datumAggEntity.cid);
        assert.equal(ca.payload.class, rlayClient.schema.datumDatumAggregateClass.cid);
      });

      it('asserts correct DatumPrefixDataProperty', () => {
        const ca = datumAggEntity.$$datum.entityDependencies.slice(-1)[0];
        assert.equal(ca.payload.type, 'DataPropertyAssertion');
        assert.equal(ca.payload.subject, datumAggEntity.cid);
        assert.equal(ca.payload.property, rlayClient.schema.datumPrefixDataProperty.cid);
        assert.equal(ca.payload.target, datumEntity.client.rlay.encodeValue('RlayTransform.test'));
      });

      it('asserts correct DatumDatumAggregateObjectProperty', () => {
        const ca = datumAggEntity.$$datum.entityDependencies.slice(-3)[0];
        assert.equal(ca.payload.type, 'ObjectPropertyAssertion');
        assert.equal(ca.payload.subject, datumAggEntity.cid);
        assert.equal(ca.payload.property, rlayClient.schema.datumDatumObjectProperty.cid);
        assert.equal(ca.payload.target, datumEntity.cid);
      });

      it('asserts correct DatumDatumObjectProperty', () => {
        const ca = datumAggEntity.$$datum.entityDependencies.slice(-2)[0];
        assert.equal(ca.payload.type, 'ObjectPropertyAssertion');
        assert.equal(ca.payload.subject, datumEntity.cid);
        assert.equal(ca.payload.property, rlayClient.schema.datumDatumAggregateObjectProperty.cid);
        assert.equal(ca.payload.target, datumAggEntity.cid);
      });

      it('does not call rlayClient.createEntity', () => {
        assert.equal(rlayClientCreateStub.callCount, 0);
      });
    });

    describe('static create', () => {
      let staticFromSpy, datumEntityCreateSpy;
      let datumStaticFromStub;
      before(() => rlayClientCreateStub.resetHistory());
      before(() => {
        // setup spies and stubs
        const datumAggEntityFrom = DatumAggMock.from(
          datumEntity, {datumDatumAggregateClass: true});
        datumEntityCreateSpy = sinon.spy(datumAggEntityFrom, 'create');
        datumStaticFromStub = sinon.stub(DatumAggMock, 'from').returns(datumAggEntityFrom);
      });
      before(async () => {
        datumAggEntity = await DatumAggMock.create(datumEntity, {datumDatumAggregateClass: true});
      });

      it('returns a DatumMock instance', () => {
        assert.equal(datumAggEntity instanceof rlayClient.DatumDatumAggregateMixin, true);
      });

      it('calls static from', () => {
        assert.equal(datumStaticFromStub.calledOnce, true);
      });

      it('calls create', () => {
        assert.equal(datumEntityCreateSpy.calledOnce, true);
      });
    });

    describe('static mcreate', () => {
      let staticFromSpy, datumEntityCreateSpy;
      let payloadCounter, findCounter;
      let d1, d2
      before(async () => {
        // we create 2 datums the normal way
        d1 = await DatumMock.create({key: 'value1'}, {transform: { prefix: 'test' }});
        d2 = await DatumMock.create({key: 'value2'}, {transform: { prefix: 'test' }});
        // reset stubs
        rlayClientCreateStub.resetHistory();
        rlayClientCreateEntitiesStub.resetHistory();
        rlayClient.findEntityByCypher.resetHistory();
        // we create the 2 datumAggs we are actually interested
        await DatumAggMock.create(d1, {datumDatumAggregateClass: true});
        await DatumAggMock.create(d2, {datumDatumAggregateClass: true});
        // now we record all the payloads we sent
        payloadCounter = countSinonCalls([
          rlayClientCreateStub,
          rlayClientCreateEntitiesStub
        ]);

        findCounter = rlayClient.findEntityByCypher.args.length;
      });
      before(() => rlayClientCreateStub.resetHistory());
      before(() => rlayClientCreateEntitiesStub.resetHistory());
      before(() => rlayClient.findEntityByCypher.resetHistory());

      it('send the same payloads as all via create', async () => {
        await DatumAggMock.mcreate([d1, d2], {datumDatumAggregateClass: true});

        const newPayloadCounter = countSinonCalls([
          rlayClientCreateStub,
          rlayClientCreateEntitiesStub
        ]);

        assert.equal(newPayloadCounter, payloadCounter);
        assert.equal(rlayClient.findEntityByCypher.args.length, findCounter);
      });

      it('return the resolved datums correctly', async () => {
        const response = (await DatumAggMock.mcreate(
          [d1, d2], {datumDatumAggregateClass: true})).map(cleanEntity);

        const da1 = cleanEntity(
          await DatumAggMock.create(d1, {datumDatumAggregateClass: true}));
        const da2 = cleanEntity(
          await DatumAggMock.create(d2, {datumDatumAggregateClass: true}));
        assert.deepEqual(response, [da1, da2]);
      });
    });

    describe('.create', () => {
      let staticFromSpy, datumEntityCreateSpy;
      let datumStaticFromStub;
      before(() => rlayClientCreateStub.resetHistory());
      before(() => rlayClientCreateEntitiesStub.resetHistory());
      before(async () => {
        datumAggEntity = DatumAggMock.from(datumEntity, {datumDatumAggregateClass: true});
      });

      it('returns a DatumMock instance', () => {
        assert.equal(datumAggEntity instanceof rlayClient.DatumDatumAggregateMixin, true);
      });

      it('creates all entities in $$datum.entityDependencies', async () => {
        await datumAggEntity.create();
        const depCount = datumAggEntity.$$datum.entityDependencies.length
        assert.equal(rlayClientCreateStub.callCount, 1);
        assert.equal(rlayClientCreateEntitiesStub.callCount, 1);
        assert.equal(rlayClientCreateEntitiesStub.args[0][0].length, depCount);
      });
    });
  });
});
