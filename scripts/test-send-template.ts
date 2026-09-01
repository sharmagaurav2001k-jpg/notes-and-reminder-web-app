import dotenv from "dotenv";
dotenv.config();

import { sendWhatsAppTemplateMessage } from "../lib/whatsapp";

async function sendTemplate() {
  console.log("Sending Meta 'hello_world' template message to 917486007596...");
  try {
    const res = await sendWhatsAppTemplateMessage({
      to: "917486007596",
      templateName: "hello_world",
      languageCode: "en_US",
    });
    console.log("Template Response:", JSON.stringify(res, null, 2));
  } catch (e: any) {
    console.error("Template Error:", e.message);
  }
}

sendTemplate().catch(console.error);
