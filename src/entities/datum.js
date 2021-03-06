const { Mixin } = require('mixwith');
const { RlayTransform } = require('@rlay/transform');
const debug = require('../debug.js').extend('datum');

const DatumDatumMixin = Mixin((superclass) => {
  class MixinClass extends superclass {
    static from (jsonObject, options = {transform: {}}) {
      debug.extend('from')(this.cid);
      if (options.transform.unordered) {
        jsonObject = this.$$datum.RlayTransform.toUnorderedJson(jsonObject);
      }
      const entities = this.$$datum.RlayTransform.toRlayEntities(
        this.client, options.transform.prefix, jsonObject);
      // update the client
      this.$updateClientWithGeneratedSchema();
      const individual = new this(this.client, entities.slice(-1).pop().payload);
      const datumClassAssertion = this.client.datumDatumClass.
        from({subject: individual.cid});
      const prefixDataAssertion = this.client.datumPrefixDataProperty.from({
        subject: individual.cid,
        target: `RlayTransform.${options.transform.prefix}`
      });
      individual.$$datum = {
        entityDependencies: [
          ...entities.slice(0, -1),
          prefixDataAssertion,
          datumClassAssertion
        ],
        schemaRegistry: this.$$datum.schemaRegistry
      };
      return individual;
    }

    static async create (jsonObject, options = {transform: {}}) {
      debug.extend('create')(this.cid);
      const entity = this.from(jsonObject, options);
      await entity.create();
      return entity;
    }

    static async mcreate (jsonObjects, options = {transform: {}}) {
      const entities = jsonObjects.
        map(jsonObject => {
          // from and split into deps and entity for later
          const datumEntity = this.from(jsonObject, options);
          return {
            dependencies: datumEntity.$$datum.entityDependencies,
            entity: datumEntity
          };
        }).
        reduce((all, one) => {
          // aggregate them into one
          return {
            dependencies: [...all.dependencies, ...one.dependencies],
            entities: [...all.entities, one.entity]
          }
        }, { dependencies: [], entities: [] });

      const payloads = [...entities.dependencies, ...entities.entities].
        map(entity => entity.payload);

      await this.client.createEntities(payloads);

      // resolve all the datum entities and return them
      return Promise.all(entities.entities.map(async entity => {
        await entity.resolve();
        return entity;
      }));
    }

    static $updateClientWithGeneratedSchema () {
      this.client.initSchema(
        this.$$datum.RlayTransform.getRlaySchemaCidIndex(),
        this.$$datum.RlayTransform.getRlaySchemaObjectIndex());
      this.client.initClient();
    }

    async create () {
      debug.extend('create')(this.cid);
      if (this.$$datum.schemaRegistry) {
        await this.$$datum.schemaRegistry.writeSchemaFromClient(this.client)
      }
      await this.client.createEntities(
        this.$$datum.entityDependencies.map(e => e.payload));
      await super.create();
      await this.resolve();
      return this;
    }

    fieldProperty (fieldName, fieldType = 'DataProperty') {
      if (!this.datumPrefixDataProperty) {
        throw new Error('unable to find .datumPrefixDataProperty; make sure it the entity is created and resolved');
      }
      return this.properties[`${this.datumPrefixDataProperty}.${fieldName}.${fieldType}`];
    }

    field (fieldName, fieldType = 'DataProperty') {
      return this.fieldProperty(fieldName, fieldType);
    }

    fieldAssert (fieldName, fieldType = 'DataProperty') {
      if (!this.datumPrefixDataProperty) {
        throw new Error('unable to find .datumPrefixDataProperty; make sure it the entity is created and resolved');
      }
      return this[`${this.datumPrefixDataProperty}.${fieldName}.${fieldType}`];
    }
  }

  MixinClass.$$datum = { RlayTransform }
  return MixinClass;
});

module.exports = { DatumDatumMixin }
