import { BufferMemory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import * as p from "@clack/prompts";
import * as fs from "fs";
import pc from "picocolors";
import path, { dirname } from "path";
import os from "os";
import packageJson from "../package.json";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = path.join(os.homedir(), ".duet-gpt");
const promptPath = path.join(__dirname, "../boot.prompt");

async function getApiKey() {
  if (process.env.OPEN_AI_KEY) {
    return process.env.OPEN_AI_KEY;
  }

  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return config.OPEN_AI_KEY;
  } else {
    const apiKey = await p.text({
      message: "Please enter your OpenAI API key: ",
      placeholder: "sk-XXX…",
    });
    if (p.isCancel(apiKey) || !apiKey) {
      p.cancel("OpenAI API key is required to run DuetGPT");
      process.exit(0);
    }
    fs.writeFileSync(configPath, JSON.stringify({ OPEN_AI_KEY: apiKey }));
    return apiKey;
  }
}

export async function boot() {
  console.log(
    pc.bold(
      pc.yellow(
        "⚠️ DuetGPT has no guardrails! Make sure you understand the commands given by the AI before executing them. ⚠️"
      )
    )
  );

  console.log(
    pc.cyan(`
     _            _              _   
    | |          | |            | |  
  __| |_   _  ___| |_ __ _ _ __ | |_ 
 / _\` | | | |/ _ \\ __/ _\` | '_ \\| __|
| (_| | |_| |  __/ || (_| | |_) | |_ 
 \\__,_|\\__,_|\\___|\\__\\__, | .__/ \\__|
                      __/ | |        
                     |___/|_|        
  `)
  );

  p.intro(`DuetGPT v${packageJson.version}`);

  // Get the OpenAI API key from config or prompt the user for it
  const openAIApiKey = await getApiKey();

  // Show a spinner while booting
  const s = p.spinner();
  s.start("Starting LLM and memory");

  // Create a new OpenAI LLM instance
  const model = new OpenAI({
    openAIApiKey: openAIApiKey,
    modelName: "gpt-4",
  });

  // Create a new memory instance
  const memory = new BufferMemory();

  // Create a new conversation chain instance
  const chain = new ConversationChain({ llm: model, memory: memory });

  // Read the boot sequence from the boot.prompt file and send it to the AI
  try {
    const bootResponse = await chain.call({
      input: fs.readFileSync(promptPath, "utf8"),
    });

    // Boot sequence is done, so stop the spinner
    s.stop("LLM and memory started");

    return { bootResponse, chain };
  } catch (e) {
    p.cancel((e as Error).message);
    process.exit(0);
  }
}
