import fs from 'fs';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY);
let seed = JSON.parse(fs.readFileSync('data/seed.json'));

let seedEntities = Object.keys(seed);
console.log(`discovered ${seedEntities.length} seed entities.`);
seedEntities.forEach(seedEntityPlural => {
  let seedEntitySingular;
  switch (seedEntityPlural) {
    default:
      seedEntitySingular = seedEntityPlural.slice(0, -1);
      break;
  }
  console.log(`- processing seed entity: "${seedEntityPlural}".`);

  console.log(`  - discovered ${seed[seedEntityPlural].length} seed ${seedEntityPlural}.`);

  stripe[seedEntityPlural].list().then(x => x.data).then(stripeEntities => {
    console.log(`  - discovered ${stripeEntities.length} stripe ${seedEntityPlural}.`);
    seed[seedEntityPlural].forEach(seedEntity => {
      console.log(`  - processing seed ${seedEntitySingular}: "${seedEntity.name}".`);
      if (stripeEntities.some(x => x.name === seedEntity.name)) {
        // seed entity exists as a stripe entity
        let stripeEntity = stripeEntities.find(x => x.name === seedEntity.name);
        console.log(`    - seed ${seedEntitySingular}: "${seedEntity.name}" discovered in stripe with id: "${stripeEntity.id}".`);
        if (Object.keys(seedEntity).every(x => seedEntity[x] === stripeEntity[x])) {
          // seed entity matches stripe entity
          console.log(`    - all seed ${seedEntitySingular} properties match stripe ${seedEntitySingular} properties.`);
        } else {
          // seed entity differs from stripe entity
          console.log(`    - one or more seed ${seedEntitySingular} properties differ from stripe ${seedEntitySingular} properties. update queued...`);
          stripe[seedEntityPlural].update(
            stripeEntity.id,
            seedEntity
          ).then(stripeEntityUpdateResponse => {
            // stripe entity update succeeded
            console.log(`stripe ${seedEntitySingular}: "${stripeEntityUpdateResponse.name}", with id: "${stripeEntityUpdateResponse.id}" updated.`);
          }).catch(stripeEntityUpdateError => {
            // stripe entity update failed
            console.log(`stripe ${seedEntitySingular}: "${stripeEntity.name}", with id: "${stripeEntity.id}" update failed.`);
            console.error(stripeEntityUpdateError);
          });
        }
      } else {
        // seed entity does not exist as a stripe entity
        console.log(`    - seed ${seedEntitySingular}: "${seedEntity.name}" not detected in stripe ${seedEntitySingular} list. create queued...`);
        stripe[seedEntityPlural].create(seedEntity).then(stripeEntityCreateResponse => {
          // stripe entity create succeeded
          console.log(`stripe ${seedEntitySingular}: "${stripeEntityCreateResponse.name}", created with id: "${stripeEntityCreateResponse.id}".`);
        }).catch(stripeEntityCreateError => {
          // stripe entity create failed
          console.log(`stripe ${seedEntitySingular}: "${stripeEntity.name}", create failed.`);
          console.error(stripeEntityCreateError);
        });
      }
    });
  });
});

