// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

use anyhow::Result;
use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use ecies::{decrypt, utils::generate_keypair};
use fastcrypto::{ed25519::Ed25519KeyPair, traits::KeyPair};
use nautilus_server::common::get_attestation; 
use nautilus_server::AppState;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

// --- 1. DATA STRUCTURES FOR AUCTION ---

#[derive(Deserialize)]
struct SolveRequest {
    encrypted_bids: Vec<String>, 
    total_tokens: u64,
    cap_sui: f64,
}

#[derive(Deserialize, Debug)]
struct DecryptedBid {
    bidder: String,
    amount: f64,
    handle: String,
}

#[derive(Serialize)]
struct AuctionResult {
    winners: Vec<String>,
    token_amounts: Vec<String>,
    sui_payments: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct KeyPackage {
    sk_hex: String,
    pk_hex: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    // A. Generate Standard Attestation Key (Ed25519) - Required for Nautilus
    let eph_kp = Ed25519KeyPair::generate(&mut rand::thread_rng());

    // B. Generate Encryption Key (Secp256k1) - Required for Privacy
    // We generate this ONCE when the enclave starts.
    let (sk, pk) = generate_keypair();
    let sk_hex = hex::encode(sk.serialize());
    let pk_hex = hex::encode(pk.serialize());
    
    println!("Enclave Encryption Public Key: {}", pk_hex);

    // Pack keys into a JSON string to store in the existing 'api_key' field
    let keys = KeyPackage { sk_hex, pk_hex };
    let keys_json = serde_json::to_string(&keys).unwrap();

    // C. Initialize State
    // We hijack the `api_key` field to hold our encryption keys.
    let state = Arc::new(AppState { 
        eph_kp, 
        api_key: keys_json 
    });

    // D. Router Setup
    let cors = CorsLayer::new().allow_methods(Any).allow_headers(Any);

    let app = Router::new()
        .route("/", get(ping))
        // Original Nautilus Endpoint (Kept safe!)
        .route("/get_attestation", get(get_attestation)) 
        // Overridden Endpoints with our Logic
        .route("/health_check", get(custom_health_check))
        .route("/solve", post(solve_auction))
        .with_state(state)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    info!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app.into_make_service())
        .await
        .map_err(|e| anyhow::anyhow!("Server error: {e}"))
}

async fn ping() -> &'static str {
    "Pong!"
}

// --- 2. CUSTOM HANDLERS ---

// GET /health_check
// Returns the Encryption Public Key so the frontend knows how to encrypt.
async fn custom_health_check(State(state): State<Arc<AppState>>) -> Json<serde_json::Value> {
    // Extract the keys we hid in the api_key field
    let keys: KeyPackage = serde_json::from_str(&state.api_key).unwrap();
    
    Json(serde_json::json!({
        "status": "ok",
        "pk": keys.pk_hex // This is what the frontend needs!
    }))
}

// POST /solve
// The core auction logic
async fn solve_auction(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SolveRequest>,
) -> Json<AuctionResult> {
    // 1. Retrieve Private Key
    let keys: KeyPackage = serde_json::from_str(&state.api_key).unwrap();
    let sk_bytes = hex::decode(&keys.sk_hex).unwrap();

    let mut valid_bids = Vec::new();

    // 2. Decrypt Loop
    for enc_hex in payload.encrypted_bids {
        if let Ok(encrypted_bytes) = hex::decode(enc_hex) {
            // Decrypt using ecies
            if let Ok(decrypted_bytes) = decrypt(&sk_bytes, &encrypted_bytes) {
                if let Ok(bid_data) = serde_json::from_slice::<DecryptedBid>(&decrypted_bytes) {
                    
                    // 3. Social Scoring (Mock Logic)
                    let mut multiplier = 1.0;
                    if bid_data.handle.contains("whale") { multiplier = 2.0; }
                    else if bid_data.handle.len() < 5 { multiplier = 1.5; }

                    let score = bid_data.amount * multiplier;
                    valid_bids.push((bid_data, score));
                }
            }
        }
    }

    // 3. Sort
    valid_bids.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

    // 4. Distribute
    let mut current_raise = 0.0;
    let mut winners = Vec::new();
    let mut tokens = Vec::new();
    let mut payments = Vec::new();
    let sui_decimals = 1_000_000_000.0;

    for (bid, _score) in valid_bids {
        if current_raise >= payload.cap_sui { break; }

        let mut accepted_amount = bid.amount;
        if current_raise + accepted_amount > payload.cap_sui {
            accepted_amount = payload.cap_sui - current_raise;
        }

        let share = accepted_amount / payload.cap_sui;
        let token_allocation = (share * payload.total_tokens as f64).floor() as u64;

        if token_allocation > 0 {
            winners.push(bid.bidder);
            tokens.push(token_allocation.to_string());
            let mist_amt = (accepted_amount * sui_decimals).floor() as u64;
            payments.push(mist_amt.to_string());
        }
        current_raise += accepted_amount;
    }

    Json(AuctionResult {
        winners,
        token_amounts: tokens,
        sui_payments: payments,
    })
}