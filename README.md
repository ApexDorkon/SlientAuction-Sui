# 🔒 SilentAuction (Powered by Nautilus)

> **A privacy-first decentralized auction protocol on Sui. Enables fully encrypted, sealed-bid auctions with off-chain verifiable settlement using AWS Nitro Enclaves.**

![Network](https://img.shields.io/badge/Network-Sui%20Testnet-blue)
![Privacy](https://img.shields.io/badge/Privacy-Nautilus%20TEE-indigo)
![Security](https://img.shields.io/badge/Security-AWS%20Nitro-orange)
![License](https://img.shields.io/badge/License-MIT-green)

## 🏆 Project Highlights
* **Ankara Sui Hackathon Winner:** 
* **Live Demo:** [https://slientauction.netlify.app](https://slientauction.netlify.app)
* **Video Demo:** [](Coming Soon)

---

## 📖 The Problem
On public blockchains, **transparency is a bug, not a feature** for auctions.
* **Front-running:** Bots see your bid pending and outbid you by 1 cent.
* **Strategy Leaks:** "Whales" are afraid to bid large amounts because it signals the market.
* **Hype Manipulation:** Users bid just to pump the price, knowing they can withdraw later.

**SilentAuction** solves this by creating a **"Digital Black Box"** on Sui. Bids are encrypted client-side and only revealed inside a secure hardware enclave when the auction ends.

---

## 📸 Screenshots

| **The Marketplace** | **Encrypted Bidding** |
|:---:|:---:|
| ![Lobby](https://placehold.co/600x400?text=Lobby+Screenshot) | ![Bid Form](https://placehold.co/600x400?text=Bid+Form+Screenshot) |
| *Browse active privacy auctions* | *Client-side encryption in action* |

| **The Enclave Proof** | **Verifiable Settlement** |
|:---:|:---:|
| ![AWS Proof](https://placehold.co/600x400?text=AWS+Console+Proof) | ![Settlement](https://placehold.co/600x400?text=Sui+Transaction+Proof) |
| *AWS Nitro Enclave running in isolation* | *Final results posted on-chain* |

---

## 🏗️ Architecture & Logic

### 1. The Nautilus Enclave (Rust)
*Located in `src/main.rs`*

The "brain" of the operation runs inside an **AWS Nitro Enclave**, a physically isolated environment with no external network access (except via a secure proxy) and no persistent storage.

**The Algorithm:**
1.  **Key Generation:** On startup, the Enclave generates an ephemeral **ECIES Key Pair** (`secp256k1`). The Private Key never leaves the Enclave's RAM.
2.  **Decryption:** When the auction ends, it receives a list of encrypted bids. It uses the private key to reveal the `amount`, `price`, and `social_handle`.
3.  **Social Scoring:** It applies a multiplier logic (e.g., 2x for "whales" or early adopters) to rank bids based on reputation, not just capital.
4.  **Limit Order Clearing:** It filters bids based on `config_min` and `config_max` prices, distributing supply from highest score down.
5.  **Output:** Returns a vector of `winners`, `token_amounts`, and `sui_payments` to the frontend.

### 2. The Smart Contract (Sui Move)
*Located in `contracts/auction`*

The contract acts as a secure escrow and settlement layer.
* **`place_bid`:** Accepts SUI coins, locks them in a `Table`, and emits a `BidEvent` with the encrypted payload.
* **`finalize_token_sale`:** Called by the creator with the Enclave's result. It automatically splits tokens and transfers SUI payments in a single atomic transaction.

---

## 🚀 Setup & Installation Guide

### Prerequisites
* Node.js v18+ & NPM
* Rust & Cargo
* Docker (for building Enclave images)
* AWS CLI (configured with Nitro permissions)
* Sui CLI (Testnet)

Step 1: Deploy Smart Contracts
```bash
cd contracts/auction
sui client publish --gas-budget 100000000
# Note the Package ID and TreasuryCap ID for frontend config

Step 2: Build & Run the Nautilus Enclave

Must be run on an AWS EC2 instance with Nitro Enclaves enabled.
# SSH into AWS Instance
ssh -i nautilus-key.pem ec2-user@<AWS_PUBLIC_IP>

# Build the Enclave Image
cd nautilus
make ENCLAVE_APP=weather-example run

# Expose to Internet (HTTPS via ngrok)
sh expose_enclave.sh
ngrok http 3000

Step 3: Frontend Setup

cd hackTwoSui
npm install

# Configure Enclave URL in src/utils/socialBidding.ts
# const ENCLAVE_URL = "[https://your-ngrok-url.ngrok-free.app](https://your-ngrok-url.ngrok-free.app)";

npm run dev

🛠️ Tech Stack
Privacy: Nautilus Framework (AWS Nitro TEEs)

Blockchain: Sui Move

Frontend: React, TypeScript, Radix UI, Vite

Cryptography: eciesjs (Elliptic Curve Integrated Encryption Scheme)

Backend: Rust, Axum, Tokio

📄 License
MIT License. Copyright (c) 2025 SilentAuction Contributors.