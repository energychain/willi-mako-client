#!/usr/bin/env ts-node
/*
 * Example: PRICAT Price Synchronisation
 * -------------------------------------
 * Demonstrates how Lieferanten can synchronise price lists with partners by
 * persisting PRICAT payloads and sharing audit-ready metadata.
 */

import { WilliMakoClient } from '@stromhaltig/willi-mako-client';

const SESSION_ID = `pricat-sync-${Date.now()}`;

const priceCatalog = {
  validityStart: '2024-05-01',
  currency: 'EUR',
  entries: [
    { productId: 'STROM-HH-TARIF', price: 0.325, unit: 'EUR/kWh' },
    { productId: 'STROM-GS-TARIF', price: 0.312, unit: 'EUR/kWh' }
  ]
};

async function main(): Promise<void> {
  const client = new WilliMakoClient();

  await client.createArtifact({
    sessionId: SESSION_ID,
    type: 'price-catalogue',
    name: 'PRICAT_2024-05.json',
    mimeType: 'application/json',
    encoding: 'utf8',
    content: JSON.stringify(priceCatalog, null, 2),
    tags: ['pricat', 'pricing', 'lieferant']
  });

  console.log('PRICAT price catalogue stored. Session:', SESSION_ID);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
