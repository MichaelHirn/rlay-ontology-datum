const { Mixin } = require('mixwith');
const pLimit = require('p-limit');
const { DatumDatumMixin } = require('./datum.js');
const debug = require('../debug.js').extend('datumAgg');

const mcreateResolveLimit = pLimit(1);

const DatumDatumAggregateMixin = Mixin((superclass) => class extends superclass {
  static from (_propertySchemaPayload, datum) {
    debug.extend('from')(this.cid);
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
    // the link from datum -> this
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
    debug.extend('create')(this.cid);
    const entity = this.from(_propertySchemaPayload, datum);
    await entity.create();
    return entity;
  }

  static async mcreate(_propertySchemaPayload, datums) {
    const entities = datums.
      map(datum => {
        // from and split into deps and entity for later
        const datumEntity = this.from(_propertySchemaPayload, datum);
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
    return Promise.all(entities.entities.map(entity => {
      return mcreateResolveLimit(async () => {
        await entity.resolve();
        return entity;
      })
    }));
  }

  async create () {
    debug.extend('create')(this.cid);
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
    return this.fieldAssert(fieldName, fieldType);
  }

  fieldAssert (fieldName, fieldType = 'DataProperty') {
    if (!this.datumPrefixDataProperty) {
      throw new Error('unable to find .datumPrefixDataProperty; make sure it the entity is created and resolved');
    }
    return this[`${this.datumPrefixDataProperty}.${fieldName}.${fieldType}`];
  }
});

module.exports = { DatumDatumAggregateMixin }
