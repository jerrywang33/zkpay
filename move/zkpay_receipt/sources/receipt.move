module zkpay_receipt::receipt;

use std::string::{Self, String};
use sui::event;
use sui::tx_context::{Self, TxContext};

public struct PaymentBound has copy, drop {
    payer: address,
    receiver: address,
    amount_atomic: u64,
    coin_type: String,
    payment_id: String,
    nonce: String,
}

public entry fun bind(
    receiver: address,
    amount_atomic: u64,
    coin_type: vector<u8>,
    payment_id: vector<u8>,
    nonce: vector<u8>,
    ctx: &mut TxContext,
) {
    event::emit(PaymentBound {
        payer: tx_context::sender(ctx),
        receiver,
        amount_atomic,
        coin_type: string::utf8(coin_type),
        payment_id: string::utf8(payment_id),
        nonce: string::utf8(nonce),
    });
}
