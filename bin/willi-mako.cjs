#!/usr/bin/env node

const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const cliModuleUrl = pathToFileURL(path.join(__dirname, '..', 'dist', 'cli.js'));

  try {
    await import(cliModuleUrl.href);
  } catch (error) {
    console.error('Failed to start willi-mako CLI:', error);
    process.exitCode = 1;
  }
})();
