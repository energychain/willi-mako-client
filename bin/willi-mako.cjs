#!/usr/bin/env node
import('../dist/cli.js').catch((error) => {
  console.error(error);
  process.exit(1);
});
