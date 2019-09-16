# Rlay Ontology: Airtable

This module exposes high-level rlay entities for easy integration with Airtable

It exposes a `AirtableRecord` entity that implements a custom `static from` and `create` which allows to write any individual entity to an airtable table and then stores a custom `AirtableRecord` individual which link to each other. Next time the `.create` method is called the record will be updated instead of newly created.

Example

```js
// create any rlay individual entity
const indi = await rlayClient.Individual.create({
  customAttr1: true,
  customAttr2: 'a name'
});
// turn it into a `AirtableRecord` individual
airEntity = AirtableRecordMock.from(indi.payload);
await airEntity.resolve();
// create that individual on Airtable
await airEntity.create({ Name: airEntity.customAttr2, CID: airEntity.cid });

// some time later; elsewhere

// we fetch the same indi that we created earlier
const indi = await rlayClient.Individual.find(`itsCid`);
// turn it into a `AirtableRecord` individual
airEntity = AirtableRecordMock.from(indi.payload);
await airEntity.resolve();
// as we created it earlier, it will update the airtable record and not create a new one
await airEntity.create({ Name: airEntity.customAttr2, CID: airEntity.cid });
```
