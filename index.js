import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY);

[
  {
    name: 'bike parking: bicycle',
    description: 'one bicycle space on the shared bike lock rack'
  },
  {
    name: 'bike parking: enduro',
    description: 'one small motorcycle space in the shared bike parking room'
  },
  {
    name: 'bike parking: pro',
    description: 'one large motorcycle space in the shared bike parking room'
  },
  {
    name: 'mama bear: small locker',
    description: '2.5 square metre private locker storage room'
  },
  {
    name: 'mama bear: medium locker',
    description: '5 square metre private locker storage room'
  }
].map(x => {
  stripe.products.create(x);
});
