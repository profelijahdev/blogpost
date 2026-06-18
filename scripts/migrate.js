// Migration script - run with: node scripts/migrate.js
// This adds new tables/columns to the existing SQLite database

const { execSync } = require('child_process');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'custom.db');

// Install prisma client if needed, then generate
console.log('Step 1: Generating Prisma client...');

try {
  // Use bun to run prisma generate
  execSync('bunx prisma generate', {
    cwd: path.join(__dirname, '..'),
    timeout: 120000,
    stdio: 'inherit'
  });
  console.log('Prisma client generated successfully!');
} catch (e) {
  console.error('Failed to generate prisma client, trying npm...');
  try {
    execSync('npx prisma generate', {
      cwd: path.join(__dirname, '..'),
      timeout: 120000,
      stdio: 'inherit'
    });
    console.log('Prisma client generated with npx!');
  } catch (e2) {
    console.error('Both bunx and npx failed. Trying direct node...');
    try {
      execSync('node ./node_modules/prisma/build/index.js generate', {
        cwd: path.join(__dirname, '..'),
        timeout: 120000,
        stdio: 'inherit'
      });
    } catch (e3) {
      console.error('All methods failed. Manual intervention needed.');
    }
  }
}

// Now push schema
console.log('\nStep 2: Pushing schema to database...');
try {
  execSync('bunx prisma db push', {
    cwd: path.join(__dirname, '..'),
    timeout: 120000,
    stdio: 'inherit'
  });
  console.log('Schema pushed successfully!');
} catch (e) {
  console.error('Failed to push schema with bunx, trying npx...');
  try {
    execSync('npx prisma db push', {
      cwd: path.join(__dirname, '..'),
      timeout: 120000,
      stdio: 'inherit'
    });
    console.log('Schema pushed with npx!');
  } catch (e2) {
    console.error('Schema push failed. You may need to run: bunx prisma db push');
  }
}
