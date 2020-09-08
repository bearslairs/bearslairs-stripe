import fs from 'fs';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY);
let seed = JSON.parse(fs.readFileSync('data/seed.json'));
console.log(`discovered ${seed.products.length} seed products.`);
stripe.products.list().then(x => x.data).then(stripeProducts => {
  console.log(`discovered ${stripeProducts.length} stripe products.`);
  seed.products.forEach(seedProduct => {
    console.log(`- processing seed product: "${seedProduct.name}".`);
    if (stripeProducts.some(x => x.name === seedProduct.name)) {
      // seed product exists as a stripe product
      let stripeProduct = stripeProducts.find(x => x.name === seedProduct.name);
      console.log(`  - seed product: "${seedProduct.name}" discovered in stripe with id: "${stripeProduct.id}".`);
      if (Object.keys(seedProduct).every(x => seedProduct[x] === stripeProduct[x])) {
        // seed product matches stripe product
        console.log(`  - all seed product properties match stripe product properties.`);
      } else {
        // seed product differs from stripe product
        console.log(`  - one or more seed product properties differ from stripe product properties. update queued...`);
        stripe.products.update(
          stripeProduct.id,
          seedProduct
        ).then(stripeProductUpdateResponse => {
          console.log(`  - stripe product: "${stripeProductUpdateResponse.name}", with id: "${stripeProductUpdateResponse.id}" updated.`);
          //console.log(stripeProductUpdateResponse);
        }).catch(stripeProductUpdateError => {
          console.log(`  - stripe product: "${stripeProduct.name}", with id: "${stripeProduct.id}" update failed.`);
          console.error(stripeProductUpdateError);
        });
      }
    } else {
      // seed product does not exist as a stripe product
      console.log(`  - seed product: "${seedProduct.name}" not detected in stripe product list. create queued...`);
      stripe.products.create(seedProduct).then(stripeProductCreateResponse => {
        console.log(`  - stripe product: "${stripeProductCreateResponse.name}", created with id: "${stripeProductCreateResponse.id}".`);
        //console.log(stripeProductCreateResponse);
      }).catch(stripeProductCreateError => {
        console.log(`  - stripe product: "${stripeProduct.name}", create failed.`);
        console.error(stripeProductCreateError);
      });
    }
  });
});