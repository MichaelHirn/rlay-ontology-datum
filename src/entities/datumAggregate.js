const { Mixin } = require('mixwith');
const pLimit = require('p-limit');
const { DatumDatumMixin } = require('./datum.js');

const DatumDatumAggregateMixin = Mixin((superclass) => class extends superclass {
  static from (_propertySchemaPayload, datum) {
    if (!(datum instanceof DatumDatumMixin)) {
      throw new Error('invalid input: expected input to be instance of DatumDatumMixin');
    }

    const propertySchemaPayload = new this.client.SchemaPayload(
      this.client,
      _propertySchemaPayload
    );
    const individual = super.from(propertySchemaPayload.toIndividualEntityPayload());

    // the properties from datum
    const datumPropertiesSchemaPayload = new this.client.SchemaPayload(
      this.client,
      datum.properties
    );
    datumPropertiesSchemaPayload.schemaAssertions.forEach(assertion => {
      assertion.payload.subject = individual.cid;
    });
    // the datumAggregate class
    const da = this.client.datumDatumAggregateClass.from({subject: individual.cid});
    // the link from this -> datum
    const dA2D = this.client.datumDatumObjectProperty.from({
      target: datum.cid,
      subject: individual.cid
    });
    // the link from datum <- this
    const d2DA = this.client.datumDatumAggregateObjectProperty.from({
      target: individual.cid,
      subject: datum.cid
    });
    // the datumPrefixDataProperty
    const dPrefix = this.client.datumPrefixDataProperty.from({
      subject: individual.cid,
      target: datum.datumPrefixDataProperty
    });
    individual.$$datum = {
      entityDependencies: [
        ...propertySchemaPayload.schemaAssertions,
        ...datumPropertiesSchemaPayload.schemaAssertions,
        da,
        dA2D,
        d2DA,
        dPrefix
      ]
    };
    return individual;
  }

  static async create (_propertySchemaPayload, datum) {
    const entity = this.from(_propertySchemaPayload, datum);
    await entity.create();
    return entity;
  }

  async create () {
    const limit = pLimit(1);
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
    return this[`${this.datumPrefixDataProperty}.${fieldName}.${fieldType}`];
  }
});

module.exports = { DatumDatumAggregateMixin }
