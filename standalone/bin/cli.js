#!/usr/bin/env node

/**
 * CLI entry point for @opensearch-dashboards/alarms
 * 
 * Usage:
 *   npx @opensearch-dashboards/alarms
 *   npx @opensearch-dashboards/alarms --port 8080
 *   npx @opensearch-dashboards/alarms --help
 */

const path = require('path');

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  port: 5603,
  help: false,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--port' || arg === '-p') {
    options.port = parseInt(args[++i], 10);
  } else if (arg === '--help' || arg === '-h') {
    options.help = true;
  }
}

if (options.help) {
  console.log(`
@opensearch-dashboards/alarms - Standalone Alarms Service

Usage:
  npx @opensearch-dashboards/alarms [options]

Options:
  -p, --port <port>   Port to run the server on (default: 5603)
  -h, --help          Show this help message

Examples:
  npx @opensearch-dashboards/alarms
  npx @opensearch-dashboards/alarms --port 8080

API Endpoints:
  GET    /api/alarms          List all alarms
  GET    /api/alarms/:id      Get alarm by ID
  POST   /api/alarms          Create alarm
  DELETE /api/alarms/:id      Delete alarm
  POST   /api/alarms/:id/toggle  Toggle alarm enabled state
`);
  process.exit(0);
}

// Set port via environment variable
process.env.PORT = options.port.toString();

// Start the server
console.log(`
╔═══════════════════════════════════════════════════════════╗
║         OpenSearch Dashboards - Alarms Service            ║
╚═══════════════════════════════════════════════════════════╝
`);

require(path.join(__dirname, '..', 'dist', 'standalone', 'server.js'));
