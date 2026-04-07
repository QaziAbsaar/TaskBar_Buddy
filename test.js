const fs = require('fs');
const path = require('path');

let allPassed = true;
let testCount = 0;
let passCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`  PASS: ${name}`);
  } catch (e) {
    allPassed = false;
    console.log(`  FAIL: ${name}`);
    console.log(`        ${e.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

const ROOT = __dirname;

console.log('\n=== File Existence ===');

const requiredFiles = [
  'main.js', 'llm.js', 'index.html', 'command.html',
  'settings.html', 'package.json', 'start.bat', 'start.ps1',
  'assets/humungousaur-idle.svg', 'assets/humungousaur-angry.svg', 'assets/tray-icon.svg',
  'node_modules/electron/dist/electron.exe',
  'node_modules/@google/generative-ai/dist/index.js'
];

requiredFiles.forEach(f => {
  test(`${f} exists`, () => {
    assert(fs.existsSync(path.join(ROOT, f)), `${f} not found`);
  });
});

console.log('\n=== package.json ===');

test('valid JSON with correct main', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
  assert(pkg.main === 'main.js');
  assert(pkg.dependencies.electron);
  assert(pkg.dependencies['@google/generative-ai']);
});

console.log('\n=== llm.js ===');

const llmCode = fs.readFileSync(path.join(ROOT, 'llm.js'), 'utf-8');

test('imports GoogleGenerativeAI', () => {
  assert(llmCode.includes("require('@google/generative-ai')"));
});

test('has SYSTEM_PROMPT with Humungousaur persona', () => {
  assert(llmCode.includes('SYSTEM_PROMPT'));
  assert(llmCode.includes('Humungousaur'));
});

test('system prompt defines action JSON format', () => {
  assert(llmCode.includes('```action'));
  assert(llmCode.includes('open_app'));
  assert(llmCode.includes('search_web'));
  assert(llmCode.includes('open_url'));
  assert(llmCode.includes('run_command'));
  assert(llmCode.includes('open_path'));
});

test('exports initialize, isInitialized, sendMessage, resetChat', () => {
  assert(llmCode.includes('module.exports'));
  assert(llmCode.includes('initialize'));
  assert(llmCode.includes('isInitialized'));
  assert(llmCode.includes('sendMessage'));
  assert(llmCode.includes('resetChat'));
});

test('parseResponse extracts action blocks', () => {
  assert(llmCode.includes('parseResponse'));
  assert(llmCode.includes('actionMatch'));
  assert(llmCode.includes('JSON.parse'));
});

test('uses gemini-2.0-flash model', () => {
  assert(llmCode.includes('gemini-2.0-flash'));
});

test('sendMessage is async', () => {
  assert(llmCode.includes('async function sendMessage'));
});

test('parseResponse unit test - text only', () => {
  const parseResponse = new Function('text', `
    const actionMatch = text.match(/\\\`\\\`\\\`action\\s*\\n?([\\s\\S]*?)\\n?\\\`\\\`\\\`/);
    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1].trim());
        const message = text.replace(/\\\`\\\`\\\`action\\s*\\n?[\\s\\S]*?\\n?\\\`\\\`\\\`/, '').trim();
        return { message: message || null, action };
      } catch (e) {
        return { message: text, action: null };
      }
    }
    return { message: text, action: null };
  `);

  const r1 = parseResponse("Just a normal reply.");
  assert(r1.message === "Just a normal reply.");
  assert(r1.action === null);
});

test('parseResponse unit test - action block', () => {
  const parseResponse = new Function('text', `
    const actionMatch = text.match(/\\\`\\\`\\\`action\\s*\\n?([\\s\\S]*?)\\n?\\\`\\\`\\\`/);
    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1].trim());
        const message = text.replace(/\\\`\\\`\\\`action\\s*\\n?[\\s\\S]*?\\n?\\\`\\\`\\\`/, '').trim();
        return { message: message || null, action };
      } catch (e) {
        return { message: text, action: null };
      }
    }
    return { message: text, action: null };
  `);

  const r2 = parseResponse('Opening it up!\n\`\`\`action\n{"type": "open_app", "target": "notepad"}\n\`\`\`');
  assert(r2.action !== null, 'action should not be null');
  assert(r2.action.type === 'open_app');
  assert(r2.action.target === 'notepad');
  assert(r2.message === 'Opening it up!');
});

