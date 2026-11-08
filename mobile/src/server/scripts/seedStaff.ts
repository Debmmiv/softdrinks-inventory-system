import readline from 'readline';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { connectToDatabase } from '../config/db';
import { User } from '../models/User';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function prompt(question: string): Promise<string> {
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
  console.log('    Soft Drinks Inventory System - Staff Enrollment CLI  ');
  console.log('========================================================\n');

  try {
    console.log('Connecting to MongoDB Atlas...');
    await connectToDatabase();
    console.log('✓ Connected successfully.\n');

    const username = await prompt('Enter Staff Username (min 3 chars): ');
    if (!username || username.length < 3) {
      console.error('Error: Username must be at least 3 characters.');
      process.exit(1);
    }

    const fullName = await prompt('Enter Staff Full Name: ');
    if (!fullName) {
      console.error('Error: Full name is required.');
      process.exit(1);
    }

    const password = await prompt('Enter Temporary Password (min 6 chars): ');
    if (!password || password.length < 6) {
      console.error('Error: Password must be at least 6 characters.');
      process.exit(1);
    }

    // Check if user already exists
    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      console.error(`\nError: User "${username}" already exists.`);
      process.exit(1);
    }

    console.log('\nHashing credentials with bcrypt (10 salt rounds)...');
    const password_hash = await bcrypt.hash(password, 10);

    const staffUser = new User({
      username: username.toLowerCase().trim(),
      full_name: fullName.trim(),
      password_hash,
      role: 'staff',
      is_active: true,
      created_at: new Date(),
    });

    await staffUser.save();

    console.log('\n========================================================');
    console.log('✓ Staff account successfully enrolled!');
    console.log(`  Staff ID:   ${staffUser._id}`);
    console.log(`  Username:   ${staffUser.username}`);
    console.log(`  Full Name:  ${staffUser.full_name}`);
    console.log(`  Role:       staff`);
    console.log('========================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\nEnrollment failed:', error);
    process.exit(1);
  }
}

run();
