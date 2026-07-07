/**
 * Deploy Firestore security rules via firebase-admin SDK (no Firebase CLI needed).
 * Avoids the serviceusage.googleapis.com permission that the CLI requires.
 *
 * Usage:
 *   FIREBASE_SA=path/to/sa.json node scripts/deploy-rules.js path/to/firestore.rules
 */

const admin = require('firebase-admin');
const fs    = require('fs');

const FIREBASE_SA  = process.env.FIREBASE_SA;
const RULES_PATH   = process.argv[2];

if (!FIREBASE_SA) { console.error('Set FIREBASE_SA env var'); process.exit(1); }
if (!RULES_PATH)  { console.error('Provide path to firestore.rules as first argument'); process.exit(1); }

async function main() {
  const sa = JSON.parse(fs.readFileSync(FIREBASE_SA, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(sa) });

  const rulesContent = fs.readFileSync(RULES_PATH, 'utf8');
  console.log(`Deploying rules from: ${RULES_PATH}`);

  const sec = admin.securityRules();

  // Create a new ruleset
  const ruleset = await sec.createRuleset(
    sec.createRulesFileFromSource('firestore.rules', rulesContent)
  );
  console.log('Created ruleset:', ruleset.name);

  // Make it the active Firestore ruleset
  await sec.releaseFirestoreRuleset(ruleset);
  console.log('Firestore rules deployed successfully.');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
