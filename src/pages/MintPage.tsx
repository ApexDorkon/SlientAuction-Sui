import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Box, Flex, Heading, Text, Button, TextField, Card, Grid, Avatar, Callout, Separator } from "@radix-ui/themes";
import { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { ViewState } from "../types";
import { parseInputToMist } from "../utils/formatting";

const PACKAGE_ID = "0xe1f938a310c951b735e0ae7fe3da6962d1dc807a651f5aa9a0fb0c7ecbf678ba"; 
const TREASURY_CAP_ID = "0x11ffc09db463944e60a2d400f3b554dbba05785e6b0a9c5062430f078e3257d6";

// FIX 1: Rename 'onNavigate' to '_onNavigate' to silence the "unused variable" error
export default function MintPage({ onNavigate: _onNavigate }: { onNavigate: (v: ViewState) => void }) {
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const account = useCurrentAccount();
    
    const [nftName, setNftName] = useState("Blue Horizon NFT");
    const [nftUrl, setNftUrl] = useState("https://api.dicebear.com/9.x/shapes/svg?seed=Blue");
    
    // FIX 2: Removed 'setNftDesc' because it was unused
    const [nftDesc] = useState("A unique digital collectible.");

    const [treasuryId, setTreasuryId] = useState(TREASURY_CAP_ID); 
    const [mintAmount, setMintAmount] = useState("1000");

    const handleMintNFT = () => {
        const tx = new Transaction();
        tx.moveCall({
            target: `${PACKAGE_ID}::test_nft::mint`,
            arguments: [tx.pure.string(nftName), tx.pure.string(nftDesc), tx.pure.string(nftUrl)]
        });
        signAndExecute({ transaction: tx }, { onSuccess: () => alert("NFT Minted!") });
    };

    const handleMintToken = () => {
        if (!treasuryId) { alert("Missing TreasuryCap ID"); return; }
        const amountMist = parseInputToMist(mintAmount);
        const tx = new Transaction();
        tx.moveCall({
            target: `${PACKAGE_ID}::doruk_coin::mint`,
            arguments: [
                tx.object(treasuryId),
                tx.pure.u64(amountMist),
                tx.pure.address(account?.address || "")
            ]
        });
        signAndExecute({ transaction: tx }, { onSuccess: () => alert("Tokens Minted!") });
    };

    return (
        <Flex direction="column" gap="5">
            <Box pb="4" style={{borderBottom: '1px solid rgba(99,102,241,0.2)'}}>
                <Heading size="8" style={{color: 'var(--indigo-11)', letterSpacing: '-0.5px', marginBottom: 8}}>Asset Faucet</Heading>
                <Text style={{color: '#475569', fontWeight: 500}} size="4">Mint test assets to experiment with the Nautilus privacy protocol.</Text>
            </Box>

            <Box
                style={{
                    background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                    borderRadius: 20,
                    padding: 24,
                    border: '1px solid rgba(99,102,241,0.25)',
                    marginBottom: 8
                }}
            >
                <Flex align="start" gap="3">
                    <Box style={{ fontSize: 28 }}>💎</Box>
                    <Box>
                        <Text size="3" weight="bold" style={{ color: 'var(--indigo-11)', marginBottom: 8, display: 'block' }}>
                            Test Assets for Privacy Auctions
                        </Text>
                        <Text size="2" style={{ color: '#475569', lineHeight: 1.7 }}>
                            Create NFTs or custom tokens to use in SilentAuction. Once minted, you can create privacy-preserving auctions 
                            where bids are encrypted using Nautilus TEE technology. All transactions are secured on the Sui blockchain.
                        </Text>
                    </Box>
                </Flex>
            </Box>

            <Grid columns={{ initial: "1", md: "2" }} gap="5">
                {/* NFT MINTER */}
                <Card size="4" style={{ 
                    background: 'white', 
                    borderRadius: 16,
                    border: '1px solid rgba(99,102,241,0.2)',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.1)'
                }}>
                    <Flex direction="column" gap="4">
                        <Flex align="center" gap="3">
                            <Box style={{ 
                                background: 'var(--indigo-9)', 
                                padding: 10, borderRadius: 10
                            }}>
                                <Text size="5" style={{color: 'white'}}>🎨</Text>
                            </Box>
                            <Heading size="4" style={{color: '#111827'}}>Mint Test NFT</Heading>
                        </Flex>
                        <Separator size="4" />
                        <Flex gap="4">
                            <Avatar 
                                src={nftUrl} 
                                fallback="?" 
                                size="7" 
                                radius="large" 
                                style={{ border: '1px solid var(--gray-5)' }} 
                            />
                            <Flex direction="column" gap="3" style={{ flexGrow: 1 }}>
                                <TextField.Root 
                                    variant="surface" 
                                    placeholder="Name" 
                                    value={nftName} 
                                    onChange={e=>setNftName(e.target.value)}
                                    style={{ background: 'var(--gray-2)' }} 
                                />
                                <TextField.Root 
                                    variant="surface" 
                                    placeholder="Image URL" 
                                    value={nftUrl} 
                                    onChange={e=>setNftUrl(e.target.value)}
                                    style={{ background: 'var(--gray-2)' }} 
                                />
                            </Flex>
                        </Flex>
                        <Button size="3" onClick={handleMintNFT} style={{ width: '100%', cursor: 'pointer' }}>Mint Item</Button>
                    </Flex>
                </Card>

                {/* TOKEN MINTER */}
                <Card size="4" style={{ 
                    background: 'white', 
                    borderRadius: 16,
                    border: '1px solid rgba(99,102,241,0.2)',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.1)'
                }}>
                    <Flex direction="column" gap="4">
                        <Flex align="center" gap="3">
                            <Box style={{ 
                                background: 'var(--teal-9)', 
                                padding: 10, borderRadius: 10
                            }}>
                                <Text size="5" style={{color: 'white'}}>💸</Text>
                            </Box>
                            <Heading size="4" style={{color: '#111827'}}>Mint Custom Tokens</Heading>
                        </Flex>
                        <Separator size="4" />
                        <Callout.Root color="indigo" size="1" variant="surface">
                            <Callout.Text style={{color: 'var(--indigo-11)'}}>Treasury Cap ID is pre-filled.</Callout.Text>
                        </Callout.Root>
                        <Flex direction="column" gap="3">
                             <label>
                                 <Text size="2" weight="bold" style={{color: '#374151'}}>Treasury Cap ID</Text>
                                 <TextField.Root 
                                    variant="surface" 
                                    value={treasuryId} 
                                    onChange={e=>setTreasuryId(e.target.value)} 
                                    style={{ background: 'var(--gray-2)' }}
                                 />
                             </label>
                             <label>
                                 <Text size="2" weight="bold" style={{color: '#374151'}}>Amount</Text>
                                 <TextField.Root 
                                    variant="surface" 
                                    value={mintAmount} 
                                    onChange={e=>setMintAmount(e.target.value)} 
                                    style={{ background: 'var(--gray-2)' }}
                                 />
                             </label>
                        </Flex>
                        <Button size="3" color="teal" onClick={handleMintToken} style={{ width: '100%', cursor: 'pointer' }}>Mint Tokens</Button>
                    </Flex>
                </Card>
            </Grid>
        </Flex>
    );
}