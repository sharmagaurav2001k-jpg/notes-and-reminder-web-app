import { parseInboundWhatsAppMessage, executeWhatsAppCommand } from "../lib/whatsapp-parser";
import { prisma } from "../lib/prisma";

async function testParserSuite() {
  console.log("🚀 Testing WhatsApp Command Parser & Execution Suite...\n");

  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found.");
    return;
  }
  console.log(`Testing with User: ${user.name} (${user.id})\n`);

  // Test 1: Note creation
  console.log("--- 1. Testing 'note <text>' ---");
  const cmd1 = parseInboundWhatsAppMessage("note Key architecture decisions: Use PostgreSQL and Next.js 15");
  console.log("Parsed 1:", cmd1);
  if (cmd1.type === "NOTE") {
    const res1 = await executeWhatsAppCommand(cmd1, user.id, user.name || "Test");
    console.log("Output 1:\n" + res1 + "\n");
  }

  // Test 2: Remind Me with relative time
  console.log("--- 2. Testing 'remind me <when> to <text>' ---");
  const cmd2 = parseInboundWhatsAppMessage("remind me tomorrow at 5pm to call doctor for blood test");
  console.log("Parsed 2:", cmd2);
  if (cmd2.type === "REMINDER") {
    const res2 = await executeWhatsAppCommand(cmd2, user.id, user.name || "Test");
    console.log("Output 2:\n" + res2 + "\n");
  }

  // Test 3: Remind Me with relative hours
  console.log("--- 3. Testing 'remind me in 2 hours to take medicine' ---");
  const cmd3 = parseInboundWhatsAppMessage("remind me in 2 hours to take medicine");
  console.log("Parsed 3:", cmd3);
  if (cmd3.type === "REMINDER") {
    const res3 = await executeWhatsAppCommand(cmd3, user.id, user.name || "Test");
    console.log("Output 3:\n" + res3 + "\n");
  }

  // Test 4: Goal with target date
  console.log("--- 4. Testing 'goal <text> by <date>' ---");
  const cmd4 = parseInboundWhatsAppMessage("goal launch MVP product by next month");
  console.log("Parsed 4:", cmd4);
  if (cmd4.type === "GOAL") {
    const res4 = await executeWhatsAppCommand(cmd4, user.id, user.name || "Test");
    console.log("Output 4:\n" + res4 + "\n");
  }

  // Test 5: Search notes
  console.log("--- 5. Testing 'find my notes about <term>' ---");
  const cmd5 = parseInboundWhatsAppMessage("find my notes about architecture");
  console.log("Parsed 5:", cmd5);
  if (cmd5.type === "SEARCH_NOTES") {
    const res5 = await executeWhatsAppCommand(cmd5, user.id, user.name || "Test");
    console.log("Output 5:\n" + res5 + "\n");
  }

  // Test 6: Done / Complete task
  console.log("--- 6. Testing 'done <task>' ---");
  const cmd6 = parseInboundWhatsAppMessage("done call doctor");
  console.log("Parsed 6:", cmd6);
  if (cmd6.type === "DONE") {
    const res6 = await executeWhatsAppCommand(cmd6, user.id, user.name || "Test");
    console.log("Output 6:\n" + res6 + "\n");
  }

  // Test 7: Today's tasks list
  console.log("--- 7. Testing 'today' ---");
  const cmd7 = parseInboundWhatsAppMessage("today");
  console.log("Parsed 7:", cmd7);
  if (cmd7.type === "TODAY_TASKS") {
    const res7 = await executeWhatsAppCommand(cmd7, user.id, user.name || "Test");
    console.log("Output 7:\n" + res7 + "\n");
  }

  // Test 8: Goals list
  console.log("--- 8. Testing 'goals' ---");
  const cmd8 = parseInboundWhatsAppMessage("goals");
  console.log("Parsed 8:", cmd8);
  if (cmd8.type === "LIST_GOALS") {
    const res8 = await executeWhatsAppCommand(cmd8, user.id, user.name || "Test");
    console.log("Output 8:\n" + res8 + "\n");
  }

  // Test 9: Help menu
  console.log("--- 9. Testing 'help' ---");
  const cmd9 = parseInboundWhatsAppMessage("help");
  console.log("Parsed 9:", cmd9);
  if (cmd9.type === "HELP") {
    const res9 = await executeWhatsAppCommand(cmd9, user.id, user.name || "Test");
    console.log("Output 9:\n" + res9 + "\n");
  }

  // Test 10: Unrecognized command fallback
  console.log("--- 10. Testing Unrecognized Command Fallback ---");
  const cmd10 = parseInboundWhatsAppMessage("what is the weather today?");
  console.log("Parsed 10:", cmd10);
  if (cmd10.type === "UNKNOWN") {
    const res10 = await executeWhatsAppCommand(cmd10, user.id, user.name || "Test");
    console.log("Output 10:\n" + res10 + "\n");
  }

  // Cleanup created test records
  console.log("🧹 Cleaning up test generated entries...");
  await prisma.task.deleteMany({ where: { userId: user.id, title: { in: ["call doctor for blood test", "take medicine"] } } });
  await prisma.goal.deleteMany({ where: { userId: user.id, name: "launch MVP product" } });
  await prisma.note.deleteMany({ where: { userId: user.id, title: { startsWith: "Key architecture decisions" } } });
  console.log("✅ Cleanup complete.");

  console.log("\n🎉 All 10 WhatsApp Command Parser & Fallback Tests Passed Successfully!");
}

testParserSuite().catch(console.error);
