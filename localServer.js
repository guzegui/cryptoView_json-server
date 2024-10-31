const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const axios = require("axios");
const cors = require('cors'); // Import cors


dotenv.config();

const app = express();
app.use(cors());

const client = new MongoClient(process.env.MONGO_URI);

let db;

// Connect to MongoDB and access the `cryptoView` database and `users` collection
async function connectToDB() {
  if (!db) {
    await client.connect();
    db = client.db("cryptoView");
  }
  return db.collection("users");
}

// Proxy Route for CoinCap API (prices)
app.get("/api/prices", async (req, res) => {
  try {
    const response = await axios.get(process.env.NEWS_API);
    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error fetching prices from CoinCap" });
  }
});

// Proxy Route for CoinTelegraph RSS feed (news)
app.get("/api/news", async (req, res) => {
  try {
    const response = await axios.get(process.env.CRYPTO_API);
    res.set("Content-Type", "application/rss+xml");
    res.status(200).send(response.data);
  } catch (error) {
    res.status(500).json({ error: "Error fetching news from CoinTelegraph" });
  }
});

// CRUD Operations for Users Collection

// GET all users or a specific user by ID (handleLogin)
app.get("/api/users/:userID?", async (req, res) => {
  const { userID } = req.params;
  const collection = await connectToDB();

  if (userID) {
    // Retrieve specific user by ID
    try {
      const user = await collection.findOne({ _id: new ObjectId(userID) });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    // Retrieve all users
    try {
      const users = await collection.find().toArray();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
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
  try {
    const result = await collection.updateOne(
      { _id: new ObjectId(userID) },
      { $set: req.body }
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

// Start the Express server for local development
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running locally on http://localhost:${PORT}`);
});
