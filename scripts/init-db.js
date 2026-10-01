const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not defined in environment.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initializeDatabase() {
  console.log("Connecting to PostgreSQL database...");
  const client = await pool.connect();

  try {
    console.log("Creating database schema and tables for NoIssue AI...");

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- 1. USERS TABLE
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'customer', -- 'customer', 'support_agent', 'admin'
        phone VARCHAR(64),
        avatar_url VARCHAR(512),
        is_vip BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 2. CUSTOMER PROFILES TABLE
      CREATE TABLE IF NOT EXISTS customer_profiles (
        id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier VARCHAR(32) DEFAULT 'STANDARD', -- 'STANDARD', 'SILVER', 'GOLD', 'PLATINUM'
        risk_score NUMERIC(5,2) DEFAULT 0.00, -- 0-100 (0 = safe, 100 = high risk/fraud flag)
        total_orders INTEGER DEFAULT 0,
        total_spent NUMERIC(12,2) DEFAULT 0.00,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. ORDERS TABLE
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        order_number VARCHAR(64) UNIQUE NOT NULL,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(64) NOT NULL DEFAULT 'PROCESSING', -- 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED', 'FAILED'
        total_amount NUMERIC(10,2) NOT NULL,
        currency VARCHAR(8) DEFAULT 'USD',
        courier VARCHAR(128),
        tracking_number VARCHAR(128),
        estimated_delivery TIMESTAMP WITH TIME ZONE,
        actual_delivery TIMESTAMP WITH TIME ZONE,
        items_json JSONB DEFAULT '[]'::jsonb,
        shipping_address JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 4. PAYMENTS / TRANSACTIONS TABLE
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        transaction_id VARCHAR(128) UNIQUE NOT NULL,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
        amount NUMERIC(10,2) NOT NULL,
        currency VARCHAR(8) DEFAULT 'USD',
        status VARCHAR(64) NOT NULL DEFAULT 'SUCCESS', -- 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED'
        payment_method VARCHAR(64) DEFAULT 'CREDIT_CARD', -- 'CREDIT_CARD', 'PAYPAL', 'APPLE_PAY', 'BANK_TRANSFER'
        refunded_amount NUMERIC(10,2) DEFAULT 0.00,
        gateway_response JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 5. POLICIES (Knowledge Base for RAG)
      CREATE TABLE IF NOT EXISTS policies (
        id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        policy_code VARCHAR(64) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(64) NOT NULL,
        summary TEXT NOT NULL,
        content TEXT NOT NULL,
        authority_limit NUMERIC(10,2) DEFAULT 100.00, -- Maximum dollar amount AI can auto-execute without human
        requires_human_review BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        version VARCHAR(16) DEFAULT '1.0',
        effective_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 6. POLICY CHUNKS (For Semantic Vector Retrieval)
      CREATE TABLE IF NOT EXISTS policy_chunks (
        id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        policy_id VARCHAR(64) NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding_vector JSONB, -- Stored as float array JSON for universal portability
        metadata_json JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 7. TICKETS
      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        ticket_number VARCHAR(64) UNIQUE NOT NULL,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_agent_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(64) DEFAULT 'General',
        detected_category VARCHAR(64),
        priority VARCHAR(32) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
        status VARCHAR(64) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'INVESTIGATING', 'AI_RESOLVED', 'WAITING_FOR_CUSTOMER', 'HUMAN_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'
        order_id VARCHAR(64) REFERENCES orders(id) ON DELETE SET NULL,
        payment_id VARCHAR(64) REFERENCES payments(id) ON DELETE SET NULL,
        resolution_summary TEXT,
        root_cause TEXT,
        action_executed JSONB DEFAULT '{}'::jsonb,
        closed_at TIMESTAMP WITH TIME ZONE,
        retention_until TIMESTAMP WITH TIME ZONE, -- For 5-day automatic cleanup
        reopened_at TIMESTAMP WITH TIME ZONE,
        reopen_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 8. MESSAGES
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        ticket_id VARCHAR(64) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        sender_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        sender_role VARCHAR(32) NOT NULL, -- 'CUSTOMER', 'AI', 'SUPPORT_AGENT', 'SYSTEM'
        sender_name VARCHAR(255) NOT NULL,
        message_text TEXT NOT NULL,
        attachments_json JSONB DEFAULT '[]'::jsonb,
        is_internal BOOLEAN DEFAULT false, -- Internal notes only visible to Support Agents
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 9. INVESTIGATIONS (Agentic Workflow Intermediate & Final Structured State)
      CREATE TABLE IF NOT EXISTS investigations (
        id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        ticket_id VARCHAR(64) UNIQUE NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        intent_detected VARCHAR(128),
        intent_confidence NUMERIC(5,2),
        intent_category VARCHAR(64),
        urgency VARCHAR(32),
        customer_history_summary TEXT,
        order_summary TEXT,
        payment_summary TEXT,
        policy_matched_id VARCHAR(64) REFERENCES policies(id) ON DELETE SET NULL,
        policy_matched_title VARCHAR(255),
        policy_excerpt TEXT,
        root_cause TEXT,
        verification_status VARCHAR(64) DEFAULT 'INSUFFICIENT_EVIDENCE', -- 'SUPPORTED', 'PARTIALLY_SUPPORTED', 'CONFLICTING', 'INSUFFICIENT_EVIDENCE'
        verification_reason TEXT,
        decision_outcome VARCHAR(64) DEFAULT 'HUMAN_REVIEW', -- 'AUTO_RESOLVE', 'HUMAN_REVIEW', 'ESCALATE'
        recommended_action VARCHAR(128),
        resolution_explanation TEXT,
        action_taken_summary TEXT,
        evidence_json JSONB DEFAULT '[]'::jsonb,
        steps_json JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 10. ESCALATIONS (Packets for Support Agents)
      CREATE TABLE IF NOT EXISTS escalations (
        id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        ticket_id VARCHAR(64) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        triggered_by VARCHAR(64) NOT NULL, -- 'CUSTOMER_REQUEST', 'AI_DECISION_GATE', 'POLICY_THRESHOLD', 'HIGH_RISK'
        reason TEXT NOT NULL,
        priority_override VARCHAR(32),
        assigned_agent_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        packet_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_resolved BOOLEAN DEFAULT false,
        resolved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 11. TICKET EVENTS & AUDIT LOGS
      CREATE TABLE IF NOT EXISTS ticket_events (
        id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        ticket_id VARCHAR(64) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        actor_id VARCHAR(64),
        actor_role VARCHAR(32) NOT NULL, -- 'CUSTOMER', 'AI', 'SUPPORT_AGENT', 'SYSTEM'
        event_type VARCHAR(64) NOT NULL, -- 'CREATED', 'INVESTIGATION_STARTED', 'INVESTIGATION_COMPLETED', 'POLICY_RETRIEVED', 'AUTO_RESOLVED', 'HUMAN_REQUESTED', 'AGENT_ASSIGNED', 'AGENT_REPLIED', 'RESOLVED', 'REOPENED', 'CLOSED', 'ARCHIVED'
        old_state VARCHAR(64),
        new_state VARCHAR(64),
        details_json JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- 12. AUDIT LOGS (General Platform Security & Data Access)
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id VARCHAR(64),
        action VARCHAR(128) NOT NULL,
        resource_type VARCHAR(64) NOT NULL,
        resource_id VARCHAR(64),
        details_json JSONB DEFAULT '{}'::jsonb,
        ip_address VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- INDEXES FOR HIGH-PERFORMANCE QUERIES
      CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_tickets_retention ON tickets(retention_until) WHERE retention_until IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON messages(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
      CREATE INDEX IF NOT EXISTS idx_policy_chunks_policy_id ON policy_chunks(policy_id);
      CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket_id ON ticket_events(ticket_id);
    `);

    console.log("Database schema initialized successfully!");
  } catch (error) {
    console.error("Error initializing database schema:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase().catch(err => {
  console.error("Failed to run init:", err);
  process.exit(1);
});
