create table if not exists zkpay_sui_replay (
  payment_id text primary key,
  tx_digest text not null unique,
  amount text not null,
  coin text not null,
  receiver text not null,
  nonce text not null,
  settled_at text not null,
  verified_at text not null
);
