import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery } from "@mysten/dapp-kit";
import { Box, Flex, Heading, Text, Button, TextField, Card, Grid, Avatar, ScrollArea, Badge } from "@radix-ui/themes";
import { useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { ViewState } from "../types";
import { formatBalance, parseInputToMist } from "../utils/formatting";

const PACKAGE_ID = "0xe1f938a310c951b735e0ae7fe3da6962d1dc807a651f5aa9a0fb0c7ecbf678ba"; 
const REGISTRY_ID = "0x667aadac23f16f396c2dde83cdc4d8f9d9d22449eac440052447e8f546d19fbb"; 

export default function CreateAuction({ onNavigate }: { onNavigate: (v: ViewState) => void }) {
    const account = useCurrentAccount();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [supply, setSupply] = useState("1");
    
    // New Price Configuration
    const [minPrice, setMinPrice] = useState(""); 
    const [maxPrice, setMaxPrice] = useState(""); 

    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
    const [selectedObjectType, setSelectedObjectType] = useState<string>("");
    const [isToken, setIsToken] = useState(false);

    const { data: userObjects } = useSuiClientQuery("getOwnedObjects", {
        owner: account?.address || "",
        options: { showType: true, showContent: true, showDisplay: true } 
    }, { enabled: !!account });

    const handleCreate = () => {
        if (!selectedObjectId) { alert("Select asset"); return; }

        const finalSupply = isToken ? parseInputToMist(supply) : Number(supply);

        // Bundle Price Config into Description
        const configPayload = JSON.stringify({
            min: minPrice || "0",
            max: maxPrice || "0"
        });
        const finalDesc = `${desc} ||| ${configPayload}`;

        const tx = new Transaction();
        tx.moveCall({
            target: `${PACKAGE_ID}::auction::create_auction`,
            typeArguments: [selectedObjectType], 
            arguments: [
                tx.object(REGISTRY_ID),
                tx.object(selectedObjectId),     
                tx.pure.string(name),
                tx.pure.string(finalDesc), // Send Config
                tx.pure.u64(finalSupply),
                tx.pure.vector('u8', [1,2,3])
            ]
        });

        signAndExecute(
            { transaction: tx },
            { onSuccess: () => { alert("Created!"); onNavigate("lobby"); } }
        );
    };

    return (
        <Flex
          direction="column"
          gap="6"
          style={{
            height: "calc(100vh - 120px)",
            maxWidth: 1200,
            margin: "0 auto",
            paddingInline: 24,
          }}
        >
            {/* HEADER */}
            <Box pb="4" style={{ borderBottom: "1px solid rgba(99,102,241,0.25)" }}>
                <Heading
                    size="8"
                    style={{
                        color: "#0F172A",
                        letterSpacing: "-0.5px",
                        marginBottom: 8,
                    }}
                >
                    Create Auction
                </Heading>
                <Text size="4" style={{ color: "#475569", fontWeight: 500 }}>
                    Lock an asset in the Nautilus contract and open a confidential auction.
                </Text>
            </Box>

            
            {/* MAIN GRID */}
            <Grid
              columns={{ initial: "1", md: "3" }}
              gap="5"
              style={{
                flexGrow: 1,
                alignItems: "flex-start",
              }}
            >
                {/* ===================== SELECT ASSET ===================== */}
                <Card
                  style={{
                    gridColumn: "span 2",
                    background: "rgba(255,255,255,0.96)",
                    borderRadius: 20,
                    border: "1px solid rgba(148,163,184,0.6)",
                    boxShadow: "0 20px 50px rgba(15,23,42,0.10)",
                    position: "relative",
                    overflow: "hidden",
                    minHeight: 520,
                  }}
                >
                    {/* subtle gradient overlay */}
                    <Box
                        style={{
                            position: "absolute",
                            inset: 0,
                            background:
                                "radial-gradient(circle at top left, rgba(129,140,248,0.25), transparent 55%)",
                            pointerEvents: "none",
                        }}
                    />

                    <Box style={{ position: "relative", zIndex: 1 }}>
                        <Flex justify="between" align="center" mb="3">
                            <Box>
                                <Text size="1" style={{ color: "#6B7280", letterSpacing: "0.12em" }}>
                                    STEP 1
                                </Text>
                                <Heading size="4" style={{ color: "#0F172A", marginTop: 4 }}>
                                    Select Asset
                                </Heading>
                                <Text size="2" style={{ color: "#6B7280", marginTop: 4 }}>
                                    Choose an NFT or token balance from your wallet to lock into the auction.
                                </Text>
                            </Box>

                            {account?.address && (
                                <Badge
                                    variant="soft"
                                    color="indigo"
                                    style={{
                                        borderRadius: 999,
                                        paddingInline: 10,
                                        fontSize: 11,
                                    }}
                                >
                                    {account.address.slice(0, 6)}…{account.address.slice(-4)}
                                </Badge>
                            )}
                        </Flex>

                        <ScrollArea
                          type="always"
                          scrollbars="vertical"
                          style={{
                            height: 380,
                            paddingRight: 12,
                            marginTop: 12,
                          }}
                        >
                            {!userObjects?.data?.length && (
                                <Flex
                                    align="center"
                                    justify="center"
                                    direction="column"
                                    style={{ height: 360 }}
                                    gap="3"
                                >
                                    <Text size="6">👻</Text>
                                    <Text color="gray" size="2">
                                        No assets found in this wallet.
                                    </Text>
                                    <Button variant="soft" onClick={() => onNavigate("mint")}>
                                        Mint test assets
                                    </Button>
                                </Flex>
                            )}

                            <Grid columns={{ initial: "1", sm: "2" }} gap="3">
                                {userObjects?.data.map((obj) => {
                                    const display = obj.data?.display?.data;
                                    const imageUrl =
                                        display?.image_url || display?.link || display?.url;
                                    const displayName = display?.name || display?.title;
                                    const typeName = obj.data?.type
                                        ?.split("::")
                                        .pop()
                                        ?.replace(">", "");
                                    // @ts-ignore
                                    const balance = obj.data?.content?.fields?.balance;
                                    const isSelected = selectedObjectId === obj.data?.objectId;

                                    const isTokenAsset = !!balance;

                                    return (
                                        <Card
                                          key={obj.data?.objectId}
                                          style={{
                                            cursor: "pointer",
                                            borderRadius: 14,
                                            padding: 12,
                                            border: isSelected
                                              ? "2px solid #4F46E5"
                                              : "1px solid rgba(148,163,184,0.5)",
                                            background: isSelected
                                              ? "linear-gradient(135deg,#EEF2FF,#E0E7FF)"
                                              : "white",
                                            boxShadow: isSelected
                                              ? "0 12px 30px rgba(79,70,229,0.25)"
                                              : "0 6px 18px rgba(15,23,42,0.08)",
                                            transition: "all 0.15s ease-out",
                                            overflow: "hidden",
                                          }}
                                          onClick={() => {
                                                setSelectedObjectId(obj.data?.objectId || "");
                                                setSelectedObjectType(obj.data?.type || "");
                                                if (!name && displayName) setName(displayName);
                                                if (!desc && display?.description) setDesc(display.description);
                                                if (balance) {
                                                    const humanBalance = Number(balance) / 1_000_000_000;
                                                    setSupply(String(humanBalance));
                                                    setIsToken(true);
                                                } else {
                                                    setSupply("1");
                                                    setIsToken(false);
                                                }
                                            }}
                                        >
                                            <Flex gap="3" align="center">
                                                <Avatar
                                                    src={imageUrl}
                                                    fallback={typeName?.[0] || "?"}
                                                    size="3"
                                                    radius="medium"
                                                    style={{
                                                        border: `2px solid ${
                                                            isSelected ? "#4F46E5" : "#CBD5E1"
                                                        }`,
                                                        background: "white",
                                                    }}
                                                />
                                                <Box style={{ overflow: "hidden", flex: 1 }}>
                                                    <Text as="div" size="2" weight="bold" style={{
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            color: "#0F172A",
                                                            marginBottom: 4,
                                                        }}>
                                                        {displayName || typeName}
                                                    </Text>
                                                    <Flex gap="2" align="center">
                                                        {isTokenAsset ? (
                                                          <Badge color="indigo" variant="solid" style={{ background: "#4F46E5", color: "white", fontWeight: 600 }}>
                                                            {formatBalance(balance)} TOK
                                                          </Badge>
                                                        ) : (
                                                            <Badge color="gray" variant="solid" style={{ background: "#64748B", color: "white", fontWeight: 600 }}>
                                                                NFT
                                                            </Badge>
                                                        )}
                                                    </Flex>
                                                </Box>
                                            </Flex>
                                        </Card>
                                    );
                                })}
                            </Grid>
                        </ScrollArea>
                    </Box>
                </Card>

                {/* ===================== CONFIGURATION ===================== */}
                <Card
                  style={{
                    height: "fit-content",
                    background: "white",
                    borderRadius: 20,
                    border: "1px solid rgba(148,163,184,0.6)",
                    boxShadow: "0 20px 45px rgba(15,23,42,0.12)",
                    padding: 20,
                  }}
                >
                    <Heading size="4" mb="3" style={{ color: "#0F172A" }}>
                        2. Configuration
                    </Heading>

                    <Text size="2" style={{ color: "#6B7280", marginBottom: 16 }}>
                        Define the auction rules and pricing limits.
                    </Text>

                    <Flex direction="column" gap="4">
                        <label>
                            <Text as="div" size="2" mb="1" weight="bold" style={{ color: "#1E293B", display: "block" }}>Auction title</Text>
                            <TextField.Root value={name} onChange={(e) => setName(e.target.value)} placeholder="Cool Hackathon NFT" style={{ background: "#0B1220", color: "white", borderRadius: 10 }} />
                        </label>

                        <label>
                            <Text as="div" size="2" mb="1" weight="bold" style={{ color: "#1E293B", display: "block" }}>Description</Text>
                            <TextField.Root value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description..." style={{ background: "#0B1220", color: "white", borderRadius: 10 }} />
                        </label>

                        <label>
                            <Text as="div" size="2" mb="1" weight="bold" style={{ color: "#1E293B", display: "block" }}>Auction supply</Text>
                            <TextField.Root type="number" value={supply} onChange={(e) => setSupply(e.target.value)} style={{ background: "#0B1220", color: "white", borderRadius: 10 }}>
                              {isToken && <TextField.Slot side="right">Tokens</TextField.Slot>}
                            </TextField.Root>
                            <Text size="1" style={{ color: "#6B7280", marginTop: 4 }}>
                                {isToken ? "Amount of tokens from your balance." : "Quantity (usually 1)."}
                            </Text>
                        </label>

                        {/* NEW: PRICE LIMITS */}
                        {isToken && (
                            <>
                                <label>
                                    <Text as="div" size="2" mb="1" weight="bold" style={{ color: "#1E293B", display: "block" }}>Min Price (SUI per unit)</Text>
                                    <TextField.Root type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0.0" style={{ background: "#0B1220", color: "white", borderRadius: 10 }} />
                                </label>
                                <label>
                                    <Text as="div" size="2" mb="1" weight="bold" style={{ color: "#1E293B", display: "block" }}>Max Price (SUI per unit)</Text>
                                    <TextField.Root type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price per token" style={{ background: "#0B1220", color: "white", borderRadius: 10 }} />
                                </label>
                            </>
                        )}

                        <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-4)" }}>
                            <Button
                              size="4"
                              onClick={handleCreate}
                              disabled={!selectedObjectId}
                              style={{
                                width: "100%",
                                fontWeight: 700,
                                borderRadius: 14,
                                opacity: selectedObjectId ? 1 : 0.45,
                              }}
                            >
                              Launch Auction 🚀
                            </Button>
                        </Box>
                    </Flex>
                </Card>
            </Grid>
        </Flex>
    );
}