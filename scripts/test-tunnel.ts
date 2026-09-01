async function testTunnel() {
  const url = "https://1b6127db4e1978.lhr.life/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=smart_notes_verify_token_2026&hub.challenge=LIVE_HANDSHAKE_OK";
  console.log("Testing tunnel URL:", url);
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log(`Status: ${res.status}, Response text: "${text}"`);
    if (text === "LIVE_HANDSHAKE_OK") {
      console.log("🎉 Tunnel Handshake is 100% WORKING!");
    }
  } catch (e: any) {
    console.error("Tunnel error:", e.message);
  }
}

testTunnel().catch(console.error);
