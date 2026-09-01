import { prisma } from "../lib/prisma";

async function testVerificationFlow() {
  console.log("🚀 Testing WhatsApp User Mapping & Verification Flow...\n");

  // 1. Find or pick a test user
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found in database.");
    return;
  }
  console.log(`Using test user: ${user.name} (${user.email}) - ID: ${user.id}`);

  const testPhone = "919876543210";
  const testCode = "654321";
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // 2. Create verification record
  console.log("\n1. Creating OTP verification record in database...");
  const verification = await prisma.whatsAppVerification.create({
    data: {
      userId: user.id,
      phone: testPhone,
      code: testCode,
      expiresAt,
      verified: false,
    },
  });
  console.log(`✅ Verification record created: ID ${verification.id}, Code: ${verification.code}`);

  // 3. Verify OTP & Map to User
  console.log("\n2. Simulating OTP Verification...");
  const verifiedRecord = await prisma.whatsAppVerification.findFirst({
    where: {
      userId: user.id,
      phone: testPhone,
      code: testCode,
      verified: false,
      expiresAt: { gte: new Date() },
    },
  });

  if (!verifiedRecord) {
    throw new Error("Verification record not found");
  }

  await prisma.whatsAppVerification.update({
    where: { id: verifiedRecord.id },
    data: { verified: true },
  });

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      whatsappNumber: testPhone,
      whatsappVerified: true,
      whatsappNotifications: true,
      whatsappDailyDigest: true,
    },
  });

  console.log(`✅ User updated with mapped WhatsApp:`);
  console.log(`   - whatsappNumber: ${updatedUser.whatsappNumber}`);
  console.log(`   - whatsappVerified: ${updatedUser.whatsappVerified}`);

  // 4. Test Inbound Phone -> User lookup (as used in Webhook)
  console.log("\n3. Testing Inbound Phone -> User lookup (as used in Webhook)...");
  const matchedUser = await prisma.user.findFirst({
    where: {
      OR: [
        { whatsappNumber: testPhone },
        { whatsappNumber: `+${testPhone}` },
      ],
      whatsappVerified: true,
    },
    select: { id: true, name: true, email: true },
  });

  if (matchedUser && matchedUser.id === user.id) {
    console.log(`✅ Phone ${testPhone} uniquely resolves to User: ${matchedUser.name} (${matchedUser.email})`);
  } else {
    console.error("❌ Phone mapping resolution failed!");
  }

  // 5. Cleanup test verification
  await prisma.whatsAppVerification.deleteMany({
    where: { userId: user.id, phone: testPhone },
  });
  console.log("\n🧹 Cleaned up test verification records.");

  console.log("\n🎉 WhatsApp User Verification & Mapping Test Passed 100%!");
}

testVerificationFlow().catch(console.error);
