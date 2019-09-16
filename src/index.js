
    const { Client } = require('@rlay/rlay-client-lib');
    const map = new Map();
    const entityFactories = require('./entities');

    const getClient = (config) => {
      const stringConfig = JSON.stringify(config);
      if (map.has(stringConfig)) {
        return map.get(stringConfig);
      } else {
        const client = new Client(config);
        const schemaCIDs = {"datumDatumClassLabel":"0x019580031b208125278b3af06157c63c6787a0104ab1206465f50d8aa8722b3c8d590ff9ca00","datumDatumClassDescription":"0x019580031b204a87f0e96d9b1551e200a0b5ac73c754577bd70fce214c25e46bb28fa886b7d4","datumDatumClass":"0x018080031b20abe42df5b1122349dd4c1102e0f1117e2dfce9f829999789c1a436d05e05ec91","datumDatumAggregateClassLabel":"0x019580031b205c2ccf4c225a459ca6ec3a7e32430c39320861b7ea02fed84c7800ae08f6980f","datumDatumAggregateClassDescription":"0x019580031b20cf414db67e6395e7a68874a4ba83290e4ddc2f3da0ab853b30cbfbec4a80ad5f","datumDatumAggregateClass":"0x018080031b202fb6ad73ff9df29e1d7bede5ab19b62caaa927176413481b16fcc564d6d88b95","datumDatumAggregateObjectPropertyLabel":"0x019580031b20b3bfa1c355b4b3560f365706d39b0a4e1a5e0e30b8021edb3e0f2a0b37a5327b","datumDatumAggregateObjectPropertyDescription":"0x019580031b20320a4a70122a13eff638a408668c4e8d178ffc9f2fcd261fe06f5716e7efb3ef","datumDatumAggregateObjectProperty":"0x019280031b207b1d769de2b4ede05d7ea5afaf360f6d8c37865f5e2e546e0cd9481f846405a9","datumDatumObjectPropertyLabel":"0x019580031b20c3810b8e8cfee7c4749300aed92823638c1eb9cf63ed80ce55e4ffe60ea871b4","datumDatumObjectPropertyDescription":"0x019580031b201d0552db56b6bfc4da1bd922a7836e1c6cb6015924b85ae0f484f3972cad54c3","datumDatumObjectProperty":"0x019280031b20408c7aa24561bbc1f8aeb918ac90ae22031cad0d3dd01a02e35ada2881659ddc","labelAnnotationProperty":"0x019780031b20b3179194677268c88cfd1644c6a1e100729465b42846a2bf7f0bddcd07e300a9","seeAlsoAnnotationProperty":"0x019780031b2073df9fe9531a29afa7435bb4564336d0613c2f5ca550dabd9427d8d854e01de5","commentAnnotationProperty":"0x019780031b20e77fddce0bc5ecd30e3959d43d9dc36ef5448a113b7524621bac9053c02b3319"};
        const schema = [{"key":"datumDatumClass","assertion":{"type":"Class","annotations":["0x019580031b208125278b3af06157c63c6787a0104ab1206465f50d8aa8722b3c8d590ff9ca00","0x019580031b204a87f0e96d9b1551e200a0b5ac73c754577bd70fce214c25e46bb28fa886b7d4"]}},{"key":"datumDatumAggregateClass","assertion":{"type":"Class","annotations":["0x019580031b205c2ccf4c225a459ca6ec3a7e32430c39320861b7ea02fed84c7800ae08f6980f","0x019580031b20cf414db67e6395e7a68874a4ba83290e4ddc2f3da0ab853b30cbfbec4a80ad5f"]}},{"key":"datumDatumAggregateObjectProperty","assertion":{"type":"ObjectProperty","annotations":["0x019580031b20b3bfa1c355b4b3560f365706d39b0a4e1a5e0e30b8021edb3e0f2a0b37a5327b","0x019580031b20320a4a70122a13eff638a408668c4e8d178ffc9f2fcd261fe06f5716e7efb3ef"]}},{"key":"datumDatumObjectProperty","assertion":{"type":"ObjectProperty","annotations":["0x019580031b20c3810b8e8cfee7c4749300aed92823638c1eb9cf63ed80ce55e4ffe60ea871b4","0x019580031b201d0552db56b6bfc4da1bd922a7836e1c6cb6015924b85ae0f484f3972cad54c3"]}}];

        client.initSchema(schemaCIDs, schema);
        client.initClient();

        // set the correct client for the entityFactories
        Object.keys(entityFactories).forEach(key => {
          if (!key.endsWith('Mixin')) entityFactories[key].client = client
        });
        Object.assign(client, entityFactories);

        map.set(stringConfig, client);
        return getClient(config);
      }
    }

    const t = getClient({});
    t.getClient = getClient;

    module.exports = t;
