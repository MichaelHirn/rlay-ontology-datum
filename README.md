# Rlay Ontology: Datum

This module exposes high-level interface over [@rlay/transform](https://github.com/rlay-project/rlay-transform) for easier transformation and integration of non-rlay objects (e.g. JSON, XML, CSV, etc.).

## Architecture

This library uses a stacked approach of `Datum` -> `DatumAggregate`. Every non-rlay object can be turned into a `Datum` and every `Datum` can be turned into a `DatumAggregate`.

### `Datum`

The `Datum` uses `@rlay/transform` under the hood and guarantees that any generated schema is provided back to the client. If a schemaRegistry instance is provided, it will also write the auto-generated schema to the registry when a new `Datum` is created. With `.field`, `.fieldProperty`, and `.fieldAssert` it also provides an easy way to access the generated assertions. Under the hood it uses the `datumPrefixDatumProperty` for this.

### `DatumAggregate`

Many non-rlay objects cary an internal identifier, whenever that is the case it makes sense to transform the `Datum` into a `DatumAggregate`. This allows that data changes on the non-rlay object can be captured and rolled up into a 'static' representation, the `DatumAggregate`. With `.field`, `.fieldProperty`, and `.fieldAssert` it also provides an easy way to access the generated assertions. Under the hood it uses the `datumPrefixDatumProperty` for this.

## Usage

This package exposes only mixins and it is recommended to implement the mixins in your application for each non-rlay object type.

### Example

Datum*Mixin -> (CustomDatum*Mixin) -> CustomDatum* -> (CustomDatum*Factory)
