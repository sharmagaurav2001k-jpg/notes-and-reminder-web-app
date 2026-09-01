import { prisma } from "../lib/prisma";

async function resetTestNumber() {
  await prisma.user.updateMany({
    where: { whatsappNumber: "919876543210" },
    data: { whatsappNumber: null, whatsappVerified: false },
  });
  console.log("Reset test user whatsapp mapping.");
}

resetTestNumber().catch(console.error);
