import readline from 'readline';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../config/db';
import { User } from '../models/User';

/**
 * FR1: Administrative Bootstrap CLI Script
 * Injects initial Owner/Manager credentials directly into MongoDB Atlas
 * using salted bcrypt hashing without writing credentials to environment variables.
 *
 * Usage:
 *   npm run seed:admin
 */
function prompt(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function run() {
  console.log('========================================================');
  console.log('  Soft Drinks Inventory System - Admin Provisioning CLI ');
  console.log('========================================================\n');

  try {
    console.log('Connecting to MongoDB Atlas...');
    await connectToDatabase();
    console.log('✓ Connected successfully.\n');

    const username = await prompt('Enter Owner/Manager username: ');
    if (!username || username.length < 3) {
      console.error('Error: Username must be at least 3 characters.');
      process.exit(1);
    }

    const fullName = await prompt('Enter Full Name: ');
    if (!fullName) {
      console.error('Error: Full name is required.');
      process.exit(1);
    }

    const password = await prompt('Enter Secure Password (min 6 chars): ');
    if (!password || password.length < 6) {
      console.error('Error: Password must be at least 6 characters.');
      process.exit(1);
    }

    // Check if user already exists
    const existing = await User.findOne({ username: username.toLowerCase() });
    if (existing) {
      console.error(`\nError: User "${username}" already exists.`);
      process.exit(1);
    }

    console.log('\nHashing credentials with bcrypt (10 salt rounds)...');
    const password_hash = await bcrypt.hash(password, 10);

    const adminUser = new User({
      username: username.toLowerCase(),
      full_name: fullName,
      password_hash,
      role: 'owner/manager',
      is_active: true,
      created_at: new Date(),
    });

    await adminUser.save();

    console.log('\n========================================================');
    console.log('✓ Owner/Manager account successfully created!');
    console.log(`  User ID:   ${adminUser._id}`);
    console.log(`  Username:  ${adminUser.username}`);
    console.log(`  Role:      ${adminUser.role}`);
    console.log('========================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\nProvisioning failed:', error);
    process.exit(1);
  }
}

run();
