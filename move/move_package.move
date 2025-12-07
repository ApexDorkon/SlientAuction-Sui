module move_package::auction {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;
    use sui::table::{Self, Table};
    use std::vector;
    use std::string::{Self, String};
    use std::option::{Self, Option};

    const E_AUCTION_NOT_ACTIVE: u64 = 1;
    const E_NOT_AUTHORIZED: u64 = 2;
    const E_NO_BID_FOUND: u64 = 3;

    public struct AuctionRegistry has key, store {
        id: UID,
        active_auctions: vector<ID>,
    }

    public struct Auction<T: key + store> has key, store {
        id: UID,
        creator: address,
        name: String,
        description: String,
        supply: u64,
        authority_public_key: vector<u8>,
        active: bool,
        winner: address, 
        winning_bid: u64,
        asset: Option<T>,
        /// ESCROW: Stores SUI bids for each user
        bids: Table<address, Balance<SUI>>,
    }

    public struct BidEvent has copy, drop {
        auction_id: ID,
        bidder: address,
        encrypted_data: vector<u8>, 
    }

    public struct AuctionCreated has copy, drop {
        auction_id: ID,
        creator: address,
        name: String,
    }

    fun init(ctx: &mut TxContext) {
        let registry = AuctionRegistry {
            id: object::new(ctx),
            active_auctions: vector::empty(),
        };
        transfer::share_object(registry);
    }

    public entry fun create_auction<T: key + store>(
        registry: &mut AuctionRegistry,
        item: T, 
        name: vector<u8>,
        description: vector<u8>,
        supply: u64,
        authority_key: vector<u8>,
        ctx: &mut TxContext
    ) {
        let auction = Auction<T> {
            id: object::new(ctx),
            creator: tx_context::sender(ctx),
            name: string::utf8(name),
            description: string::utf8(description),
            supply,
            authority_public_key: authority_key,
            active: true,
            winner: @0x0,
            winning_bid: 0,
            asset: option::some(item),
            bids: table::new(ctx), // Initialize the bid table
        };

        vector::push_back(&mut registry.active_auctions, object::id(&auction));
        event::emit(AuctionCreated {
            auction_id: object::id(&auction),
            creator: tx_context::sender(ctx),
            name: string::utf8(name),
        });
        transfer::share_object(auction);
    }

    /// Place Bid: NOW LOCKS SUI IN THE TABLE
    public entry fun place_bid<T: key + store>(
        auction: &mut Auction<T>, 
        payment: Coin<SUI>, 
        encrypted_bid: vector<u8>, 
        ctx: &mut TxContext
    ) {
        assert!(auction.active, E_AUCTION_NOT_ACTIVE);
        
        let bidder = tx_context::sender(ctx);
        let value = coin::value(&payment);

        // Add funds to the user's balance in the table
        if (!table::contains(&auction.bids, bidder)) {
            table::add(&mut auction.bids, bidder, coin::into_balance(payment));
        } else {
            let bal = table::borrow_mut(&mut auction.bids, bidder);
            balance::join(bal, coin::into_balance(payment));
        };

        event::emit(BidEvent {
            auction_id: object::id(auction),
            bidder,
            encrypted_data: encrypted_bid,
        });
    }

    /// Withdraw: Allows losers (or winners with change) to take back their SUI
    public entry fun withdraw<T: key + store>(
        auction: &mut Auction<T>,
        ctx: &mut TxContext
    ) {
        // Can only withdraw if auction is ended OR if you just want to cancel bid (optional design)
        // Here we allow withdraw anytime, but typically you'd lock during active auction.
        // For simplicity/safety, let's allow anytime (Cancel Bid).
        
        let bidder = tx_context::sender(ctx);
        assert!(table::contains(&auction.bids, bidder), E_NO_BID_FOUND);

        let my_balance = table::remove(&mut auction.bids, bidder);
        let my_coin = coin::from_balance(my_balance, ctx);
        transfer::public_transfer(my_coin, bidder);
    }

    /// Finalize 1: Single Winner (NFT)
    public entry fun finalize_nft<T: key + store>(
        auction: &mut Auction<T>,
        winner: address,
        price: u64,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == auction.creator, E_NOT_AUTHORIZED);
        assert!(table::contains(&auction.bids, winner), E_NO_BID_FOUND);

        auction.active = false;
        auction.winner = winner;
        auction.winning_bid = price;

        // 1. Send NFT to Winner
        if (option::is_some(&auction.asset)) {
            let item = option::extract(&mut auction.asset);
            transfer::public_transfer(item, winner);
        };

        // 2. Take Payment from Winner's Balance
        let winner_balance = table::borrow_mut(&mut auction.bids, winner);
        let payment = balance::split(winner_balance, price);
        
        // 3. Send Payment to Creator
        transfer::public_transfer(coin::from_balance(payment, ctx), auction.creator);
    }

    /// Finalize 2: Token Sale (Multi-Winner)
    /// This function takes vectors to distribute the Coin<Token> to multiple people
    /// Note: Generic C must be the Token type (e.g. DORUK_COIN)
    public entry fun finalize_token_sale<C>(
        auction: &mut Auction<Coin<C>>, // Expects the asset to be a Coin
        winners: vector<address>,
        token_amounts: vector<u64>,
        sui_payments: vector<u64>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == auction.creator, E_NOT_AUTHORIZED);
        auction.active = false;

        // Extract the Big Coin object
        let mut total_coin = option::extract(&mut auction.asset);
        
        let len = vector::length(&winners);
        let mut i = 0;
        
        while (i < len) {
            let winner = *vector::borrow(&winners, i);
            let token_amt = *vector::borrow(&token_amounts, i);
            let pay_amt = *vector::borrow(&sui_payments, i);

            // 1. Send Tokens to Winner
            let user_coin = coin::split(&mut total_coin, token_amt, ctx);
            transfer::public_transfer(user_coin, winner);

            // 2. Take SUI from Winner
            if (table::contains(&auction.bids, winner)) {
                let winner_balance = table::borrow_mut(&mut auction.bids, winner);
                // Ensure they have enough (safety check)
                if (balance::value(winner_balance) >= pay_amt) {
                    let payment = balance::split(winner_balance, pay_amt);
                    transfer::public_transfer(coin::from_balance(payment, ctx), auction.creator);
                }
            };

            i = i + 1;
        };

        // If any tokens left (unsold), send back to creator
        if (coin::value(&total_coin) > 0) {
            transfer::public_transfer(total_coin, auction.creator);
        } else {
            coin::destroy_zero(total_coin);
        };
    }
}