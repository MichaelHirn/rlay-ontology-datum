const { Mixin } = require('mixwith');
const pLimit = require('p-limit');

const DatumDatumAggregateMixin = Mixin((superclass) => class extends superclass {
  field (name, type = 'DataProperty') {
    return this[`${this.prePath()}.${name}.${type}`];
  }

  static from (_propertySchemaPayload, datum) {
    if (!(datum instanceof this.client.DatumDatumMixin)) {
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
    individual.$$datum = {
      entityDependencies: [
        ...datumPropertiesSchemaPayload.schemaAssertions,
        da,
        dA2D,
        d2DA
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
    return super.create();
  }
});

module.exports = { DatumDatumAggregateMixin }
