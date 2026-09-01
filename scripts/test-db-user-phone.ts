import { prisma } from "../lib/prisma";

async function checkAndUpdatePhone() {
  const users = await prisma.user.findMany({
    where: { whatsappNumber: { not: null } },
  });

  console.log("Current Users with WhatsApp:", users.map(u => ({ id: u.id, name: u.name, phone: u.whatsappNumber, verified: u.whatsappVerified })));

  for (const u of users) {
    if (u.whatsappNumber && u.whatsappNumber.length === 10) {
      const updated = `91${u.whatsappNumber}`;
      await prisma.user.update({
        where: { id: u.id },
        data: { whatsappNumber: updated },
      });
      console.log(`Updated user ${u.name} phone from ${u.whatsappNumber} to ${updated}`);
    }
  }
}

checkAndUpdatePhone().catch(console.error);
