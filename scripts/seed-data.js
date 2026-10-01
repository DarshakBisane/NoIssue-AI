const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Self-contained .env loader
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.substring(0, eqIdx).trim();
          const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  }
} catch (e) {
  console.warn("Could not read .env directly:", e.message);
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not defined in environment.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

// Comprehensive Company Policies
const POLICIES = [
  {
    code: "POL-001",
    category: "Refund",
    title: "Standard 30-Day Product Refund Policy",
    summary: "Customers are eligible for a full refund on standard physical goods within 30 days of confirmed delivery if the item is returned in original condition or reported defective.",
    authorityLimit: 150.00,
    requiresHumanReview: false,
    content: `1. Eligibility: Customers can request a full refund within 30 calendar days from the delivery date.
2. Conditions: Items must be in original packaging with accessories, or verified defective upon arrival.
3. Automated Authority: The AI agent is authorized to automatically approve and execute refunds up to $150.00 if payment was successful and delivery occurred within 30 days.
4. Method: Refunds must be credited back to the original payment method.
5. Processing Window: Typically completes within 3-5 business days.`
  },
  {
    code: "POL-002",
    category: "Payment",
    title: "Duplicate Charge and Billing Error Resolution",
    summary: "Immediate full reversal authorized when duplicate charges are detected for a single order reference or identical authorization within 10 minutes.",
    authorityLimit: 200.00,
    requiresHumanReview: false,
    content: `1. Duplicate Charge Criteria: Two or more transactions with identical or matching amounts processed within 24 hours for the same customer account or same cart items.
2. Investigation: Verify with payment gateway record whether second transaction is settled or pending authorization.
3. Automated Authority: AI can immediately initiate an automatic refund of the duplicate transaction up to $200.00 and issue an immediate receipt confirmation.
4. Timeline: Voided authorization reflects in 1-2 business days; settled charges take 3-5 business days.`
  },
  {
    code: "POL-003",
    category: "Delivery",
    title: "Damaged Items in Transit and Immediate Replacement",
    summary: "Protocol for items arriving broken or damaged during courier transit.",
    authorityLimit: 100.00,
    requiresHumanReview: false,
    content: `1. Reporting: Must be reported within 7 days of delivery timestamp.
2. Evidence: Customer description of damage and carrier tracking status indicating rough handling or transit exceptions.
3. Automated Authority: For orders under $100.00, AI can automatically issue a free replacement order or full refund at customer discretion.
4. High Value Items: If order exceeds $100.00, escalate to Human Support Agent with an attached Carrier Claim Packet.`
  },
  {
    code: "POL-004",
    category: "Subscription",
    title: "14-Day Auto-Renewal Grace Period and Cancellation",
    summary: "Full refund provided if customer requests cancellation within 14 days of automatic subscription renewal without substantial usage.",
    authorityLimit: 150.00,
    requiresHumanReview: false,
    content: `1. Grace Period: Customers charged for annual or monthly subscription renewal may request cancellation within 14 days of charge.
2. Verification: Verify subscription renewal timestamp and that usage during grace period does not exceed minimal login threshold.
3. Automated Authority: AI can cancel renewal and issue a 100% refund of the renewal fee up to $150.00.
4. After 14 Days: Prorated refund requires Human Support Agent review.`
  },
  {
    code: "POL-005",
    category: "Delivery",
    title: "Delayed Delivery and Late Transit Compensation",
    summary: "Compensation credits and investigation procedures for shipments exceeding guaranteed delivery estimates.",
    authorityLimit: 50.00,
    requiresHumanReview: false,
    content: `1. Delay Threshold: Tracking shows shipment in transit exceeding estimated delivery by more than 3 business days.
2. Resolution: AI verifies live tracking status. If courier delay is verified, AI can automatically issue a $15.00 shipping credit/courtesy refund.
3. If package is delayed by >7 business days without scan updates, escalate to Human Agent to trigger carrier tracer.`
  },
  {
    code: "POL-006",
    category: "Order",
    title: "Order Cancellation Before Shipment",
    summary: "Immediate order cancellation and full refund if the order has not transitioned to SHIPPED status.",
    authorityLimit: 300.00,
    requiresHumanReview: false,
    content: `1. Status Check: Cancellation is permissible if order status is PROCESSING or PENDING_FULFILLMENT.
2. Automated Authority: AI can cancel order in warehouse queue and trigger immediate 100% refund.
3. If order has already reached SHIPPED status, explain return procedure once received rather than cancelling active transit.`
  },
  {
    code: "POL-007",
    category: "Order",
    title: "Missing Items from Multi-Item Order",
    summary: "Investigation and resolution for orders delivered with missing components or partial shipments.",
    authorityLimit: 80.00,
    requiresHumanReview: false,
    content: `1. Check Split Shipments: Verify if order was fulfilled from multiple distribution centers with separate tracking numbers.
2. If confirmed single package was missing an item under $80.00, AI is authorized to dispatch replacement item or issue partial refund for the missing item.
3. If value exceeds $80.00, flag for human verification.`
  },
  {
    code: "POL-008",
    category: "Security",
    title: "High-Value Claims and Fraud Prevention Protocol",
    summary: "Strict human agent sign-off required for claims exceeding $250.00 or accounts with elevated risk scores.",
    authorityLimit: 250.00,
    requiresHumanReview: true,
    content: `1. High-Value Threshold: Any refund, claim, or compensation request exceeding $250.00 CANNOT be auto-resolved by AI.
2. Risk Score: Any customer account with a risk score >= 50.0 must be routed to Human Support Agents.
3. AI Role: AI must compile full Investigation Packet, verify transaction history, assess policy match, and route to Senior Resolution Specialist.`
  },
  {
    code: "POL-009",
    category: "Payment",
    title: "Payment Succeeded but Order Failed to Generate",
    summary: "Resolution when customer was charged but system failed to generate an active order number.",
    authorityLimit: 200.00,
    requiresHumanReview: false,
    content: `1. Verification: Query payment gateway for orphan transaction ID with successful capture and no linked order ID.
2. Automated Authority: AI can automatically regenerate the order or issue an immediate refund at customer preference.
3. Log audit event for engineering investigation.`
  },
  {
    code: "POL-010",
    category: "VIP",
    title: "VIP and Platinum Customer Priority Handling",
    summary: "Expedited handling, higher autonomous AI resolution limits, and prioritized human routing for VIP members.",
    authorityLimit: 350.00,
    requiresHumanReview: false,
    content: `1. VIP Criteria: Customer profile marked as is_vip=true or Tier='PLATINUM'.
2. Expanded Authority: Autonomous AI refund limit extended to $350.00 for verified VIP customers with clean dispute history.
3. Routing: If human review is needed, ticket is assigned URGENT priority and routed to Tier-2 Escalation Leads.`
  },
  {
    code: "POL-011",
    category: "Account",
    title: "Account Access, Email Change and Security Verifications",
    summary: "Security policies governing credential updates, 2FA recovery, and account lockout assistance.",
    authorityLimit: 0.00,
    requiresHumanReview: true,
    content: `1. Sensitive Operations: Password resets, email changes, and 2FA resets cannot be blindly automated without identity verification.
2. Standard flow: AI provides safe automated self-service recovery link sent to registered email on file.
3. If user claims lost access to primary email, mandatory human review required with KYC verification.`
  },
  {
    code: "POL-012",
    category: "Refund",
    title: "Refund Processing Delays and Banking Timelines",
    summary: "Explanation and investigation procedures when an approved refund has not yet reflected on customer bank statement.",
    authorityLimit: 0.00,
    requiresHumanReview: false,
    content: `1. Banking Timelines: Standard ACH/credit card refunds take 3 to 5 business days, sometimes up to 10 days depending on the customer's financial institution.
2. Investigation: Check payment gateway ARN (Acquirer Reference Number) and refund timestamp.
3. If refund was processed within 5 business days: Provide customer with ARN number and banking timeline explanation.
4. If >10 business days have elapsed: Escalate to Finance/Support Agent for bank trace inquiry.`
  }
];

// Helper to compute basic TF-IDF / keyword vector or mock embedding for fast fallback & RAG
function generateSimpleEmbedding(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const vector = new Array(32).fill(0);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % 32;
    vector[idx] += 1 / (i + 1);
  }
  // Normalize
  const mag = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map(v => Number((v / mag).toFixed(6)));
}

