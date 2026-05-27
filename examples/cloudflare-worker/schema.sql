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

create table if not exists zkpay_webhook_delivery (
  id integer primary key autoincrement,
  event_id text not null,
  payment_id text not null,
  event_type text not null,
  target_url text,
  ok integer not null,
  status integer,
  attempt_count integer not null,
  error text,
  completed_at text not null
);

create index if not exists zkpay_webhook_delivery_payment_id_idx
  on zkpay_webhook_delivery (payment_id);

create index if not exists zkpay_webhook_delivery_event_id_idx
  on zkpay_webhook_delivery (event_id);

create table if not exists zkpay_webhook_endpoints (
  id text primary key,
  merchant_id text,
  url text not null,
  headers_json text,
  event_types_json text,
  enabled integer not null default 1,
  created_at text not null,
  updated_at text not null
);

create index if not exists zkpay_webhook_endpoints_merchant_id_idx
  on zkpay_webhook_endpoints (merchant_id);

create index if not exists zkpay_webhook_endpoints_enabled_idx
  on zkpay_webhook_endpoints (enabled);
