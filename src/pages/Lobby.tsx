import { useSuiClientQuery } from "@mysten/dapp-kit";
import { Box, Flex, Heading, Text, Button, Card, Badge, Grid, Avatar, Inset } from "@radix-ui/themes";
import { ViewState } from "../types";
import { formatBalance } from "../utils/formatting";

const REGISTRY_ID = "0x667aadac23f16f396c2dde83cdc4d8f9d9d22449eac440052447e8f546d19fbb"; 

interface LobbyProps {
    onNavigate: (v: ViewState) => void;
    onSelectAuction: (id: string) => void;
}

export default function Lobby({ onNavigate, onSelectAuction }: LobbyProps) {
    const { data: registryObj } = useSuiClientQuery("getObject", { 
        id: REGISTRY_ID, 
        options: { showContent: true } 
    });

    // @ts-ignore
    const auctionIds: string[] = registryObj?.data?.content?.fields?.active_auctions || [];

    const { data: auctionsList, isPending } = useSuiClientQuery("multiGetObjects", { 
        ids: auctionIds, 
        options: { showContent: true } 
    });

    const sortedList = auctionsList?.slice().sort((a: any, b: any) => {
        const activeA = a.data?.content?.fields?.active;
        const activeB = b.data?.content?.fields?.active;
        return activeA === activeB ? 0 : activeA ? -1 : 1;
    });

    return (
        <Flex direction="column" gap="7">
            <style>{`
                .hover-card {
                    transition: all 0.25s ease;
                    border: 1px solid rgba(255,255,255,0.85);
                }
                .hover-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 24px 60px -12px rgba(99, 102, 241, 0.35);
                    border-color: var(--indigo-7);
                }
                .pulse-live {
                    animation: pulse 1.8s infinite;
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
                    70% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
                    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
                }
            `}</style>

            {/* ================= HERO ================= */}
            <Box 
                style={{ 
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #E0E7FF 60%, #C7D2FE 100%)', 
                    borderRadius: 28,
                    padding: '48px 52px',
                    border: '1px solid rgba(99,102,241,0.3)',
                    boxShadow: '0 30px 100px rgba(99,102,241,0.2)'
                }}
            >
                <Flex direction="column" gap="5">
                    <Flex justify="between" align="center" wrap="wrap" gap="4">
                        <Box style={{ maxWidth: 680 }}>
                            <Badge 
                                mb="4"
                                size="2"
                                style={{
                                    background: 'linear-gradient(135deg, #312E81, #4F46E5)',
                                    color: 'white',
                                    boxShadow: '0 8px 20px rgba(49,46,129,0.4)',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 600
                                }}
                            >
                                🛡️ Nautilus Encrypted Marketplace
                            </Badge>

                            <Heading 
                                size="9" 
                                style={{ 
                                    color: 'var(--indigo-3)', 
                                    letterSpacing: '-1.5px',
                                    textShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    marginBottom: 16
                                }} 
                            >
                                Confidential Market
                            </Heading>

                            <Text 
                                size="4" 
                                style={{ 
                                    color: '#1E1B4B', 
                                    lineHeight: '1.85',
                                    fontWeight: 500,
                                    marginBottom: 24
                                }}
                            >
                                Powered by <strong style={{color: 'var(--indigo-9)'}}>Nautilus Trusted Execution Environments</strong> on the <strong style={{color: 'var(--indigo-9)'}}>Sui blockchain</strong>. 
                                Bid strategies, wallet origins, and auction tactics remain cryptographically hidden until final settlement.
                            </Text>

                            <Box
                                style={{
                                    background: 'rgba(255,255,255,0.7)',
                                    borderRadius: 16,
                                    padding: 20,
                                    border: '1px solid rgba(99,102,241,0.2)'
                                }}
                            >
                                <Text size="2" style={{ color: '#475569', lineHeight: 1.7 }}>
                                    <strong style={{ color: 'var(--indigo-11)' }}>How it works:</strong> Bids are encrypted and processed off-chain in secure TEE enclaves. 
                                    Only verified results are published on-chain, ensuring complete privacy while maintaining cryptographic verifiability.
                                </Text>
                            </Box>
                        </Box>

                        <Button 
                            size="4" 
                            color="indigo"
                            highContrast
                            style={{ 
                                borderRadius: 16,
                                padding: '0 40px',
                                height: 56,
                                boxShadow: '0 12px 32px rgba(99,102,241,0.4)',
                                fontWeight: 700,
                                fontSize: '16px'
                            }} 
                            onClick={() => onNavigate('create')}
                        >
                            + Create Auction
                        </Button>
                    </Flex>
                </Flex>
            </Box>
            
            {/* ================= LOADING ================= */}
            {isPending && (
                <Flex justify="center" p="9">
                    <Text size="3" style={{ color: '#312E81', fontWeight: 600 }}>
                        Syncing secure on-chain data…
                    </Text>
                </Flex>
            )}
            
            {/* ================= EMPTY ================= */}
            {sortedList?.length === 0 && !isPending && (
                <Flex 
                    align="center" 
                    justify="center" 
                    style={{ 
                        height: 360, 
                        background: 'linear-gradient(135deg, #FFFFFF, #EEF2FF)', 
                        borderRadius: 28, 
                        border: '2px dashed var(--indigo-6)' 
                    }}
                >
                    <Flex direction="column" align="center" gap="4">
                        <Box style={{ fontSize: 44 }}>🔐</Box>
                        <Heading size="5" style={{ color: '#312E81' }}>
                            No encrypted auctions yet
                        </Heading>
                        <Button size="3" variant="soft" onClick={() => onNavigate('create')}>
                            Launch the First Auction
                        </Button>
                    </Flex>
                </Flex>
            )}

            {/* ================= GRID ================= */}
            <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="6">
                {sortedList?.map((obj) => {
                    // @ts-ignore
                    const fields = obj.data?.content?.fields;
                    const id = obj.data?.objectId;
                    if (!id || !fields) return null;

                    const isToken = Number(fields.supply) > 1;
                    const displaySupply = isToken ? formatBalance(fields.supply) : "1";
                    const isLive = fields.active;

                    return (
                        <Card 
                            key={id} 
                            className="hover-card"
                            style={{ 
                                cursor: 'pointer', 
                                overflow: 'hidden',
                                borderRadius: 24,
                                background: 'white',
                                position: 'relative',
                                border: '1px solid rgba(99,102,241,0.15)',
                                boxShadow: '0 4px 16px rgba(99,102,241,0.1)'
                            }} 
                            onClick={() => { onSelectAuction(id); onNavigate('detail'); }}
                        >
                            {/* LIVE */}
                            {isLive && (
                                <Box style={{ 
                                    position: 'absolute', 
                                    top: 16, 
                                    right: 16, 
                                    zIndex: 2,
                                    background: 'white',
                                    borderRadius: 100, 
                                    padding: '6px 14px',
                                    boxShadow: '0 8px 20px rgba(0,0,0,0.12)'
                                }}>
                                    <Flex align="center" gap="2">
                                        <Box 
                                            className="pulse-live" 
                                            style={{ 
                                                width: 8, 
                                                height: 8, 
                                                borderRadius: '50%', 
                                                background: 'var(--green-9)' 
                                            }} 
                                        />
                                        <Text 
                                            size="1" 
                                            weight="bold" 
                                            style={{ color: '#064E3B' }}
                                        >
                                            LIVE
                                        </Text>
                                    </Flex>
                                </Box>
                            )}

                            <Inset clip="padding-box" side="top" pb="current">
                                <Flex 
                                    align="center" 
                                    justify="center" 
                                    style={{ 
                                        background: isToken 
                                            ? 'linear-gradient(135deg, #6366F1, #A5B4FC)' 
                                            : 'linear-gradient(135deg, #14B8A6, #67E8F9)',
                                        height: 200
                                    }}
                                >
                                    <Avatar 
                                        size="8" 
                                        fallback={fields.name[0]} 
                                        src={!isToken 
                                            ? "https://api.dicebear.com/7.x/shapes/svg?seed=" + fields.name 
                                            : undefined
                                        }
                                        style={{ 
                                            boxShadow: '0 22px 50px rgba(0,0,0,0.25)',
                                            border: '4px solid white',
                                            width: 92, 
                                            height: 92
                                        }}
                                    />
                                </Flex>
                            </Inset>

                            <Flex direction="column" gap="2" p="4">
                                <Box>
                                    <Heading 
                                        size="4" 
                                        style={{ 
                                            color: '#0F172A',
                                            fontWeight: 700
                                        }}
                                    >
                                        {fields.name}
                                    </Heading>

                                    <Text 
                                        size="2" 
                                        style={{ 
                                            color: '#334155',
                                            fontWeight: 500,
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis', 
                                            whiteSpace: 'nowrap',
                                            marginTop: 6
                                        }}
                                    >
                                        {fields.description}
                                    </Text>
                                </Box>
                                
                                <Flex 
                                    justify="between" 
                                    align="center" 
                                    mt="3" 
                                    pt="3" 
                                    style={{ borderTop: '1px solid var(--gray-4)' }}
                                >
                                    <Badge 
                                        size="1" 
                                        color={isToken ? "indigo" : "teal"} 
                                        variant="surface"
                                    >
                                        {isToken ? 'TOKEN SALE' : 'NFT AUCTION'}
                                    </Badge>

                                    <Flex direction="column" align="end">
                                        <Text 
                                            size="1" 
                                            weight="bold"
                                            style={{ 
                                                letterSpacing: '0.08em',
                                                color: '#475569'
                                            }}
                                        >
                                            SUPPLY
                                        </Text>
                                        <Text 
                                            size="3" 
                                            weight="bold" 
                                            style={{ color: '#0F172A' }}
                                        >
                                            {displaySupply}
                                        </Text>
                                    </Flex>
                                </Flex>
                            </Flex>
                        </Card>
                    );
                })}
            </Grid>
        </Flex>
    );
}
