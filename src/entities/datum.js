const { Mixin } = require('mixwith');
const { RlayTransform } = require('@rlay/transform');
const pLimit = require('p-limit');

const DatumDatumMixin = Mixin((superclass) => {
  class MixinClass extends superclass {
    static from (jsonObject, options = {transform: {}}) {
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
      const entity = this.from(jsonObject, options);
      await entity.create();
      return entity;
    }

    static $updateClientWithGeneratedSchema () {
      this.client.initSchema(
        this.$$datum.RlayTransform.getRlaySchemaCidIndex(),
        this.$$datum.RlayTransform.getRlaySchemaObjectIndex());
      this.client.initClient();
    }

    async create () {
      const limit = pLimit(1);
      if (this.$$datum.schemaRegistry) {
        await this.$$datum.schemaRegistry.writeSchemaFromClient(this.client)
      }
      await Promise.all(
        this.$$datum.entityDependencies.map(e => limit(async () => e.create())));
      await super.create();
      await this.resolve();
      return this;
    }

    field (fieldName, fieldType = 'DataProperty') {
      if (!this.datumPrefixDataProperty) {
        throw new Error('unable to find .datumPrefixDataProperty; make sure it the entity is created and resolved');
      }
      return this.properties[`${this.datumPrefixDataProperty}.${fieldName}.${fieldType}`];
    }
  }

  MixinClass.$$datum = { RlayTransform }
  return MixinClass;
});

module.exports = { DatumDatumMixin }
