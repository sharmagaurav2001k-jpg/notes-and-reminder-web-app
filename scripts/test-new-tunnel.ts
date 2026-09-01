async function testNewTunnel() {
  const url = "https://2533b78d3e2428.lhr.life/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=smart_notes_verify_token_2026&hub.challenge=OK";
  const res = await fetch(url);
  const text = await res.text();
  console.log("Status:", res.status, "Response:", text);
}
testNewTunnel().catch(console.error);
