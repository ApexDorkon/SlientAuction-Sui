import { encrypt } from 'eciesjs'; 
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
}

// Ensure this matches your AWS IP
const ENCLAVE_URL = 'http://34.207.108.229:3000'; 

export interface SocialProfile {
    handle: string;
    platform: 'twitter' | 'discord';
    followers: number;
}

export interface BidEntry {
    bidder: string;
    amount: number;
    score: number;
    handle: string;
    encryptedHex: string;
}

export async function getEnclavePublicKey(): Promise<string> {
  try {
    const response = await fetch(`${ENCLAVE_URL}/health_check`);
    if (!response.ok) throw new Error('Enclave offline');
    const data = await response.json();
    return data.pk; 
  } catch (error) {
    console.error("Enclave Error:", error);
    throw error;
  }
}

// UPDATE: Added 'pricePerUnit' argument
export async function encryptBidForNautilus(
    amount: number, 
    pricePerUnit: number, // <--- NEW ARGUMENT
    profile: SocialProfile, 
    bidderAddress: string
): Promise<{bytes: Uint8Array, hex: string}> {
    
    const publicKeyHex = await getEnclavePublicKey();
    
    // UPDATE: Added 'price' to payload to match Rust 'DecryptedBid' struct
    const payload = {
        amount: amount,          // Total SUI
        price: pricePerUnit,     // Price per Token (Critical for Enclave Logic)
        handle: profile.handle,
        bidder: bidderAddress, 
        nonce: Math.random().toString(36).substring(7)
    };
    
    const dataBuffer = Buffer.from(JSON.stringify(payload));
    const encryptedBuffer = encrypt(Buffer.from(publicKeyHex, 'hex'), dataBuffer);
    
    return {
        bytes: new Uint8Array(encryptedBuffer),
        hex: encryptedBuffer.toString('hex')
    };
}

export function calculateSocialMultiplier(profile: SocialProfile): number {
    let multiplier = 1.0;
    if (profile.followers > 100000) multiplier = 2.0; 
    else if (profile.followers > 10000) multiplier = 1.5;
    else if (profile.followers > 1000) multiplier = 1.1;
    return multiplier;
}

export async function getEnclaveSolution(
    encryptedBids: string[],
    totalTokens: number,
    capSui: number
) {
    // We pass 0 for min/max here if not strict, or you can update this signature too.
    // For now, let's pass a wide range to ensure the enclave accepts it.
    // In AuctionDetail we will pass the real config values.
    
    return getEnclaveSolutionWithConfig(encryptedBids, totalTokens, 0, 1000000);
}

// UPDATE: New function to support Min/Max config passing
export async function getEnclaveSolutionWithConfig(
    encryptedBids: string[],
    totalTokens: number,
    minPrice: number,
    maxPrice: number
) {
    const response = await fetch(`${ENCLAVE_URL}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            encrypted_bids: encryptedBids,
            total_tokens: totalTokens,
            config_min: minPrice, // <--- Passing config to Enclave
            config_max: maxPrice
        })
    });

    if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Enclave Solve Failed: ${txt}`);
    }

    const result = await response.json();
    console.log("Enclave Result:", result);
    
    return {
        winners: result.winners,
        token_amounts: result.token_amounts, // Note: Rust returns snake_case
        tokenAmounts: result.token_amounts,  // Mapping for frontend camelCase
        sui_payments: result.sui_payments,
        suiPayments: result.sui_payments
    };
}