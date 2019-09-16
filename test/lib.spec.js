/* eslint-env node, mocha */
const simple = require('simple-mock');
const sinon = require('sinon');
const assert = require('assert');
const rlayClient = require('../src');

const datumFactories = (client, startWith = 'Datum') => {
  return Object.keys(client).filter(key => key.startsWith(startWith))
}

describe('RlayOntologyDatum', () => {
  let rlayClientCreateStub, schemaRegistrySpy;
  before(() => {
    // setup spies and stubs
    rlayClientCreateStub = sinon.stub(rlayClient, 'createEntity').resolves('0x000');
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
      const rlayClient = require('../src');
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
        assert.equal(datumEntity.$$datum.entityDependencies.length, 7);
      });

      it('asserts correct DatumDatumClass', () => {
        const ca = datumEntity.$$datum.entityDependencies.slice(-1)[0];
        assert.equal(ca.payload.type, 'ClassAssertion');
        assert.equal(ca.payload.subject, datumEntity.cid);
        assert.equal(ca.payload.class, rlayClient.schema.datumDatumClass.cid);
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

    describe('.create', () => {
      let staticFromSpy, datumEntityCreateSpy;
      let datumStaticFromStub;
      before(() => rlayClientCreateStub.resetHistory());
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
        assert.equal(rlayClientCreateStub.callCount, depCount + 1);
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
        }
        datumAggEntity = DatumAggMock.from({datumDatumAggregateClass: true}, datumEntity);
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
        assert.equal(datumAggEntity.$$datum.entityDependencies.length, 1 + 3);
      });

      it('asserts correct DatumDatumAggregateClass', () => {
        const ca = datumAggEntity.$$datum.entityDependencies.slice(-3)[0];
        assert.equal(ca.payload.type, 'ClassAssertion');
        assert.equal(ca.payload.subject, datumAggEntity.cid);
        assert.equal(ca.payload.class, rlayClient.schema.datumDatumAggregateClass.cid);
      });

      it('asserts correct DatumDatumAggregateObjectProperty', () => {
        const ca = datumAggEntity.$$datum.entityDependencies.slice(-2)[0];
        assert.equal(ca.payload.type, 'ObjectPropertyAssertion');
        assert.equal(ca.payload.subject, datumAggEntity.cid);
        assert.equal(ca.payload.property, rlayClient.schema.datumDatumObjectProperty.cid);
        assert.equal(ca.payload.target, datumEntity.cid);
      });

      it('asserts correct DatumDatumObjectProperty', () => {
        const ca = datumAggEntity.$$datum.entityDependencies.slice(-1)[0];
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
        const datumAggEntityFrom = DatumAggMock.from({datumDatumAggregateClass: true}, datumEntity);
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

    describe('.create', () => {
      let staticFromSpy, datumEntityCreateSpy;
      let datumStaticFromStub;
      before(() => rlayClientCreateStub.resetHistory());
      before(async () => {
        datumAggEntity = DatumAggMock.from({datumDatumAggregateClass: true}, datumEntity);
      });

      it('returns a DatumMock instance', () => {
        assert.equal(datumAggEntity instanceof rlayClient.DatumDatumAggregateMixin, true);
      });

      it('creates all entities in $$datum.entityDependencies', async () => {
        await datumAggEntity.create();
        const depCount = datumAggEntity.$$datum.entityDependencies.length
        assert.equal(rlayClientCreateStub.callCount, depCount + 1);
      });
    });
  });
});
