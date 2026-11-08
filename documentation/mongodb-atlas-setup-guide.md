# Step-by-Step MongoDB Atlas Setup Guide for Beginners

This guide walks you through setting up a **100% Free** cloud database on **MongoDB Atlas** and connecting it to the **Soft Drinks Inventory System**. No prior database administration experience or credit card is required.

---

## 1. What is MongoDB Atlas?

Think of MongoDB Atlas as a secure online digital filing cabinet:
- **Local SQLite (on the phone)**: Like an offline clipboard held by warehouse staff on the floor.
- **MongoDB Atlas (in the cloud)**: The central master filing cabinet accessible over the internet where all devices eventually store and reconcile their records.

To allow our app to talk to MongoDB Atlas, we need a secret web address called a **Connection String** (`MONGODB_URI`).

---

## 2. Step-by-Step Setup (Takes ~5 Minutes)

### Step 1: Create a Free Account
1. Open your browser and go to: [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Sign up using **Google** or your email address.
3. Complete the brief questionnaire (e.g., Role: *Developer*, Goal: *Learning / Building an app*).

---

### Step 2: Create a Free Shared Cluster (M0)
1. On the welcome screen, you will see a choice of tiers. Choose **M0 (Free)**.
   - *Cost:* **FREE ($0 forever)** — no credit card needed.
   - *Storage:* 512 MB (plenty for hundreds of thousands of transactions).
2. **Provider & Region**:
   - Choose **AWS** or **Google Cloud**.
   - Select a region close to the Philippines (e.g., **Singapore `ap-southeast-1`**).
3. **Name**: Keep the default cluster name (e.g. `Cluster0`) or name it `softdrinks-cluster`.
4. Click the green **Create Deployment** (or **Create Cluster**) button at the bottom.

---

### Step 3: Create a Database User (Username & Password)
Atlas will show a **"Quickstart"** / **"Security"** dialog:

1. Under **Authentication Method**, select **Username and Password**.
2. **Username**: Enter something simple, like `admin` or `softdrinks_user`.
3. **Password**: 
   - Click **Autogenerate Secure Password** or type a strong password (e.g., `GusaDepot2026!`).
   - ⚠️ **IMPORTANT**: Copy this password and save it in a safe note right now. You will need it in your `.env` file.
4. Click **Create Database User**.

---

### Step 4: Configure Network Access (Allow Connections)
Still on the same screen (or under **Security > Network Access** on the left menu):

1. Under **Where would you like to connect from?**, select **My Local Environment**.
2. Under **IP Address**, choose **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *Why "from anywhere"?* Because during development, your computer and your Android phone on Wi-Fi have changing dynamic IP addresses. Setting `0.0.0.0/0` prevents your connection from being blocked by firewall rules.
3. Click **Add Entry** (or **Finish and Close**).

---

### Step 5: Get Your Connection String (URI)
1. On the **Clusters / Database** dashboard page, find your cluster and click the **Connect** button.
2. In the modal that appears, select **Drivers** (under "Connect to your application").
3. Make sure the driver is set to **Node.js** and the version to **5.5 or later** (or latest).
4. Look at the box titled **"3. Add your connection string into your application code"**. You will see a string that looks like this:
   ```text
   mongodb+srv://softdrinks_user:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
5. Click the **Copy** icon.

---

### Step 6: Customize Your Connection String
Before putting it in the app, you need to make two small edits to the copied string:

1. **Replace `<db_password>`**:
   Replace `<db_password>` with your actual password from Step 3 (make sure to delete the `<` and `>` brackets!).
   *Example: if your password is `Secret123`, change `<db_password>` to `Secret123`.*
   *(Note: If your password has special characters like `@`, `:`, `/`, or `%`, ensure they don't break the URL, or use a plain alphanumeric password like `SoftdrinksPass2026`).*

2. **Add the Database Name**:
   Right after `.mongodb.net/` and before `?retryWrites=true`, add `softdrinks_db`:
   ```text
   mongodb+srv://softdrinks_user:Secret123@cluster0.xxxxx.mongodb.net/softdrinks_db?retryWrites=true&w=majority
   ```

---

## 3. Configuring the Project (`mobile/.env`)

Now that you have your connection string:

1. In the project folder, open [`mobile/`](file:///D:/softdrinks-app/softdrinks-inventory-system/mobile/).
2. Create a file named `.env` (you can copy `.env.example`).
3. Paste your details into `mobile/.env`:

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://softdrinks_user:YourActualPassword@cluster0.xxxxx.mongodb.net/softdrinks_db?retryWrites=true&w=majority

# Secret for signing login tokens (can be any random long string)
JWT_SECRET=super_secret_jwt_key_softdrinks_gusa_2026

# Client API URL
EXPO_PUBLIC_API_URL=http://localhost:8081/api
```

---

## 4. Test & Verify the Connection (Run the Admin Seeder)

We already built an interactive verification tool in Phase 1! It tests the connection to MongoDB Atlas and creates your initial Owner/Manager account.

In your terminal, navigate to `mobile/` and run:

```bash
cd mobile
npm run seed:admin
```

What will happen:
1. It will print `Connecting to MongoDB Atlas...`
2. If your `.env` is correct, it will say: `✓ Connected successfully.`
3. It will prompt you for:
   - **Owner username** (e.g., `owner`)
   - **Full Name** (e.g., `Business Manager`)
   - **Password** (e.g., `admin12345`)
4. It will hash the password with bcrypt and save the user into your MongoDB Atlas cloud database.
5. It will output: `✓ Owner/Manager account successfully created!`

Once that succeeds, your cloud database is 100% connected, verified, and ready!
