import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Container, Flex, Heading, Text, TabNav, Badge } from "@radix-ui/themes";
import { useState } from "react";
import Lobby from "./pages/Lobby";
import MintPage from "./pages/MintPage";
import CreateAuction from "./pages/CreateAuction";
import AuctionDetail from "./pages/AuctionDetail";
import { ViewState } from "./types";

function App() {
  const account = useCurrentAccount();
  const [view, setView] = useState<ViewState>('lobby');
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(null);

  const handleNav = (v: ViewState) => {
    if (v === 'lobby') setSelectedAuctionId(null);
    setView(v);
  };

  return (
    <Box
      style={{
        background: "linear-gradient(180deg, #E0E7FF 0%, #C7D2FE 20%, #E0E7FF 80%, #C7D2FE 100%)",
        minHeight: "100vh",
        fontFamily: "Inter, system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* ====================== NAVBAR ====================== */}
      <Box
        style={{
          background: "linear-gradient(90deg, #1E1B4B, #312E81)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
        }}
      >
        <Container size="4">
          <Flex align="center" justify="between" py="4">

            {/* BRAND BLOCK */}
            <Flex align="center" gap="3" style={{ cursor: "pointer" }} onClick={() => handleNav("lobby")}>
              <Box
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #6366F1, #A5B4FC)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 30px rgba(99,102,241,0.5)",
                }}
              >
                <Text weight="bold" size="5" style={{ color: "white" }}>SA</Text>
              </Box>

              <Box>
                <Heading size="4" style={{ color: "white", letterSpacing: "-0.5px" }}>
                  SilentAuction
                </Heading>
                <Text size="1" style={{ color: "#A5B4FC" }}>
                  Powered by Nautilus on Sui
                </Text>
              </Box>
            </Flex>

            <Flex align="center" gap="3">
              <Badge color="indigo" variant="soft">Privacy Layer Active</Badge>
              <ConnectButton />
            </Flex>
          </Flex>

          {/* ====================== TABS ====================== */}
          {account && (
            <Box mt="3" pb="2">
              <TabNav.Root style={{ borderBottom: "none" }}>
                <TabNav.Link
                  active={view === "lobby"}
                  onClick={() => handleNav("lobby")}
                >
                  Marketplace
                </TabNav.Link>

                <TabNav.Link
                  active={view === "create"}
                  onClick={() => handleNav("create")}
                >
                  Create Auction
                </TabNav.Link>

                <TabNav.Link
                  active={view === "mint"}
                  onClick={() => handleNav("mint")}
                >
                  Assets Faucet
                </TabNav.Link>

                {view === "detail" && (
                  <TabNav.Link active>
                    Auction Details
                  </TabNav.Link>
                )}
              </TabNav.Root>
            </Box>
          )}
        </Container>
      </Box>

      {/* ====================== MAIN CONTENT ====================== */}
      <Container size="4" mt="6" pb="9">
        {!account ? (
          <Flex direction="column" align="center" justify="center" style={{ minHeight: "70vh", gap: 32 }}>
            <Box
              style={{
                background: "white",
                borderRadius: 32,
                padding: "72px 64px",
                textAlign: "center",
                boxShadow: "0 40px 120px rgba(99,102,241,0.3)",
                border: "1px solid rgba(99,102,241,0.2)",
                maxWidth: 800,
              }}
            >
              <Box
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #6366F1, #A5B4FC)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                  boxShadow: "0 20px 40px rgba(99,102,241,0.4)",
                }}
              >
                <Text weight="bold" size="8" style={{ color: "white" }}>🔒</Text>
              </Box>

              <Heading size="9" mb="4" style={{ color: "var(--indigo-11)", letterSpacing: "-1px" }}>
                SilentAuction
              </Heading>

              <Text size="5" as="p" style={{ lineHeight: 1.8, color: "var(--gray-11)", marginBottom: 32, fontWeight: 500 }}>
                A <strong style={{ color: "var(--indigo-9)" }}>privacy-preserving auction protocol</strong> secured by  
                <strong style={{ color: "var(--indigo-9)" }}> Nautilus Trusted Execution Environments</strong>  
                on the <strong style={{ color: "var(--indigo-9)" }}>Sui blockchain</strong>.
              </Text>

              <Box
                style={{
                  background: "linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)",
                  borderRadius: 20,
                  padding: 32,
                  marginBottom: 32,
                  border: "1px solid rgba(99,102,241,0.15)",
                  textAlign: "left",
                }}
              >
                <Text size="3" as="p" style={{ lineHeight: 1.8, color: "var(--gray-11)", marginBottom: 16 }}>
                  <strong style={{ color: "var(--indigo-11)" }}>🔐 Complete Privacy:</strong> Wallets, bid amounts, and participant identities remain cryptographically hidden throughout the auction process.
                </Text>
                <Text size="3" as="p" style={{ lineHeight: 1.8, color: "var(--gray-11)", marginBottom: 16 }}>
                  <strong style={{ color: "var(--indigo-11)" }}>🛡️ Nautilus TEE:</strong> Leverages AWS Nitro Enclaves for secure, verifiable off-chain computation. All sensitive operations are processed in isolated, tamper-resistant environments.
                </Text>
                <Text size="3" as="p" style={{ lineHeight: 1.8, color: "var(--gray-11)" }}>
                  <strong style={{ color: "var(--indigo-11)" }}>⚡ Sui Blockchain:</strong> Only cryptographic proofs and final results are recorded on-chain, ensuring transparency while maintaining complete privacy.
                </Text>
              </Box>

              <Box mt="7" style={{ transform: "scale(1.15)" }}>
                <ConnectButton />
              </Box>
            </Box>
          </Flex>
        ) : (
          <Box style={{ animation: "fadeIn 0.4s ease-out" }}>
            {view === "lobby" && (
              <Lobby
                onNavigate={handleNav}
                onSelectAuction={setSelectedAuctionId}
              />
            )}

            {view === "mint" && (
              <MintPage onNavigate={handleNav} />
            )}

            {view === "create" && (
              <CreateAuction onNavigate={handleNav} />
            )}

            {view === "detail" && selectedAuctionId && (
              <AuctionDetail
                auctionId={selectedAuctionId}
                onNavigate={handleNav}
              />
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default App;
