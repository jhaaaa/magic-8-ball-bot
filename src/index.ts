import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { Agent, CommandRouter } from "@xmtp/agent-sdk";

// ---------------------------------------------------------------------------
// 1. THE BRAIN — Claude API with a Magic 8 Ball persona
// ---------------------------------------------------------------------------

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are the Mysterious Magic 8 Ball — an ancient, all-knowing oracle that answers yes/no questions.

Rules:
- Keep responses to 1-2 sentences maximum
- Be cryptic, mystical, and dramatic
- Sometimes be playful or ominously vague
- If the question isn't a yes/no question, gently redirect: "The spirits require a yes or no question..."
- Never break character
- Never mention that you are an AI or Claude`;

async function askTheBall(question: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: question }],
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "The spirits are silent...";
}

// ---------------------------------------------------------------------------
// 2. THE MESSAGING FRAMEWORK — XMTP Agent SDK
// ---------------------------------------------------------------------------

// createFromEnv() reads XMTP_WALLET_KEY, XMTP_DB_ENCRYPTION_KEY, and XMTP_ENV
// from process.env and handles all key format normalization automatically.
const agent = await Agent.createFromEnv();

// CommandRouter middleware handles slash commands so we don't have to
const router = new CommandRouter({ helpCommand: "/help" });

router.command("/help", "Show help message", async (ctx) => {
  await ctx.conversation.sendText(
    `🔮 Magic 8 Ball 🔮

Ask me a yes/no question and I will consult the spirits.

Commands:
  /help — this message

Powered by XMTP + Claude`,
  );
});

agent.use(router.middleware());

// ---------------------------------------------------------------------------
// 3. THE GLUE — Connect incoming messages to the brain, send responses back
// ---------------------------------------------------------------------------

agent.on("text", async (ctx) => {
  const question = ctx.message.content;
  console.log(`Question: "${question}"`);

  const answer = await askTheBall(question);
  console.log(`Answer: "${answer}"`);

  await ctx.conversation.sendText(`🔮 ${answer}`);
});

agent.on("start", () => {
  console.log(`🔮 Magic 8 Ball is online`);
  console.log(`   Address: ${agent.address}`);
  console.log(`   Chat: http://xmtp.chat/dm/${agent.address}`);
});

agent.on("unhandledError", (error) => {
  console.error("Error:", error);
});

await agent.start();
