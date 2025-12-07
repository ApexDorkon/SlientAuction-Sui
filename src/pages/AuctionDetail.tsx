import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from "@mysten/dapp-kit";
import { Box, Flex, Heading, Text, Button, TextField, Card, Badge, Grid, Table, Separator, Avatar, Callout, Strong } from "@radix-ui/themes";
import { useState, useMemo } from "react";
import { calculateSocialMultiplier, encryptBidForNautilus, getEnclaveSolutionWithConfig, BidEntry } from "../utils/socialBidding";
import { Transaction } from "@mysten/sui/transactions";
import { ViewState } from "../types";
import { formatBalance } from "../utils/formatting";

const PACKAGE_ID = "0xe1f938a310c951b735e0ae7fe3da6962d1dc807a651f5aa9a0fb0c7ecbf678ba"; 
const SUI_DECIMALS = 1_000_000_000;
const MOCK_NAUTILUS_DB: Record<string, BidEntry[]> = {};

export default function AuctionDetail({ auctionId, onNavigate }: { auctionId: string, onNavigate: (v: ViewState) => void }) {
    const account = useCurrentAccount();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const { data: auctionObj, refetch } = useSuiClientQuery("getObject", { id: auctionId, options: { showContent: true, showType: true } });
    
    const [bidAmount, setBidAmount] = useState("");
    const [pricePerUnit, setPricePerUnit] = useState(""); 
    const [twitterHandle, setTwitterHandle] = useState("");
    const [isSolving, setIsSolving] = useState(false);
    const [enclaveResult, setEnclaveResult] = useState<any>(null);
    
    // @ts-ignore
    const fields = auctionObj?.data?.content?.fields;
    const objectType = auctionObj?.data?.type; 
    
    // Extract Config
    const { description, config } = useMemo(() => {
        if (!fields?.description) return { description: "", config: { min: "0", max: "10000" } };
        const parts = fields.description.split(" ||| ");
        if (parts.length === 2) {
            try { return { description: parts[0], config: JSON.parse(parts[1]) }; } catch { }
        }
        return { description: fields.description, config: { min: "0", max: "10000" } };
    }, [fields?.description]);

    if (!fields || !objectType) return <Text>Loading...</Text>;

    const innerType = objectType.substring(objectType.indexOf('<') + 1, objectType.lastIndexOf('>'));
    const isTokenSale = Number(fields.supply) > 1;
    const isCreator = account?.address === fields.creator;
    const currentBids = MOCK_NAUTILUS_DB[auctionId] || [];

    const handleBid = async () => {
        if (!account) return;
        try {
            const profile = { handle: twitterHandle, platform: 'twitter' as const, followers: 15000 };
            const price = isTokenSale ? Number(pricePerUnit) : Number(bidAmount);
            
            if (isTokenSale && (price < Number(config.min) || price > Number(config.max))) {
                alert(`Price must be between ${config.min} and ${config.max} SUI`);
                return;
            }

            const { bytes, hex } = await encryptBidForNautilus(Number(bidAmount), price, profile, account.address);
            
            const tx = new Transaction();
            const bidInMist = Number(bidAmount) * SUI_DECIMALS;
            const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(bidInMist)]);

            tx.moveCall({
                target: `${PACKAGE_ID}::auction::place_bid`,
                typeArguments: [innerType],
                arguments: [
                    tx.object(auctionId),
                    paymentCoin,
                    tx.pure.vector('u8', Array.from(bytes))
                ]
            });

            signAndExecute({ transaction: tx }, { onSuccess: () => { 
                if (!MOCK_NAUTILUS_DB[auctionId]) MOCK_NAUTILUS_DB[auctionId] = [];
                const estMultiplier = calculateSocialMultiplier(profile);
                MOCK_NAUTILUS_DB[auctionId].push({
                    bidder: account.address,
                    amount: Number(bidAmount),
                    score: Number(bidAmount) * estMultiplier,
                    handle: twitterHandle,
                    encryptedHex: hex 
                });
                alert(`Bid Encrypted & Sent!`); 
                refetch(); 
            }});
        } catch (e) { console.error(e); alert("Error. Is Enclave running?"); }
    };

    const handleWithdraw = () => {
        const tx = new Transaction();
        tx.moveCall({ target: `${PACKAGE_ID}::auction::withdraw`, typeArguments: [innerType], arguments: [tx.object(auctionId)] });
        signAndExecute({ transaction: tx }, { onSuccess: () => alert("Funds Withdrawn!") });
    };

    const handleFinalize = async () => {
        const bids = MOCK_NAUTILUS_DB[auctionId];
        if (!bids || bids.length === 0) { alert("No bids found!"); return; }
        setIsSolving(true);
        try {
            const tx = new Transaction();
            
            if (isTokenSale) {
                const encryptedList = bids.map(b => b.encryptedHex);
                const totalTokens = Number(fields.supply);
                
                console.log("Calling AWS Enclave...");
                const result = await getEnclaveSolutionWithConfig(encryptedList, totalTokens, Number(config.min), Number(config.max)); 
                
                // FIX: Convert Enclave "Whole Token" output to "Raw MIST" for the blockchain & UI
                // The enclave returns "1000", but blockchain needs "1000000000000"
                const processedTokenAmounts = result.tokenAmounts.map((amt: string) => 
                    (Number(amt) * SUI_DECIMALS).toString()
                );

                const finalResult = {
                    ...result,
                    tokenAmounts: processedTokenAmounts
                };
                
                setEnclaveResult(finalResult);

                const coinInnerType = innerType.substring(innerType.indexOf('<') + 1, innerType.lastIndexOf('>'));
                tx.moveCall({
                    target: `${PACKAGE_ID}::auction::finalize_token_sale`,
                    typeArguments: [coinInnerType], 
                    arguments: [
                        tx.object(auctionId),
                        tx.pure.vector('address', finalResult.winners),
                        tx.pure.vector('u64', finalResult.tokenAmounts),
                        tx.pure.vector('u64', finalResult.suiPayments)
                    ]
                });
            } else {
                // NFT Logic (unchanged)
                const sortedBids = [...bids].sort((a, b) => b.score - a.score);
                const winner = sortedBids[0];
                if (!winner) throw new Error("No valid bids");

                const mockResult = {
                    winners: [winner.bidder],
                    tokenAmounts: ["1"],
                    suiPayments: [Math.floor(winner.amount * SUI_DECIMALS).toString()]
                };
                setEnclaveResult(mockResult);

                tx.moveCall({
                    target: `${PACKAGE_ID}::auction::finalize_nft`,
                    typeArguments: [innerType],
                    arguments: [
                        tx.object(auctionId),
                        tx.pure.address(winner.bidder), 
                        tx.pure.u64(Math.floor(winner.amount * SUI_DECIMALS)) 
                    ]
                });
            }
            signAndExecute({ transaction: tx }, { onSuccess: () => { alert("Finalized!"); refetch(); }});
        } catch (e) { console.error(e); alert("Failed."); } finally { setIsSolving(false); }
    };

    const getBidStatus = (bidder: string) => {
        if (!enclaveResult) return <Badge color="indigo" variant="soft">🔒 Encrypted</Badge>;
        const winnerIndex = enclaveResult.winners.indexOf(bidder);
        if (winnerIndex !== -1) {
            const amount = enclaveResult.tokenAmounts[winnerIndex];
            const cost = enclaveResult.suiPayments[winnerIndex];
            return (
                <Flex direction="column" align="end">
                    <Badge color="green">WINNER</Badge>
                    <Text size="1" style={{color: '#059669', fontWeight: 700}}>+{formatBalance(amount)} Units</Text>
                    <Text size="1" style={{color: '#64748B'}}>Paid {formatBalance(cost)} SUI</Text>
                </Flex>
            );
        }
        return <Badge color="red">Missed Cut</Badge>;
    };

    return (
        <Flex direction="column" gap="5">
            <Button variant="ghost" onClick={() => onNavigate('lobby')} style={{alignSelf: 'flex-start', color: '#4B5563'}}>← Back to Market</Button>
            
            {/* PRIVACY BANNER */}
            <Box style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', borderRadius: 20, padding: 24, border: '1px solid rgba(99,102,241,0.25)', marginBottom: 8 }}>
                <Flex align="start" gap="3">
                    <Box style={{ fontSize: 28 }}>🛡️</Box>
                    <Box>
                        <Text size="3" weight="bold" style={{ color: 'var(--indigo-11)', marginBottom: 8, display: 'block' }}>Nautilus Privacy Protection</Text>
                        <Text size="2" style={{ color: '#475569', lineHeight: 1.7 }}>
                            All bids in this auction are encrypted and processed in secure Trusted Execution Environments (TEEs).
                        </Text>
                    </Box>
                </Flex>
            </Box>
            
            {/* AUCTION HEADER */}
            <Card size="3" style={{ background: 'white', borderRadius: 16, boxShadow: '0 8px 24px rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <Flex justify="between" align="start">
                    <Box>
                        <Flex align="center" gap="3" mb="2">
                            <Badge size="2" color={fields.active ? 'green' : 'gray'} variant="solid">{fields.active ? 'LIVE AUCTION' : 'ENDED'}</Badge>
                            <Badge size="2" color="indigo" variant="soft">{isTokenSale ? 'Token Sale' : 'NFT Auction'}</Badge>
                        </Flex>
                        <Heading size="8" style={{color: '#0F172A'}}>{fields.name}</Heading>
                        <Text size="3" style={{color: '#475569', fontWeight: 500}}>{description}</Text>
                        <Flex gap="6" mt="5">
                            <Box>
                                <Text size="1" weight="bold" style={{color: '#4F46E5', letterSpacing: '0.05em'}}>TOTAL SUPPLY</Text>
                                <Text size="6" weight="medium" style={{color: '#0F172A'}}>{formatBalance(fields.supply)}</Text>
                            </Box>
                            <Box>
                                <Text size="1" weight="bold" style={{color: '#4F46E5', letterSpacing: '0.05em'}}>ASSET TYPE</Text>
                                <Text size="6" style={{ fontFamily: 'monospace', color: '#0F172A', fontWeight: 600 }}>{innerType.split('::').pop()}</Text>
                            </Box>
                        </Flex>
                    </Box>
                    <Box style={{textAlign: 'right'}}>
                        <Text size="1" style={{color: '#64748B', fontWeight: 600}} mb="1">Created By</Text>
                        <Flex align="center" gap="2" style={{background: '#F3F4F6', padding: '6px 16px', borderRadius: 20}}>
                            <Avatar fallback={fields.creator[2]} size="1" radius="full" color="indigo" />
                            <Text size="2" weight="bold" style={{color: '#1E293B'}}>{fields.creator.slice(0,6)}...{fields.creator.slice(-4)}</Text>
                        </Flex>
                    </Box>
                </Flex>
            </Card>

            <Grid columns={{ initial: "1", md: "3" }} gap="4">
                {/* ACTION PANEL */}
                <Flex direction="column" gap="4" style={{ gridColumn: 'span 1' }}>
                    <Card size="3" style={{ background: 'white', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, boxShadow: '0 4px 16px rgba(99,102,241,0.1)' }}>
                        <Heading size="5" mb="3" style={{color: '#1E293B'}}>Place Private Bid</Heading>
                        {fields.active ? (
                            <Flex direction="column" gap="4">
                                <Callout.Root color="indigo" size="2" variant="soft" style={{ border: '1px solid rgba(99,102,241,0.3)' }}>
                                    <Callout.Icon>🔒</Callout.Icon>
                                    <Callout.Text style={{color: '#1E40AF', fontWeight: 500}}>Bids are encrypted using Nautilus.</Callout.Text>
                                </Callout.Root>
                                
                                <label>
                                    <Text size="2" weight="bold" style={{color: '#1E293B', marginBottom: 6, display: 'block'}}>Social Handle</Text>
                                    <TextField.Root placeholder="@twitter" value={twitterHandle} onChange={e=>setTwitterHandle(e.target.value)} variant="surface" style={{ background: '#0B1220', color: 'white', borderRadius: 10 }} />
                                </label>

                                {isTokenSale && (
                                    <label>
                                        <Text size="2" weight="bold" style={{color: '#1E293B', marginBottom: 6, display: 'block'}}>Bid Price (SUI per Token)</Text>
                                        <TextField.Root type="number" placeholder="0.00" value={pricePerUnit} onChange={e=>setPricePerUnit(e.target.value)} variant="surface" style={{ background: '#0B1220', color: 'white', borderRadius: 10 }} />
                                        <Flex justify="between" mt="1"><Text size="1" color="gray">Min: {config.min}</Text><Text size="1" color="gray">Max: {config.max}</Text></Flex>
                                    </label>
                                )}

                                <label>
                                    <Text size="2" weight="bold" style={{color: '#1E293B', marginBottom: 6, display: 'block'}}>Total Commitment (SUI)</Text>
                                    <TextField.Root type="number" placeholder="0.00" value={bidAmount} onChange={e=>setBidAmount(e.target.value)} variant="surface" style={{ background: '#0B1220', color: 'white', borderRadius: 10 }}>
                                        <TextField.Slot side="right">SUI</TextField.Slot>
                                    </TextField.Root>
                                </label>

                                {isTokenSale && bidAmount && pricePerUnit && !isNaN(Number(bidAmount)) && !isNaN(Number(pricePerUnit)) && Number(pricePerUnit) > 0 && (
                                     <Callout.Root size="1" color="indigo" variant="surface">
                                        <Callout.Text>Est. Receive: <strong>{(Number(bidAmount) / Number(pricePerUnit)).toLocaleString(undefined, {maximumFractionDigits: 2})}</strong> Tokens</Callout.Text>
                                     </Callout.Root>
                                )}

                                <Button size="3" onClick={handleBid} style={{width: '100%', cursor: 'pointer', borderRadius: 14, marginTop: 8}}>Place Encrypted Bid</Button>
                            </Flex>
                        ) : (
                            <Flex align="center" justify="center" style={{ height: 150 }} direction="column">
                                <Heading size="5" style={{color: '#64748B'}}>🔒 Auction Closed</Heading>
                            </Flex>
                        )}
                        <Separator my="4" />
                        <Button variant="outline" color="orange" onClick={handleWithdraw} style={{ width: '100%', cursor: 'pointer' }}>Withdraw Funds</Button>
                    </Card>
                </Flex>
                
                {/* ADMIN VIEW */}
                <Box style={{ gridColumn: 'span 2' }}>
                    <Card size="3" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, boxShadow: '0 4px 16px rgba(99,102,241,0.1)' }}>
                        <Flex justify="between" align="center" mb="3">
                            <Heading size="5" style={{color: 'var(--indigo-11)'}}>Bid Ledger</Heading>
                            <Badge color={isSolving ? "orange" : "indigo"} variant="solid" size="2" style={{ background: isSolving ? 'var(--orange-9)' : 'linear-gradient(135deg, #4F46E5, #6366F1)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                                {isSolving ? "🔄 TEE Computing..." : "🛡️ Nautilus Secured"}
                            </Badge>
                        </Flex>
                        <Box style={{ flexGrow: 1, maxHeight: 400, overflowY: 'auto' }}>
                            <Table.Root variant="surface" style={{ background: 'white' }}>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeaderCell style={{color: '#1E293B', fontWeight: 600}}>Handle</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell style={{color: '#1E293B', fontWeight: 600}}>Privacy Status</Table.ColumnHeaderCell>
                                        <Table.ColumnHeaderCell align="right" style={{color: '#1E293B', fontWeight: 600}}>Outcome</Table.ColumnHeaderCell>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {currentBids.length === 0 && <Table.Row><Table.Cell colSpan={3}><Text color="gray">No bids placed yet.</Text></Table.Cell></Table.Row>}
                                    {currentBids.map((bid, i) => (
                                        <Table.Row key={i}>
                                            <Table.Cell><Strong style={{color: '#0F172A'}}>{bid.handle}</Strong></Table.Cell>
                                            <Table.Cell><Badge style={{ background: '#F1F5F9', color: '#64748B' }}>Encrypted Payload</Badge></Table.Cell>
                                            <Table.Cell align="right">{getBidStatus(bid.bidder)}</Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </Box>
                        {isCreator && fields.active && (
                            <Box mt="4" p="4" style={{ background: '#FEF2F2', borderRadius: 12, border: '1px dashed var(--red-8)' }}>
                                <Heading size="3" color="red" mb="2">Creator Controls</Heading>
                                <Button color="red" size="3" disabled={isSolving} onClick={handleFinalize} style={{ width: '100%', cursor: 'pointer' }}>
                                    {isSolving ? "Calculating..." : "End Auction (Call TEE)"}
                                </Button>
                            </Box>
                        )}
                    </Card>
                </Box>
            </Grid>
        </Flex>
    );
}