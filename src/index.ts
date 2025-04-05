import "dotenv/config";
import { createSigner, getEncryptionKeyFromHex } from "@helpers";
import { Client, type XmtpEnv } from "@xmtp/node-sdk";

/* Get the wallet key associated to the public key of
 * the agent and the encryption key for the local db
 * that stores your agent's messages */
const { WALLET_KEY, ENCRYPTION_KEY } = process.env;

if (!WALLET_KEY) {
  throw new Error("WALLET_KEY must be set");
}

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY must be set");
}

/* Create the signer using viem and parse the encryption key for the local db */
const signer = createSigner(WALLET_KEY);
const encryptionKey = getEncryptionKeyFromHex(ENCRYPTION_KEY);

/* Set the environment to local, dev or production */
const env: XmtpEnv =
  process.env.XMTP_ENV !== undefined
    ? (process.env.XMTP_ENV as XmtpEnv)
    : "production";

// Array of possible responses
const responses = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes - definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
];

// Welcome message for new conversations
const welcomeMessage = `🔮🎱 Magic 8 Ball Bot 🎱🔮

Ask a yes/no question. Get a cosmic answer. ✨  

Ask your question now...

Type /help to learn more`;

// Help message
const helpMessage = `🔮🎱 Magic 8 Ball Bot Help 🎱🔮

Send me a yes/no question. Get a cosmic answer. ✨

About me:
- I reply to a message with a randomly selected answer
- I reply to /help with this help message
- I can't initiate conversations
- I work in apps built with XMTP: https://xmtp.org

Verify my identity:
- ENS: magic🎱.eth
- Address: 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266  
- GitHub: https://github.com/jhaaaa/magic-8-ball-bot 

May serendipity be ever in your favor 🌈`;

// Function to get a random response
function getRandomResponse(): string {
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex];
}

// Function to format the response like a Magic 8 Ball
function formatMagic8BallResponse(question: string, answer: string): string {
  return `🔮🎱 Magic 8 Ball Bot 🎱🔮

🪄 Answer: ${answer}

Ask another question to continue...

Type /help for more mystical guidance`;
}

async function main() {
  try {
    console.log(`Creating client on the '${env}' network...`);
    /* Initialize the xmtp client */
    const client = await Client.create(signer, encryptionKey, { env });

    console.log("Syncing conversations...");
    /* Sync the conversations from the network to update the local db */
    await client.conversations.sync();

    const identifier = await signer.getIdentifier();
    const address = identifier.identifier;
    console.log(
      `Magic 8 Ball Bot initialized on ${address}\nSend a message on http://xmtp.chat/dm/${address}?env=${env}`,
    );

    // Remove the open URL part since we're deploying
    console.log("Waiting for questions...");
    const stream = client.conversations.streamAllMessages();

    for await (const message of await stream) {
      try {
        /* Ignore messages from the same agent or non-text messages */
        if (
          message?.senderInboxId.toLowerCase() ===
            client.inboxId.toLowerCase() ||
          message?.contentType?.typeId !== "text"
        ) {
          continue;
        }

        const messageContent = message.content as string;
        console.log(
          `Received message: ${messageContent} by ${message.senderInboxId}`,
        );

        /* Get the conversation by id */
        const conversation = client.conversations.getDmByInboxId(
          message.senderInboxId,
        );

        if (!conversation) {
          console.log("Unable to find conversation, skipping");
          continue;
        }

        const inboxState = await client.preferences.inboxStateFromInboxIds([
          message.senderInboxId,
        ]);
        const addressFromInboxId = inboxState[0].identifiers[0].identifier;

        // Check if this is the first message in the conversation
        const messages = await conversation.messages();
        const isFirstMessage = messages.length <= 1;

        if (isFirstMessage) {
          // For first messages, send the welcome message
          console.log(`Sending welcome message to ${addressFromInboxId}...`);
          await conversation.send(welcomeMessage);
        } else {
          // Check for /help command
          if (messageContent.toLowerCase().trim() === '/help') {
            console.log(`Sending help message to ${addressFromInboxId}...`);
            await conversation.send(helpMessage);
          } else {
            // For regular questions, send the Magic 8 Ball response
            const randomResponse = getRandomResponse();
            const formattedResponse = formatMagic8BallResponse(
              messageContent,
              randomResponse,
            );

            console.log(
              `Sending Magic 8 Ball response to ${addressFromInboxId}...`,
            );
            await conversation.send(formattedResponse);
          }
        }

        console.log("Waiting for questions...");
      } catch (error) {
        console.error("Error processing message:", error);
        // Continue processing other messages even if one fails
      }
    }
  } catch (error) {
    console.error("Fatal error in main loop:", error);
    process.exit(1);
  }
}

// Add process signal handlers for graceful shutdown
process.on("SIGINT", () => {
  console.log("Received SIGINT. Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM. Shutting down gracefully...");
  process.exit(0);
});

main().catch((error: unknown) => {
  console.error(
    "Unhandled error:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