test('parseResponse unit test - action only (no text)', () => {
  const parseResponse = new Function('text', `
    const actionMatch = text.match(/\\\`\\\`\\\`action\\s*\\n?([\\s\\S]*?)\\n?\\\`\\\`\\\`/);
    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[1].trim());
        const message = text.replace(/\\\`\\\`\\\`action\\s*\\n?[\\s\\S]*?\\n?\\\`\\\`\\\`/, '').trim();
        return { message: message || null, action };
      } catch (e) {
        return { message: text, action: null };
      }
    }
    return { message: text, action: null };
  `);

  const r3 = parseResponse('\`\`\`action\n{"type": "search_web", "query": "weather today"}\n\`\`\`');
  assert(r3.action !== null);
  assert(r3.action.type === 'search_web');
  assert(r3.action.query === 'weather today');
  assert(r3.message === null);
});

console.log('\n=== main.js ===');

const mainCode = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf-8');

test('deletes ELECTRON_RUN_AS_NODE first', () => {
  assert(mainCode.split('\n')[0].includes('ELECTRON_RUN_AS_NODE'));
});

test('imports llm module', () => {
  assert(mainCode.includes("require('./llm')"));
});

test('has config load/save for API key', () => {
  assert(mainCode.includes('loadConfig'));
  assert(mainCode.includes('saveConfig'));
  assert(mainCode.includes('config.json'));
});

test('has executeAction function with all action types', () => {
  assert(mainCode.includes('function executeAction'));
  assert(mainCode.includes("case 'open_app'"));
  assert(mainCode.includes("case 'open_path'"));
  assert(mainCode.includes("case 'search_web'"));
  assert(mainCode.includes("case 'open_url'"));
  assert(mainCode.includes("case 'run_command'"));
});

test('has chat-message IPC handler', () => {
  assert(mainCode.includes("'chat-message'"));
  assert(mainCode.includes('llm.sendMessage'));
});

test('has check-api-key IPC handler', () => {
  assert(mainCode.includes("'check-api-key'"));
  assert(mainCode.includes('llm.isInitialized'));
});

test('has save-api-key IPC handler', () => {
  assert(mainCode.includes("'save-api-key'"));
  assert(mainCode.includes('llm.initialize'));
});

test('has get-api-key IPC handler', () => {
  assert(mainCode.includes("'get-api-key'"));
});

test('has reset-chat IPC handler', () => {
  assert(mainCode.includes("'reset-chat'"));
  assert(mainCode.includes('llm.resetChat'));
});

test('has createSettingsWindow', () => {
  assert(mainCode.includes('function createSettingsWindow'));
  assert(mainCode.includes("'settings.html'"));
});

test('tray menu has Settings option', () => {
  assert(mainCode.includes("'Settings'"));
  assert(mainCode.includes('createSettingsWindow'));
});

test('handles LLM errors gracefully', () => {
  assert(mainCode.includes('API_KEY_INVALID'));
  assert(mainCode.includes('RATE_LIMIT'));
});

test('all exec calls use shell: cmd.exe', () => {
  const lines = mainCode.split('\n');
  const execLines = lines.filter(l => l.includes('exec(') && l.includes('start'));
  execLines.forEach(line => {
    assert(line.includes("shell: 'cmd.exe'"), `exec call missing shell: cmd.exe -> ${line.trim()}`);
  });
  assert(execLines.length >= 2, `Expected at least 2 exec start calls, found ${execLines.length}`);
});

console.log('\n=== index.html (character overlay) ===');

const indexCode = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');

test('references SVG sprites', () => {
  assert(indexCode.includes('humungousaur-idle.svg'));
  assert(indexCode.includes('humungousaur-angry.svg'));
});

test('has walking/angry/idle animations', () => {
  assert(indexCode.includes('@keyframes walk-bounce'));
  assert(indexCode.includes('@keyframes angry-shake'));
  assert(indexCode.includes('@keyframes idle-breathe'));
});

test('has mouseenter/mouseleave for angry state', () => {
  assert(indexCode.includes("'mouseenter'"));
  assert(indexCode.includes("'mouseleave'"));
  assert(indexCode.includes('isAngry = true'));
  assert(indexCode.includes('isAngry = false'));
});

test('has IPC for mouse events and command panel', () => {
  assert(indexCode.includes("'set-ignore-mouse'"));
  assert(indexCode.includes("'open-command-panel'"));
});

test('animation loop always calls rAF', () => {
  const rAFCount = (indexCode.match(/requestAnimationFrame\(updatePosition\)/g) || []).length;
  assert(rAFCount === 2, `Expected 2 rAF calls, found ${rAFCount}`);
});

