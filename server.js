const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const axios = require("axios");
const cors = require("cors"); // Import cors

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "https://thecryptoview.netlify.app",
  })
);

const client = new MongoClient(process.env.MONGO_URI);

let db;

// Connect to MongoDB and access the `cryptoView` database and `users` collection
async function connectToDB() {
  if (!db) {
    try {
      await client.connect();
      db = client.db("cryptoView"); // Connect to the `cryptoView` database
      console.log("Connected to MongoDB");
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      throw new Error("Database connection error");
    }
  }
  return db.collection("users");
}

// Proxy Route for CoinCap API (prices)
app.get("/api/prices", async (req, res) => {
  try {
    const response = await axios.get(process.env.CRYPTO_API);
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error fetching prices from CoinCap" });
  }
});

// Proxy Route for CoinTelegraph RSS feed (news)
app.get("/api/news", async (req, res) => {
  try {
    const response = await axios.get(process.env.NEWS_API);
    res.set("Content-Type", "application/rss+xml");
    res.status(200).send(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error fetching news from CoinTelegraph" });
  }
});

// CRUD Operations for Users Collection

// Route to GET all users
app.get("/api/users", async (req, res) => {
  const collection = await connectToDB();

  try {
    const users = await collection.find().toArray();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to GET a specific user by ID
app.get("/api/users/:userID", async (req, res) => {
  const { userID } = req.params;
  const collection = await connectToDB();

  try {
    const user = await collection.findOne({ _id: new ObjectId(userID) });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Create a new user (handleSignUp)
app.post("/api/users/signup", async (req, res) => {
  const collection = await connectToDB();
  try {
    const result = await collection.insertOne(req.body);
    const newUser = await collection.findOne({ _id: result.insertedId });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - Update a user by ID
app.put("/api/users/:userID", async (req, res) => {
  const { userID } = req.params;
  const collection = await connectToDB();

  // Extract _id from the req.body
  const { _id, ...userWithNoID } = req.body;

  try {
    const result = await collection.updateOne(
      { _id: new ObjectId(userID) },
      { $set: userWithNoID }
    );
    if (result.matchedCount === 0)
      return res.status(404).json({ error: "User not found" });
    const updatedUser = await collection.findOne({ _id: new ObjectId(userID) });
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Remove a user by ID
app.delete("/api/users/:userID", async (req, res) => {
  const { userID } = req.params;
  const collection = await connectToDB();
  try {
    const result = await collection.deleteOne({ _id: new ObjectId(userID) });
    if (result.deletedCount === 0)
      return res.status(404).json({ error: "User not found" });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// export the app for vercel serverless functions
module.exports = app;

/*

 _     ____  ____   ____   _     _   _  ____   ____  _____ 
| |__ / () \/ (__` / () \ | |__ | |_| |/ () \ (_ (_`|_   _|
|____|\____/\____)/__/\__\|____||_| |_|\____/.__)__)  |_|  
  ____  ____ _____ __  __ ____ _____                       
 (_ (_`| ===|| () )\ \/ /| ===|| () )                      
.__)__)|____||_|\_\ \__/ |____||_|\_\                      
 ____  ____  __  _  ____  _  ____                          
/ (__`/ () \|  \| || ===|| |/ (_,`                         
\____)\____/|_|\__||__|  |_|\____)                         


app.use(cors());
app.use(express.json()); // Middleware to parse JSON request bodies

// Start the server on a specified port for local development
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


*/
