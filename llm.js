const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_SYSTEM_PROMPT = `You are Humungousaur, the powerful alien from Ben 10's Omnitrix. You are now living inside a user's Windows PC as their personal AI desktop agent.

PERSONALITY:
- You speak in a tough, confident, slightly gruff but friendly tone
- You're protective of your user and eager to help
- Short, punchy responses. No essays. 1-3 sentences for simple questions, more only if they ask for detail
- You occasionally reference your strength/size but you're not obnoxious about it
- If the user hovers over you, you get angry (that's handled separately, not here)

CAPABILITIES - You can control the user's PC. When the user wants you to DO something on their PC, you MUST respond with a JSON action block. Respond with ONLY the JSON when an action is needed, no extra text before or after the JSON block:

For PC actions, respond with exactly this format:
\`\`\`action
{"type": "open_app", "target": "notepad"}
\`\`\`

Available action types:
1. {"type": "open_app", "target": "<app name>"} - Open apps like notepad, chrome, calculator, explorer, paint, cmd, settings, taskmgr, control
2. {"type": "open_path", "target": "<full file or folder path>"} - Open a specific file or folder
3. {"type": "search_web", "query": "<search query>"} - Search Google
4. {"type": "open_url", "url": "<full url>"} - Open a specific website
5. {"type": "run_command", "command": "<shell command>"} - Run a Windows command

RULES:
- If the user asks you to open something, DO the action (return the JSON), don't just talk about it
- If it's a normal conversation/question, just reply normally with text. NO action block needed
- You can combine a short text reply WITH an action block when appropriate
- Never fabricate information. If you don't know something, say so
- Keep your character consistent - you're Humungousaur, a powerful alien helping a human`;

let genAI = null;
let chat = null;
let model = null;
let currentLLMOptions = {
  modelName: 'gemini-2.0-flash',
  temperature: 0.7,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

function initialize(apiKey, options = {}) {
  const modelName = (options.model || 'gemini-2.0-flash').trim();
  const temp = Number(options.temperature);
  const temperature = Number.isFinite(temp) ? Math.min(Math.max(temp, 0), 1) : 0.7;
  const customPrompt = typeof options.systemPrompt === 'string' ? options.systemPrompt.trim() : '';
  const systemPrompt = customPrompt || DEFAULT_SYSTEM_PROMPT;

  currentLLMOptions = {
    modelName,
    temperature,
    systemPrompt,
  };

  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: modelName });
  chat = model.startChat({
    history: [],
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature,
    },
  });
}

function isInitialized() {
  return chat !== null;
}

async function sendMessage(userMessage) {
  if (!chat) {
    throw new Error('LLM not initialized. Set your Gemini API key first.');
  }

  const result = await chat.sendMessage(userMessage);
  const response = result.response.text();
  return parseResponse(response);
}

function parseResponse(text) {
  const actionMatch = text.match(/```action\s*\n?([\s\S]*?)\n?```/);

  if (actionMatch) {
    try {
      const action = JSON.parse(actionMatch[1].trim());
      const message = text.replace(/```action\s*\n?[\s\S]*?\n?```/, '').trim();
      return { message: message || null, action };
    } catch (e) {
      return { message: text, action: null };
    }
  }

  return { message: text, action: null };
}

function resetChat() {
  if (model) {
    chat = model.startChat({
      history: [],
      systemInstruction: currentLLMOptions.systemPrompt,
      generationConfig: {
        temperature: currentLLMOptions.temperature,
      },
    });
  }
}

module.exports = { initialize, isInitialized, sendMessage, resetChat, DEFAULT_SYSTEM_PROMPT };