console.log('\n=== command.html (chat UI) ===');

const cmdCode = fs.readFileSync(path.join(ROOT, 'command.html'), 'utf-8');

test('has chat area and input', () => {
  assert(cmdCode.includes('id="chat-area"'));
  assert(cmdCode.includes('id="input"'));
  assert(cmdCode.includes('id="send-btn"'));
});

test('has typing indicator', () => {
  assert(cmdCode.includes('id="typing"'));
  assert(cmdCode.includes('typing-dot'));
  assert(cmdCode.includes('typing-indicator'));
});

test('has status dot for API key state', () => {
  assert(cmdCode.includes('id="status-dot"'));
  assert(cmdCode.includes('status-dot'));
  assert(cmdCode.includes("'check-api-key'"));
  assert(cmdCode.includes("'api-key-status'"));
});

test('sends chat-message via IPC', () => {
  assert(cmdCode.includes("'chat-message'"));
});

test('receives chat-response via IPC', () => {
  assert(cmdCode.includes("'chat-response'"));
});

test('has reset chat button', () => {
  assert(cmdCode.includes('id="reset-btn"'));
  assert(cmdCode.includes("'reset-chat'"));
});

test('has formatText for markdown rendering', () => {
  assert(cmdCode.includes('function formatText'));
  assert(cmdCode.includes('<code>'));
  assert(cmdCode.includes('<pre>'));
  assert(cmdCode.includes('<strong>'));
});

test('has action message display', () => {
  assert(cmdCode.includes('action-msg'));
  assert(cmdCode.includes('actionResult'));
});

test('has error state display', () => {
  assert(cmdCode.includes('.error'));
  assert(cmdCode.includes('data.error'));
});

test('disables send button while waiting', () => {
  assert(cmdCode.includes('sendBtn.disabled'));
  assert(cmdCode.includes('isWaiting'));
});

console.log('\n=== settings.html ===');

const settingsCode = fs.readFileSync(path.join(ROOT, 'settings.html'), 'utf-8');

test('has API key input', () => {
  assert(settingsCode.includes('id="api-key"'));
  assert(settingsCode.includes('type="password"'));
});

test('has save and cancel buttons', () => {
  assert(settingsCode.includes('id="save-btn"'));
  assert(settingsCode.includes('id="cancel-btn"'));
});

test('sends save-api-key IPC', () => {
  assert(settingsCode.includes("'save-api-key'"));
});

test('requests current key on load', () => {
  assert(settingsCode.includes("'get-api-key'"));
  assert(settingsCode.includes("'current-api-key'"));
});

test('has link to Google AI Studio', () => {
  assert(settingsCode.includes('aistudio.google.com'));
});

test('shows save status feedback', () => {
  assert(settingsCode.includes("'api-key-saved'"));
  assert(settingsCode.includes('result.success'));
});

console.log('\n=== SVG Assets ===');

['humungousaur-idle.svg', 'humungousaur-angry.svg', 'tray-icon.svg'].forEach(file => {
  test(`${file} is valid SVG`, () => {
    const svg = fs.readFileSync(path.join(ROOT, 'assets', file), 'utf-8');
    assert(svg.includes('<svg'));
    assert(svg.includes('</svg>'));
    assert(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
  });
});

test('angry SVG has red eyes and teeth', () => {
  const svg = fs.readFileSync(path.join(ROOT, 'assets', 'humungousaur-angry.svg'), 'utf-8');
  assert(svg.includes('#FF4444') || svg.includes('#FF0000'));
  assert(svg.includes('FFFFDD') || svg.includes('teeth'));
});

console.log('\n=== Launchers ===');

test('start.bat unsets ELECTRON_RUN_AS_NODE', () => {
  const bat = fs.readFileSync(path.join(ROOT, 'start.bat'), 'utf-8');
  assert(bat.includes('set ELECTRON_RUN_AS_NODE=\r\n') || bat.includes('set ELECTRON_RUN_AS_NODE=\n'));
  assert(bat.includes('electron.exe'));
});

test('start.ps1 clears ELECTRON_RUN_AS_NODE', () => {
  const ps1 = fs.readFileSync(path.join(ROOT, 'start.ps1'), 'utf-8');
  assert(ps1.includes('ELECTRON_RUN_AS_NODE'));
  assert(ps1.includes('electron.exe'));
});

console.log('\n=============================');
console.log(`Results: ${passCount}/${testCount} passed`);
if (allPassed) {
  console.log('ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log('SOME TESTS FAILED');
  process.exit(1);
}
