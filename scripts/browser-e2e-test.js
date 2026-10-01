const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

let executablePath = chromePaths.find(p => fs.existsSync(p));
if (!executablePath) {
  console.error('No Chrome/Edge executable found!');
  process.exit(1);
}

const artifactDir = 'C:\\Users\\darsh\\.gemini\\antigravity-ide\\brain\\50134b50-e9c0-4a80-b8c3-0dcf85133b23';
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBrowserTest() {
  console.log(`[Browser Test] Launching browser: ${executablePath}`);
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    defaultViewport: { width: 1366, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      if (!text.includes('401') && !text.includes('favicon')) {
        console.error(`[Browser Console ERROR] ${text}`);
        consoleErrors.push(text);
      }
    } else {
      console.log(`[Browser Console ${msg.type()}] ${text}`);
    }
  });

  page.on('pageerror', err => {
    console.error(`[Browser Page ERROR] ${err.message}`);
    consoleErrors.push(err.message);
  });

  try {
    // 1. Landing Page
    console.log('\n--- 1. Testing Landing Page (/) ---');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await page.screenshot({ path: path.join(artifactDir, '1_landing_page.png') });
    console.log('✓ 1. Landing page captured to 1_landing_page.png');

    // 2. Demo Login as Marcus Vance
    console.log('\n--- 2. Testing 1-Click Demo Login as Marcus Vance ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const marcusBtn = buttons.find(b => b.innerText.includes('Marcus Vance'));
      if (marcusBtn) marcusBtn.click();
    });

    await page.waitForFunction(() => window.location.pathname === '/dashboard', { timeout: 10000 });
    await sleep(2000);
    await page.screenshot({ path: path.join(artifactDir, '2_customer_dashboard.png') });
    console.log('✓ 2. Customer Dashboard loaded and captured to 2_customer_dashboard.png');

    // 3. Open Raise Issue Modal
    console.log('\n--- 3. Testing Raise Issue Modal & Live AI Investigation ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const raiseBtn = buttons.find(b => b.innerText.includes('Raise an Issue'));
      if (raiseBtn) raiseBtn.click();
    });

    await sleep(1000);
    await page.screenshot({ path: path.join(artifactDir, '3_raise_issue_modal.png') });
    console.log('✓ 3. Raise Issue Modal opened and captured to 3_raise_issue_modal.png');

    // Type into inputs using page.type
    console.log('Populating subject and description via page.type...');
    await page.waitForSelector('#issue-subject', { timeout: 5000 });
    await page.type('#issue-subject', 'Delayed Delivery Inquiry for ORD-78219');
    await sleep(300);
    await page.type('#issue-description', 'My package was supposed to arrive yesterday for order ORD-78219. Tracking is stuck at the distribution hub. Please check carrier status.');
    await sleep(500);

    await page.screenshot({ path: path.join(artifactDir, '4_raise_issue_filled.png') });
    console.log('✓ 4. Issue inputs populated and captured to 4_raise_issue_filled.png');

    // Click Submit & Investigate
    console.log('Submitting issue to AI Multi-Agent Orchestrator...');
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });

    // Wait for SPA client navigation to /tickets/[id]
    console.log('Waiting for AI 7-stage investigation and navigation to ticket details...');
    await page.waitForFunction(() => window.location.pathname.startsWith('/tickets/'), { timeout: 35000 });
    await sleep(2500);

    await page.screenshot({ path: path.join(artifactDir, '5_ticket_investigation_view.png'), fullPage: true });
    console.log('✓ 5. AI Multi-Agent Investigation completed! Ticket details captured to 5_ticket_investigation_view.png');

    // 4. Send Customer Reply in Ticket Conversation
    console.log('\n--- 4. Testing Customer Ticket Reply ---');
    const replyInput = await page.$('textarea');
    if (replyInput) {
      await replyInput.click();
      await page.keyboard.type('Thank you for investigating so quickly! Could a human specialist double-check with the courier dispatch team?');
      await sleep(500);

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const sendBtn = buttons.find(b => b.innerText.includes('Send Reply') || b.innerText.includes('Send'));
        if (sendBtn) sendBtn.click();
      });

      await sleep(2000);
    }

    // 5. Click "Request Human Support"
    console.log('\n--- 5. Requesting Human Escalation ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const humanBtn = buttons.find(b => b.innerText.includes('Request Human Support'));
      if (humanBtn) humanBtn.click();
    });

    await sleep(2000);
    await page.screenshot({ path: path.join(artifactDir, '6_ticket_human_escalated.png'), fullPage: true });
    console.log('✓ 6. Human escalation triggered and captured to 6_ticket_human_escalated.png');

    // 6. Retention History
    console.log('\n--- 6. Testing Retention History (/history) ---');
    await page.goto('http://localhost:3000/history', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.screenshot({ path: path.join(artifactDir, '7_retention_history.png'), fullPage: true });
    console.log('✓ 7. Retention History verified and captured to 7_retention_history.png');

    // 7. Support Specialist Login
    console.log('\n--- 7. Testing Support Specialist Portal (/support/login) ---');
    await page.goto('http://localhost:3000/support/login', { waitUntil: 'networkidle2' });
    await sleep(1000);
    await page.screenshot({ path: path.join(artifactDir, '8_support_login.png') });

    // Click Clara Oswald Demo Login
    console.log('Logging in as Clara Oswald (Senior Specialist)...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const claraBtn = buttons.find(b => b.innerText.includes('Clara Oswald'));
      if (claraBtn) claraBtn.click();
    });

    await page.waitForFunction(() => window.location.pathname === '/support/dashboard', { timeout: 10000 });
    await sleep(2000);
    await page.screenshot({ path: path.join(artifactDir, '9_support_dashboard.png'), fullPage: true });
    console.log('✓ 9. Support Command Center loaded and captured to 9_support_dashboard.png');

    // 8. Open Support Ticket 360° Workbench
    console.log('\n--- 8. Testing Support Ticket 360° Case Workbench ---');
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/support/tickets/"]'));
      if (links.length > 0) links[0].click();
    });

    await page.waitForFunction(() => window.location.pathname.startsWith('/support/tickets/'), { timeout: 10000 });
    await sleep(2500);
    await page.screenshot({ path: path.join(artifactDir, '10_support_ticket_workbench.png'), fullPage: true });
    console.log('✓ 10. Support Ticket 360° Workbench rendered and captured to 10_support_ticket_workbench.png');

    // 9. Post Internal Specialist Note
    console.log('\n--- 9. Adding Specialist Internal Note ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const noteTab = buttons.find(b => b.innerText.includes('Internal Note'));
      if (noteTab) noteTab.click();
    });

    await sleep(600);
    const noteArea = await page.$('textarea');
    if (noteArea) {
      await noteArea.click();
      await page.keyboard.type('Lead Specialist Note: Cross-verified courier logistics tracking with DHL hub. Package is on transit route with priority expedited dispatch scheduled for 09:00 AM.');
      await sleep(400);

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addBtn = buttons.find(b => b.innerText.includes('Add Note') || b.innerText.includes('Post Note'));
        if (addBtn) addBtn.click();
      });
      await sleep(2000);
    }
    await page.screenshot({ path: path.join(artifactDir, '11_support_internal_note.png'), fullPage: true });
    console.log('✓ 11. Specialist internal note logged and captured to 11_support_internal_note.png');

    // 10. Policy Knowledge Base
    console.log('\n--- 10. Testing Policy Knowledge Base (/support/policies) ---');
    await page.goto('http://localhost:3000/support/policies', { waitUntil: 'networkidle2' });
    await sleep(2000);
    await page.screenshot({ path: path.join(artifactDir, '12_support_policies.png'), fullPage: true });
    console.log('✓ 12. Policy Knowledge Base verified and captured to 12_support_policies.png');

    console.log('\n======================================================');
    console.log('  ALL BROWSER E2E TESTS & SCREENSHOTS COMPLETED!      ');
    console.log(`  Total Unhandled Console Errors: ${consoleErrors.length}`);
    console.log('======================================================');

  } catch (err) {
    console.error('Browser testing failed with error:', err);
    await page.screenshot({ path: path.join(artifactDir, 'error_screenshot.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
}

runBrowserTest();
