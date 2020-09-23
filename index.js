import fs from 'fs';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY);
let seed = JSON.parse(fs.readFileSync('data/seed.json'));
let mock = JSON.parse(fs.readFileSync('data/mock.json'));
let merged = { ...seed, ...mock };

console.log(`discovered ${Object.keys(seed).length} seed entities.`);
console.log(`discovered ${Object.keys(mock).length} mock entities.`);

Object.keys(merged).forEach(entityPlural => {
  let entitySingular, entityIdentifier;
  switch (entityPlural) {
    case 'customers':
      entityIdentifier = 'email';
      entitySingular = entityPlural.slice(0, -1);
      break;
    case 'prices':
      entityIdentifier = 'nickname';
      entitySingular = entityPlural.slice(0, -1);
      break;
    default:
      entityIdentifier = 'name';
      entitySingular = entityPlural.slice(0, -1);
      break;
  }
  console.log(`- processing entity: "${entityPlural}".`);

  console.log(`  - discovered ${merged[entityPlural].length} ${entityPlural}.`);

  stripe[entityPlural].list({ limit: 100 }).then(x => x.data).then(stripeEntities => {
    console.log(`  - discovered ${stripeEntities.length} stripe ${entityPlural}.`);
    merged[entityPlural].forEach(entity => {
      console.log(`  - processing ${entitySingular}: "${entity[entityIdentifier]}".`);
      if (stripeEntities.some(x => x[entityIdentifier] === entity[entityIdentifier])) {
        // seed/mock entity exists as a stripe entity
        let stripeEntity = stripeEntities.find(x => x[entityIdentifier] === entity[entityIdentifier]);
        console.log(`    - ${entitySingular}: "${entity[entityIdentifier]}" discovered in stripe with id: "${stripeEntity.id}".`);
        if (Object.keys(entity).every(x => 
          (
            // strings, numbers, booleans
            (((typeof entity[x] === 'boolean') || (typeof entity[x] === 'number') || (typeof entity[x] !== 'string')) && (entity[x] === stripeEntity[x]))
            // arrays of scalars
            || ((Array.isArray(entity[x])) && (entity[x].length === stripeEntity[x].length && entity[x].every((value, index) => value === stripeEntity[x][index])))
            // todo: implement object diff
            || (typeof entity[x] === 'object')
          )
        )
          ) {
          // seed/mock entity matches stripe entity
          console.log(`    - all ${entitySingular} properties match stripe ${entitySingular} properties.`);
        } else {
          // seed/mock entity differs from stripe entity
          console.log(`    - one or more ${entitySingular} properties differ from stripe ${entitySingular} properties. update queued...`);
          switch (entitySingular) {
            case 'customer':
              // customer properties for which update is not supported
              delete entity.tax_id_data;
              break;
            case 'price':
              // price properties for which update is not supported
              delete entity.currency;
              delete entity.unit_amount;
              delete entity.recurring;
              break;
          }
          stripe[entityPlural].update(
            stripeEntity.id,
            entity
          ).then(stripeEntityUpdateResponse => {
            // stripe entity update succeeded
            console.log(`stripe ${entitySingular}: "${stripeEntityUpdateResponse[entityIdentifier]}", with id: "${stripeEntityUpdateResponse.id}" updated.`);
          }).catch(stripeEntityUpdateError => {
            // stripe entity update failed
            console.log(`stripe ${entitySingular}: "${stripeEntity[entityIdentifier]}", with id: "${stripeEntity.id}" update failed.`);
            console.error(stripeEntityUpdateError);
          });
        }
      } else {
        // seed/mock entity does not exist as a stripe entity
        console.log(`    - ${entitySingular}: "${entity[entityIdentifier]}" not detected in stripe ${entitySingular} list. create queued...`);
        switch (entitySingular) {
          case 'price':
            stripe.products.list({ limit: 100 }).then(x => x.data).then(products => {
              entity.product = products.find(x => x.name === entity[entityIdentifier].replace(/^(annual|corona|standard)\s/i, '')).id;
              stripe[entityPlural].create(entity).then(stripeEntityCreateResponse => {
                // stripe entity create succeeded
                console.log(`stripe ${entitySingular}: "${stripeEntityCreateResponse[entityIdentifier]}", created with id: "${stripeEntityCreateResponse.id}".`);
              }).catch(stripeEntityCreateError => {
                // stripe entity create failed
                console.log(`stripe ${entitySingular}: "${entity[entityIdentifier]}", create failed.`);
                console.error(stripeEntityCreateError);
              });
            }).catch(console.log);
            break;
          default:
            stripe[entityPlural].create(entity).then(stripeEntityCreateResponse => {
              // stripe entity create succeeded
              console.log(`stripe ${entitySingular}: "${stripeEntityCreateResponse[entityIdentifier]}", created with id: "${stripeEntityCreateResponse.id}".`);
            }).catch(stripeEntityCreateError => {
              // stripe entity create failed
              console.log(`stripe ${entitySingular}: "${entity[entityIdentifier]}", create failed.`);
              console.error(stripeEntityCreateError);
            });
            break;
        }
      }
    });
  }).catch(console.log);
});

