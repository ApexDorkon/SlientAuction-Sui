module move_package::test_nft {
    use sui::url::{Self, Url};
    use std::string::{Self, String};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::package;
    use sui::display;

    /// The NFT Struct
    public struct TestNFT has key, store {
        id: UID,
        name: String,
        description: String,
        url: Url,
    }

    /// OTW
    public struct TEST_NFT has drop {}

    fun init(witness: TEST_NFT, ctx: &mut TxContext) {
        let keys = vector[
            b"name".to_string(),
            b"image_url".to_string(),
            b"description".to_string(),
        ];
        let values = vector[
            b"{name}".to_string(),
            b"{url}".to_string(),
            b"{description}".to_string(),
        ];

        let publisher = package::claim(witness, ctx);
        let mut display = display::new_with_fields<TestNFT>(
            &publisher, keys, values, ctx
        );
        display::update_version(&mut display);

        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(display, tx_context::sender(ctx));
    }

    public entry fun mint(
        name: vector<u8>,
        desc: vector<u8>,
        url: vector<u8>,
        ctx: &mut TxContext
    ) {
        let nft = TestNFT {
            id: object::new(ctx),
            name: string::utf8(name),
            description: string::utf8(desc),
            url: url::new_unsafe_from_bytes(url)
        };
        transfer::public_transfer(nft, tx_context::sender(ctx));
    }
}