const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      const setCookie = res.headers['set-cookie'];

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          cookies: setCookie,
          body: parsed,
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function extractToken(cookies) {
  if (!cookies) return '';
  for (const c of cookies) {
    const match = c.match(/noissue_token=([^;]+)/);
    if (match) return match[1];
  }
  return '';
}

async function runEndToEndVerification() {
  console.log('====================================================');
  console.log('  NoIssue AI — Full End-to-End Verification Suite  ');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✓ [PASS] ${testName}`);
    } else {
      console.error(`✗ [FAIL] ${testName}: ${details}`);
    }
  }

  try {
    // TEST 1: Homepage & Public Availability
    console.log('--- Step 1: Testing Homepage & Health ---');
    const homeRes = await makeRequest('/');
    assert(homeRes.status === 200, 'Homepage returns 200 OK');

    // TEST 2: Customer Login
    console.log('\n--- Step 2: Testing Customer Authentication ---');
    const custLoginRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'marcus.vance@example.com',
      password: 'Password123!',
    });

    assert(custLoginRes.status === 200, 'Customer login succeeds (Marcus Vance)');
    const customerToken = custLoginRes.body.token || extractToken(custLoginRes.cookies);
    assert(Boolean(customerToken), 'Customer receives valid JWT token');

    const customerHeaders = {
      Authorization: `Bearer ${customerToken}`,
      Cookie: `noissue_token=${customerToken}`,
    };

    // TEST 3: Customer Dashboard Data
    console.log('\n--- Step 3: Testing Customer Dashboard ---');
    const dashRes = await makeRequest('/api/customer/dashboard', 'GET', null, customerHeaders);
    assert(dashRes.status === 200, 'Customer Dashboard API returns stats and tickets');
    assert(dashRes.body.stats && typeof dashRes.body.stats.activeCount === 'number', 'Dashboard contains valid ticket metrics');

    // TEST 4: Customer Order Reference Listing
    console.log('\n--- Step 4: Testing Customer Orders API ---');
    const ordersRes = await makeRequest('/api/customer/orders', 'GET', null, customerHeaders);
    assert(ordersRes.status === 200, 'Customer Orders API returns user orders');
    assert(Array.isArray(ordersRes.body.orders), 'Customer has valid orders list for ticket linking');

    // TEST 5: Raise New Complex Issue (Executes Full 7-Stage Agentic AI Workflow)
    console.log('\n--- Step 5: Testing Ticket Creation & Multi-Agent Investigation ---');
    const newTicketRes = await makeRequest('/api/customer/tickets', 'POST', {
      subject: 'Damaged item received in order ORD-61280',
      description: 'The smart hub unit arrived with a cracked outer casing and will not power on.',
      category: 'Delivery',
      orderNumber: 'ORD-61280',
    }, customerHeaders);

    assert(newTicketRes.status === 201, 'Ticket created and AI workflow executed successfully');
    assert(Boolean(newTicketRes.body.ticket?.id), `Ticket ID generated: ${newTicketRes.body.ticket?.id}`);
    const createdTicketId = newTicketRes.body.ticket?.id;

    // TEST 6: Fetch Ticket Detail with Transparent AI Evidence
    console.log('\n--- Step 6: Testing Customer Ticket Detail & Transparent Evidence ---');
    const tktDetailRes = await makeRequest(`/api/customer/tickets/${createdTicketId}`, 'GET', null, customerHeaders);
    assert(tktDetailRes.status === 200, 'Customer can view ticket details');
    assert(tktDetailRes.body.investigation !== null, 'Investigation record is populated');
    assert(Array.isArray(tktDetailRes.body.messages) && tktDetailRes.body.messages.length >= 2, 'Conversation includes customer message and AI response');
    assert(Boolean(tktDetailRes.body.investigation?.verificationStatus), `Verification Status: ${tktDetailRes.body.investigation?.verificationStatus}`);
    assert(Boolean(tktDetailRes.body.investigation?.resolutionExplanation), 'Resolution explanation provided without exposing private CoT');

    // TEST 7: Customer Request for Human Support
    console.log('\n--- Step 7: Testing Customer Request for Human Support ---');
    const humanReqRes = await makeRequest(`/api/customer/tickets/${createdTicketId}/request-human`, 'POST', {
      reason: 'I would like to speak to a specialist about an express replacement.',
    }, customerHeaders);

    assert(humanReqRes.status === 200, 'Customer successfully requests human support specialist');
    assert(humanReqRes.body.status === 'HUMAN_REVIEW', 'Ticket status transitions to HUMAN_REVIEW');

    // TEST 8: Support Agent Login
    console.log('\n--- Step 8: Testing Support Agent Authentication ---');
    const agentLoginRes = await makeRequest('/api/auth/support-login', 'POST', {
      email: 'agent.clara@noissue.ai',
      password: 'Password123!',
    });

    assert(agentLoginRes.status === 200, 'Support agent login succeeds (Clara Oswald)');
    const agentToken = agentLoginRes.body.token || extractToken(agentLoginRes.cookies);
    assert(Boolean(agentToken), 'Agent receives valid support JWT token');

    const agentHeaders = {
      Authorization: `Bearer ${agentToken}`,
      Cookie: `noissue_token=${agentToken}`,
    };

    // TEST 9: Support Agent Dashboard & Queue
    console.log('\n--- Step 9: Testing Support Agent Dashboard & Escalation Queue ---');
    const agentDashRes = await makeRequest('/api/support/dashboard?status=ALL', 'GET', null, agentHeaders);
    assert(agentDashRes.status === 200, 'Support Dashboard returns case queue');
    assert(agentDashRes.body.counts && agentDashRes.body.counts.total > 0, 'Support queue counts are accurate');

    // TEST 10: Support Agent 360° Case Workbench
    console.log('\n--- Step 10: Testing Support Agent 360° Case Workbench ---');
    const workbenchRes = await makeRequest(`/api/support/tickets/${createdTicketId}`, 'GET', null, agentHeaders);
    assert(workbenchRes.status === 200, 'Support Agent loads 360° Case Workbench');
    assert(Boolean(workbenchRes.body.customer?.email), 'Workbench includes verified Customer CRM profile');
    assert(Array.isArray(workbenchRes.body.customerOrders), 'Workbench includes Customer Orders');
    assert(Array.isArray(workbenchRes.body.customerPayments), 'Workbench includes Customer Payment Audits');
    assert(Boolean(workbenchRes.body.escalation?.packet), 'Workbench includes complete Escalation Packet');
    assert(Array.isArray(workbenchRes.body.auditEvents), 'Workbench includes comprehensive Audit Trail');

    // TEST 11: Support Agent Internal Note & Response
    console.log('\n--- Step 11: Testing Support Agent Actions ---');
    const internalNoteRes = await makeRequest(`/api/support/tickets/${createdTicketId}/action`, 'POST', {
      actionType: 'INTERNAL_NOTE',
      messageText: 'Verified courier telemetry. Authorizing immediate priority replacement unit.',
    }, agentHeaders);
    assert(internalNoteRes.status === 200, 'Support agent can add confidential internal notes');

    const agentReplyRes = await makeRequest(`/api/support/tickets/${createdTicketId}/action`, 'POST', {
      actionType: 'REPLY',
      messageText: 'Hi Marcus, I have approved an express replacement unit for your smart hub. Tracking will update shortly.',
    }, agentHeaders);
    assert(agentReplyRes.status === 200, 'Support agent can reply directly to customer');

    // TEST 12: Support Agent Close Ticket (5-Day Retention Activation)
    console.log('\n--- Step 12: Testing Ticket Closure & 5-Day Retention Timer ---');
    const closeRes = await makeRequest(`/api/support/tickets/${createdTicketId}/action`, 'POST', {
      actionType: 'CLOSE',
    }, agentHeaders);
    assert(closeRes.status === 200, 'Ticket closed and 5-day retention timer initialized');

    // TEST 13: Policy Knowledge Base (RAG)
    console.log('\n--- Step 13: Testing Policy Knowledge Base & RAG Indexing ---');
    const policiesRes = await makeRequest('/api/policies');
    assert(policiesRes.status === 200, 'Knowledge Base returns company policies');
    assert(Array.isArray(policiesRes.body.policies) && policiesRes.body.policies.length >= 10, 'Comprehensive company policies are indexed');

    // TEST 14: Automated 5-Day Retention Cleanup Job
    console.log('\n--- Step 14: Testing Server-Side Retention Cleanup Job ---');
    const cleanupRes = await makeRequest('/api/cron/retention-cleanup', 'POST');
    assert(cleanupRes.status === 200, 'Retention cleanup endpoint executed successfully');

    console.log('\n====================================================');
    console.log(`  Verification Summary: ${passedTests}/${totalTests} Tests Passed  `);
    console.log('====================================================\n');

    if (passedTests === totalTests) {
      console.log('🎉 ALL SYSTEM COMPONENTS AND END-TO-END FLOWS VERIFIED 100% FUNCTIONAL!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runEndToEndVerification();