async function seedData() {
  console.log("Connecting to PostgreSQL to seed realistic demo data...");
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log("1. Seeding Users and Customer Profiles...");
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

    // Support Agents
    const agent1 = await client.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, phone, is_vip)
      VALUES ('usr_agent_clara', 'agent.clara@noissue.ai', $1, 'Clara Oswald', 'support_agent', '+1 (555) 234-5678', false)
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
      RETURNING id;
    `, [defaultPasswordHash]);

    const agent2 = await client.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, phone, is_vip)
      VALUES ('usr_agent_james', 'agent.james@noissue.ai', $1, 'James Holden', 'support_agent', '+1 (555) 876-5432', false)
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
      RETURNING id;
    `, [defaultPasswordHash]);

    // Admin
    await client.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, phone, is_vip)
      VALUES ('usr_admin_main', 'admin@noissue.ai', $1, 'System Administrator', 'admin', '+1 (555) 000-1111', false)
      ON CONFLICT (email) DO UPDATE SET password_hash = $1;
    `, [defaultPasswordHash]);

    // Customers
    const customers = [
      {
        id: 'usr_cust_alex',
        email: 'alex.rivers@example.com',
        name: 'Alex Rivers',
        phone: '+1 (555) 341-9012',
        tier: 'STANDARD',
        is_vip: false,
        risk: 5.0,
        totalOrders: 4,
        totalSpent: 384.50
      },
      {
        id: 'usr_cust_sarah',
        email: 'sarah.chen@example.com',
        name: 'Sarah Chen',
        phone: '+1 (555) 982-1144',
        tier: 'PLATINUM',
        is_vip: true,
        risk: 0.0,
        totalOrders: 18,
        totalSpent: 4250.00
      },
      {
        id: 'usr_cust_marcus',
        email: 'marcus.vance@example.com',
        name: 'Marcus Vance',
        phone: '+1 (555) 456-7890',
        tier: 'GOLD',
        is_vip: false,
        risk: 10.0,
        totalOrders: 9,
        totalSpent: 1120.00
      },
      {
        id: 'usr_cust_elena',
        email: 'elena.rostova@example.com',
        name: 'Elena Rostova',
        phone: '+1 (555) 678-1234',
        tier: 'STANDARD',
        is_vip: false,
        risk: 0.0,
        totalOrders: 2,
        totalSpent: 180.00
      },
      {
        id: 'usr_cust_david',
        email: 'david.kim@example.com',
        name: 'David Kim',
        phone: '+1 (555) 789-4321',
        tier: 'SILVER',
        is_vip: false,
        risk: 15.0,
        totalOrders: 6,
        totalSpent: 750.00
      }
    ];

    for (const c of customers) {
      await client.query(`
        INSERT INTO users (id, email, password_hash, full_name, role, phone, is_vip)
        VALUES ($1, $2, $3, $4, 'customer', $5, $6)
        ON CONFLICT (email) DO UPDATE SET password_hash = $3, full_name = $4, is_vip = $6;
      `, [c.id, c.email, defaultPasswordHash, c.name, c.phone, c.is_vip]);

      await client.query(`
        INSERT INTO customer_profiles (user_id, tier, risk_score, total_orders, total_spent, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET tier = $2, risk_score = $3, total_orders = $4, total_spent = $5;
      `, [c.id, c.tier, c.risk, c.totalOrders, c.totalSpent, `Customer since 2024. Tier: ${c.tier}`]);
    }

    console.log("2. Seeding Orders and Payments...");
    // Orders
    const orders = [
      {
        id: 'ord_alex_1',
        order_number: 'ORD-89421',
        user_id: 'usr_cust_alex',
        status: 'DELIVERED',
        total: 89.00,
        courier: 'FedEx Express',
        tracking: 'FDX-99201481',
        items: [{ id: 'itm_1', name: 'Wireless Noise-Cancelling Earbuds Pro', price: 89.00, quantity: 1, sku: 'AUDIO-ANC-01' }],
        address: { street: '742 Evergreen Terrace', city: 'Springfield', state: 'OR', zip: '97477' }
      },
      {
        id: 'ord_alex_2',
        order_number: 'ORD-94102',
        user_id: 'usr_cust_alex',
        status: 'SHIPPED',
        total: 145.00,
        courier: 'UPS Ground',
        tracking: '1Z9999999999999999',
        items: [{ id: 'itm_2', name: 'Ergonomic Mechanical Keyboard (Brown Switch)', price: 145.00, quantity: 1, sku: 'KB-ERGO-BR' }],
        address: { street: '742 Evergreen Terrace', city: 'Springfield', state: 'OR', zip: '97477' }
      },
      {
        id: 'ord_sarah_1',
        order_number: 'ORD-77219',
        user_id: 'usr_cust_sarah',
        status: 'DELIVERED',
        total: 650.00,
        courier: 'DHL Express',
        tracking: 'DHL-33991200',
        items: [{ id: 'itm_3', name: 'Ultra-Wide 38" Curved IPS Monitor 144Hz', price: 650.00, quantity: 1, sku: 'MON-38-IPS' }],
        address: { street: '100 Innovation Way, Suite 400', city: 'San Francisco', state: 'CA', zip: '94105' }
      },
      {
        id: 'ord_marcus_1',
        order_number: 'ORD-61280',
        user_id: 'usr_cust_marcus',
        status: 'DELIVERED',
        total: 49.99,
        courier: 'USPS Priority',
        tracking: '9400111899223344',
        items: [{ id: 'itm_4', name: 'Smart Home Zigbee Bridge Hub v2', price: 49.99, quantity: 1, sku: 'IOT-HUB-Z2' }],
        address: { street: '450 Pine Needle Dr', city: 'Austin', state: 'TX', zip: '78701' }
      },
      {
        id: 'ord_elena_1',
        order_number: 'ORD-55012',
        user_id: 'usr_cust_elena',
        status: 'DELIVERED',
        total: 120.00,
        courier: 'Digital Delivery',
        tracking: 'DIG-LICENSE-55012',
        items: [{ id: 'itm_5', name: 'CloudSync Pro 1-Year Subscription Renewal', price: 120.00, quantity: 1, sku: 'SUB-SYNC-ANNUAL' }],
        address: { street: '12 Harbor View Blvd', city: 'Seattle', state: 'WA', zip: '98101' }
      },
      {
        id: 'ord_david_1',
        order_number: 'ORD-33981',
        user_id: 'usr_cust_david',
        status: 'DELIVERED',
        total: 199.00,
        courier: 'FedEx Ground',
        tracking: 'FDX-77441199',
        items: [
          { id: 'itm_6', name: 'Studio USB-C Audio Interface 2-In/2-Out', price: 149.00, quantity: 1, sku: 'AUD-INTF-22' },
          { id: 'itm_7', name: 'Premium Braided Gold-Plated XLR Cable (10ft)', price: 25.00, quantity: 2, sku: 'CBL-XLR-10' }
        ],
        address: { street: '880 Elm Street', city: 'Chicago', state: 'IL', zip: '60601' }
      }
    ];

    for (const ord of orders) {
      await client.query(`
        INSERT INTO orders (id, order_number, user_id, status, total_amount, courier, tracking_number, items_json, shipping_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (order_number) DO UPDATE SET status = $4, total_amount = $5, courier = $6, tracking_number = $7, items_json = $8;
      `, [ord.id, ord.order_number, ord.user_id, ord.status, ord.total, ord.courier, ord.tracking, JSON.stringify(ord.items), JSON.stringify(ord.address)]);
    }

    // Payments
    const payments = [
      {
        id: 'pay_alex_1',
        transaction_id: 'TXN-881203',
        user_id: 'usr_cust_alex',
        order_id: 'ord_alex_1',
        amount: 89.00,
        status: 'REFUNDED',
        method: 'CREDIT_CARD',
        refunded: 89.00,
        gateway_resp: { arn: 'ARN-748291039812903', gateway: 'Stripe', charge_id: 'ch_3N8x4129' }
      },
      {
        id: 'pay_alex_2',
        transaction_id: 'TXN-994112',
        user_id: 'usr_cust_alex',
        order_id: 'ord_alex_2',
        amount: 145.00,
        status: 'SUCCESS',
        method: 'CREDIT_CARD',
        refunded: 0.00,
        gateway_resp: { gateway: 'Stripe', charge_id: 'ch_3N9y9911' }
      },
      {
        id: 'pay_sarah_1',
        transaction_id: 'TXN-773301',
        user_id: 'usr_cust_sarah',
        order_id: 'ord_sarah_1',
        amount: 650.00,
        status: 'SUCCESS',
        method: 'AMEX',
        refunded: 0.00,
        gateway_resp: { gateway: 'Stripe', charge_id: 'ch_3P1z7700' }
      },
      {
        id: 'pay_marcus_1',
        transaction_id: 'TXN-661001',
        user_id: 'usr_cust_marcus',
        order_id: 'ord_marcus_1',
        amount: 49.99,
        status: 'SUCCESS',
        method: 'VISA',
        refunded: 0.00,
        gateway_resp: { gateway: 'Stripe', charge_id: 'ch_3M2a6601' }
      },
      {
        id: 'pay_marcus_2_dup',
        transaction_id: 'TXN-661002-DUP',
        user_id: 'usr_cust_marcus',
        order_id: 'ord_marcus_1',
        amount: 49.99,
        status: 'SUCCESS',
        method: 'VISA',
        refunded: 0.00,
        gateway_resp: { gateway: 'Stripe', charge_id: 'ch_3M2a6602', duplicate_warning: true }
      },
      {
        id: 'pay_elena_1',
        transaction_id: 'TXN-552011',
        user_id: 'usr_cust_elena',
        order_id: 'ord_elena_1',
        amount: 120.00,
        status: 'SUCCESS',
        method: 'PAYPAL',
        refunded: 0.00,
        gateway_resp: { gateway: 'PayPal', capture_id: 'CAP-99112288' }
      },
      {
        id: 'pay_david_1',
        transaction_id: 'TXN-339801',
        user_id: 'usr_cust_david',
        order_id: 'ord_david_1',
        amount: 199.00,
        status: 'SUCCESS',
        method: 'APPLE_PAY',
        refunded: 0.00,
        gateway_resp: { gateway: 'Stripe', charge_id: 'ch_3K8z3398' }
      }
    ];

    for (const p of payments) {
      await client.query(`
        INSERT INTO payments (id, transaction_id, user_id, order_id, amount, status, payment_method, refunded_amount, gateway_response)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (transaction_id) DO UPDATE SET status = $6, refunded_amount = $8, gateway_response = $9;
      `, [p.id, p.transaction_id, p.user_id, p.order_id, p.amount, p.status, p.method, p.refunded, JSON.stringify(p.gateway_resp)]);
    }

    console.log("3. Seeding Knowledge Base Policies & RAG Chunks...");
    for (const pol of POLICIES) {
      const polRes = await client.query(`
        INSERT INTO policies (policy_code, title, category, summary, content, authority_limit, requires_human_review, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (policy_code) DO UPDATE SET title = $2, category = $3, summary = $4, content = $5, authority_limit = $6, requires_human_review = $7
        RETURNING id;
      `, [pol.code, pol.title, pol.category, pol.summary, pol.content, pol.authorityLimit, pol.requiresHumanReview]);

      const policyId = polRes.rows[0].id;

      // Create chunks for policy
      const chunkText = `${pol.title}. Category: ${pol.category}. ${pol.summary} Details: ${pol.content}`;
      const embedding = generateSimpleEmbedding(chunkText);

      await client.query(`
        DELETE FROM policy_chunks WHERE policy_id = $1;
      `, [policyId]);

      await client.query(`
        INSERT INTO policy_chunks (policy_id, chunk_index, chunk_text, embedding_vector, metadata_json)
        VALUES ($1, 0, $2, $3, $4);
      `, [policyId, chunkText, JSON.stringify(embedding), JSON.stringify({ code: pol.code, category: pol.category, authorityLimit: pol.authorityLimit })]);
    }

    console.log("4. Seeding Sample Realistic Tickets & Complete Case Histories...");
    // Ticket 1: Auto-resolved Duplicate Payment Case
    const t1 = await client.query(`
      INSERT INTO tickets (
        id, ticket_number, user_id, subject, description, category, detected_category, priority, status,
        order_id, payment_id, resolution_summary, root_cause, created_at, updated_at
      ) VALUES (
        'tkt_seed_001', 'TKT-2025-001', 'usr_cust_marcus',
        'I was charged twice for my Smart Home Hub order ORD-61280',
        'Hello, I noticed two separate charges of $49.99 on my Visa card statement for order ORD-61280. Please refund the extra charge.',
        'Payment', 'Payment / Duplicate Charge', 'MEDIUM', 'AI_RESOLVED',
        'ord_marcus_1', 'pay_marcus_2_dup',
        'Duplicate transaction TXN-661002-DUP of $49.99 verified and auto-refunded to original Visa payment method per Policy POL-002.',
        'Payment gateway double-submission during network timeout.',
        NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
      ) ON CONFLICT (ticket_number) DO NOTHING RETURNING id;
    `);

    // Ticket 2: Escalated High-Value Damaged Package Case (Sarah Chen - $650 monitor)
    const t2 = await client.query(`
      INSERT INTO tickets (
        id, ticket_number, user_id, assigned_agent_id, subject, description, category, detected_category, priority, status,
        order_id, payment_id, resolution_summary, root_cause, created_at, updated_at
      ) VALUES (
        'tkt_seed_002', 'TKT-2025-002', 'usr_cust_sarah', 'usr_agent_clara',
        'My 38" Ultra-Wide monitor arrived with a cracked screen (ORD-77219)',
        'I received the DHL package today for ORD-77219 and when I opened the box, the entire panel is shattered across the top corner. I need an urgent replacement or refund.',
        'Delivery', 'Delivery / Damaged Product', 'HIGH', 'HUMAN_REVIEW',
        'ord_sarah_1', 'pay_sarah_1',
        NULL,
        'Carrier transit impact causing LCD substrate fracture.',
        NOW() - INTERVAL '4 hours', NOW() - INTERVAL '1 hour'
      ) ON CONFLICT (ticket_number) DO NOTHING RETURNING id;
    `);

    // Ticket 3: Alex Rivers - Delayed Refund Inquiry (Already resolved explanation with ARN)
    const t3 = await client.query(`
      INSERT INTO tickets (
        id, ticket_number, user_id, subject, description, category, detected_category, priority, status,
        order_id, payment_id, resolution_summary, root_cause, created_at, updated_at
      ) VALUES (
        'tkt_seed_003', 'TKT-2025-003', 'usr_cust_alex',
        'Where is my refund for the Wireless Earbuds ORD-89421?',
        'I returned the earbuds 3 days ago and was told a refund was issued, but I do not see the money in my bank account yet. Can you check?',
        'Refund', 'Refund / Delay Inquiry', 'LOW', 'AI_RESOLVED',
        'ord_alex_1', 'pay_alex_1',
        'Refund of $89.00 was executed on payment gateway (ARN-748291039812903). Standard banking settlement requires 3-5 business days. Full evidence and ARN provided.',
        'Standard inter-bank settlement cycle latency (Stripe / Acquirer).',
        NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
      ) ON CONFLICT (ticket_number) DO NOTHING RETURNING id;
    `);

    // Add Investigation records for seed tickets
    await client.query(`
      INSERT INTO investigations (
        ticket_id, intent_detected, intent_confidence, intent_category, urgency, customer_history_summary,
        order_summary, payment_summary, policy_matched_title, policy_excerpt, root_cause,
        verification_status, verification_reason, decision_outcome, recommended_action,
        resolution_explanation, action_taken_summary, evidence_json, steps_json
      ) VALUES (
        'tkt_seed_001', 'Refund duplicate billing transaction', 0.98, 'Payment', 'MEDIUM',
        'Customer Marcus Vance has 9 orders, Gold tier, 0 previous disputes.',
        'Order ORD-61280 for Smart Home Hub ($49.99) delivered successfully.',
        'Found 2 identical charges of $49.99 (TXN-661001 & TXN-661002-DUP) on Visa ending 4242 within 12 seconds.',
        'Duplicate Charge and Billing Error Resolution (POL-002)',
        'AI can immediately initiate an automatic refund of the duplicate transaction up to $200.00.',
        'Gateway duplicate capture on network retry.',
        'SUPPORTED', 'Duplicate payment confirmed on payment gateway with same amount and customer ID.',
        'AUTO_RESOLVE', 'ISSUE_REFUND',
        'Verified two charges of $49.99 were processed for a single unit order. Automatically reversed transaction TXN-661002-DUP.',
        'Refund of $49.99 processed back to Visa card. Receipt #REF-661002 issued.',
        '[{"label": "Order Verified", "value": "ORD-61280 (Delivered)"}, {"label": "Duplicate Charge Found", "value": "TXN-661002-DUP ($49.99)"}, {"label": "Policy Matched", "value": "POL-002 Duplicate Charge Resolution"}, {"label": "Authority Limit", "value": "$200.00 (Action Amount: $49.99)"}]'::jsonb,
        '[{"step": "Intent Detection", "status": "completed", "summary": "Customer requesting refund for double billing on order ORD-61280"}, {"step": "Customer History", "status": "completed", "summary": "Verified active Gold tier account in good standing"}, {"step": "Payment & Order Audit", "status": "completed", "summary": "Identified 2 identical authorizations on gateway"}, {"step": "Policy Retrieval (RAG)", "status": "completed", "summary": "Retrieved POL-002: Full immediate refund authorized"}, {"step": "Evidence Verification", "status": "completed", "summary": "Evidence verified: SUPPORTED with 100% confidence"}, {"step": "Resolution Gate", "status": "completed", "summary": "Criteria met for safe autonomous resolution"}]'::jsonb
      ) ON CONFLICT (ticket_id) DO NOTHING;
    `);

    // Investigation for Ticket 2 (Sarah Chen - Escalated)
    await client.query(`
      INSERT INTO investigations (
        ticket_id, intent_detected, intent_confidence, intent_category, urgency, customer_history_summary,
        order_summary, payment_summary, policy_matched_title, policy_excerpt, root_cause,
        verification_status, verification_reason, decision_outcome, recommended_action,
        resolution_explanation, action_taken_summary, evidence_json, steps_json
      ) VALUES (
        'tkt_seed_002', 'Replacement or refund for high-value damaged item', 0.99, 'Delivery', 'HIGH',
        'VIP Platinum Customer Sarah Chen ($4,250 lifetime spend, 0 risk score).',
        'Order ORD-77219 for Ultra-Wide 38 Monitor ($650.00) delivered today via DHL Express.',
        'Payment TXN-773301 of $650.00 captured successfully via AMEX.',
        'High-Value Claims and Fraud Prevention Protocol (POL-008)',
        'Any refund, claim, or compensation request exceeding $250.00 CANNOT be auto-resolved by AI. Route to Senior Specialist.',
        'Transit damage during DHL handling.',
        'PARTIALLY_SUPPORTED', 'Customer damage claim verified with delivery timestamp, but claim value ($650) exceeds AI automated authority threshold ($250).',
        'HUMAN_REVIEW', 'ESCALATE_TO_SENIOR_SPECIALIST',
        'Case requires human sign-off due to policy authority ceiling ($650 > $250 threshold). Priority escalation packet prepared for Clara Oswald.',
        'Escalated to Clara Oswald (Senior Specialist) with full Carrier Claim and Order Packet.',
        '[{"label": "VIP Status", "value": "Sarah Chen (Platinum - Lifetime $4,250)"}, {"label": "Order Value", "value": "$650.00 (Exceeds $250 AI Limit)"}, {"label": "Carrier", "value": "DHL Express (Delivered today)"}, {"label": "Policy Matched", "value": "POL-008 & POL-010 (High Value VIP Protocol)"}]'::jsonb,
        '[{"step": "Intent Detection", "status": "completed", "summary": "Customer reported damaged monitor upon receipt"}, {"step": "Customer History", "status": "completed", "summary": "Identified VIP Platinum Member with high priority"}, {"step": "Order Verification", "status": "completed", "summary": "Order ORD-77219 confirmed delivered today"}, {"step": "Policy Retrieval (RAG)", "status": "completed", "summary": "Matched POL-008 High-Value Ceiling and POL-010 VIP Protocol"}, {"step": "Verification & Gate", "status": "completed", "summary": "Claim amount ($650.00) exceeds autonomous ceiling ($250.00)"}, {"step": "Escalation Routing", "status": "completed", "summary": "Generated Investigation Packet and assigned to Clara Oswald"}]'::jsonb
      ) ON CONFLICT (ticket_id) DO NOTHING;
    `);

    // Messages for Ticket 1
    await client.query(`
      INSERT INTO messages (ticket_id, sender_id, sender_role, sender_name, message_text, created_at)
      VALUES 
      ('tkt_seed_001', 'usr_cust_marcus', 'CUSTOMER', 'Marcus Vance', 'Hello, I noticed two separate charges of $49.99 on my Visa card statement for order ORD-61280. Please refund the extra charge.', NOW() - INTERVAL '2 days'),
      ('tkt_seed_001', NULL, 'AI', 'NoIssue AI Agent', 'Hello Marcus, thank you for reaching out. I have investigated your transaction records for order ORD-61280. I verified that a duplicate charge of $49.99 (Transaction TXN-661002-DUP) was processed in error due to a gateway retry. Pursuant to our Billing Policy POL-002, I have automatically initiated a full refund of $49.99 back to your Visa card. You should see this credit appear in 1-3 business days. You can view the full investigation evidence above.', NOW() - INTERVAL '2 days' + INTERVAL '45 seconds');
    `);

    // Messages for Ticket 2
    await client.query(`
      INSERT INTO messages (ticket_id, sender_id, sender_role, sender_name, message_text, created_at)
      VALUES 
      ('tkt_seed_002', 'usr_cust_sarah', 'CUSTOMER', 'Sarah Chen', 'I received the DHL package today for ORD-77219 and when I opened the box, the entire panel is shattered across the top corner. I need an urgent replacement or refund.', NOW() - INTERVAL '4 hours'),
      ('tkt_seed_002', NULL, 'AI', 'NoIssue AI Agent', 'Hello Sarah, I am very sorry to hear that your monitor arrived damaged. I have investigated your order details and confirmed your delivery today. Because this is a high-value item ($650.00) and you are a valued Platinum VIP customer, I have gathered the complete order, payment, and carrier information and routed your case directly to Clara Oswald from our Senior Resolution Team with highest priority.', NOW() - INTERVAL '4 hours' + INTERVAL '30 seconds'),
      ('tkt_seed_002', 'usr_agent_clara', 'SUPPORT_AGENT', 'Clara Oswald', 'Hi Sarah, I am taking personal ownership of this case. I have verified your order details and DHL tracking. I have already authorized an immediate express replacement unit with priority courier dispatch at zero cost, and scheduled a courier pickup for the damaged unit at your convenience.', NOW() - INTERVAL '1 hour');
    `);

    // Escalation Packet for Ticket 2
    await client.query(`
      INSERT INTO escalations (ticket_id, triggered_by, reason, priority_override, assigned_agent_id, packet_json)
      VALUES (
        'tkt_seed_002', 'AI_DECISION_GATE', 'Order value ($650.00) exceeds autonomous AI limit ($250.00). VIP Platinum customer.', 'HIGH', 'usr_agent_clara',
        '{
          "customer": { "name": "Sarah Chen", "email": "sarah.chen@example.com", "tier": "PLATINUM", "riskScore": 0.0 },
          "order": { "orderNumber": "ORD-77219", "total": 650.00, "item": "Ultra-Wide 38 Curved IPS Monitor", "courier": "DHL Express" },
          "policy": { "code": "POL-008", "title": "High-Value Claims Protocol", "rule": "Requires human sign-off above $250" },
          "aiRecommendation": "Approve zero-cost express replacement with priority courier tracer",
          "rootCause": "In-transit impact damage by carrier",
          "verification": "SUPPORTED (High confidence with delivery timestamp)"
        }'::jsonb
      ) ON CONFLICT DO NOTHING;
    `);

    // Audit logs & Ticket events
    await client.query(`
      INSERT INTO ticket_events (ticket_id, actor_role, event_type, old_state, new_state, details_json)
      VALUES 
      ('tkt_seed_001', 'CUSTOMER', 'CREATED', NULL, 'OPEN', '{"source": "web_dashboard"}'::jsonb),
      ('tkt_seed_001', 'AI', 'INVESTIGATION_COMPLETED', 'OPEN', 'AI_RESOLVED', '{"action": "AUTO_REFUND", "amount": 49.99}'::jsonb),
      ('tkt_seed_002', 'CUSTOMER', 'CREATED', NULL, 'OPEN', '{"source": "web_dashboard"}'::jsonb),
      ('tkt_seed_002', 'AI', 'INVESTIGATION_COMPLETED', 'OPEN', 'HUMAN_REVIEW', '{"escalation": "POL-008_HIGH_VALUE"}'::jsonb),
      ('tkt_seed_002', 'SUPPORT_AGENT', 'AGENT_REPLIED', 'HUMAN_REVIEW', 'IN_PROGRESS', '{"agent": "Clara Oswald"}'::jsonb);
    `);

    await client.query('COMMIT');
    console.log("Realistic seed data created successfully!");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error during seed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedData().catch(err => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
