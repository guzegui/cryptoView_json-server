const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv");
const axios = require("axios"); // For making external API requests

dotenv.config();

// MongoDB connection URI and setup
const client = new MongoClient(process.env.MONGO_URI);

let db;

// Connect to MongoDB and specify the cryptoView database and users collection
async function connectToDB() {
  if (!db) {
    await client.connect();
    db = client.db("cryptoView"); // Connect to the `cryptoView` database
  }
  return db.collection("users"); // Access the `users` collection
}

module.exports = async (req, res) => {
  const collection = await connectToDB();

  // Extract the route parameter or custom route for proxy requests
  const routeParam = req.url.split("/")[2];

  // Proxy Routes for External APIs
  if (req.method === "GET") {
    if (routeParam === "prices") {
      // Proxy to CoinCap API for prices
      try {
        const response = await axios.get("https://api.coincap.io/v2/assets");
        res.status(200).json(response.data);
      } catch (error) {
        res.status(500).json({ error: "Error fetching prices from CoinCap" });
      }
      return;
    }

    if (routeParam === "news") {
      // Proxy to CoinTelegraph RSS feed for news
      try {
        const response = await axios.get("https://cointelegraph.com/rss");
        res.set("Content-Type", "application/rss+xml"); // Set header for XML
        res.status(200).send(response.data);
      } catch (error) {
        res
          .status(500)
          .json({ error: "Error fetching news from CoinTelegraph" });
      }
      return;
    }
  }

  // CRUD Operations for MongoDB Collection
  switch (req.method) {
    case "GET":
      if (routeParam) {
        // Retrieve specific user by ID from MongoDB
        try {
          const user = await collection.findOne({
            _id: new ObjectId(routeParam),
          });
          if (!user) return res.status(404).json({ error: "User not found" });
          res.status(200).json(user);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      } else {
        // Retrieve all users from MongoDB
        try {
          const users = await collection.find().toArray();
          res.status(200).json(users);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      }
      break;

    case "POST":
      // Create a new user
      try {
        const result = await collection.insertOne(req.body);
        const newUser = await collection.findOne({ _id: result.insertedId });
        res.status(201).json(newUser);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
      break;

    case "PUT":
      if (routeParam) {
        try {
          // Convert the route parameter to ObjectId using createFromHexString
          const objectId = ObjectId.createFromHexString(routeParam);

          // Update the user by ID
          const result = await collection.updateOne(
            { _id: objectId },
            { $set: req.body }
          );

          // Check if a user was matched and updated
          if (result.matchedCount === 0) {
            return res.status(404).json({ error: "User not found" });
          }

          // Retrieve the updated user document
          const updatedUser = await collection.findOne({ _id: objectId });
          res.status(200).json(updatedUser);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      } else {
        res.status(400).json({ error: "ID is required for updating a user" });
      }
      break;

    case "DELETE":
      if (routeParam) {
        // Delete a user by ID
        try {
          const result = await collection.deleteOne({
            _id: new ObjectId(routeParam),
          });
          if (result.deletedCount === 0)
            return res.status(404).json({ error: "User not found" });
          res.status(200).json(result);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      } else {
        res.status(400).json({ error: "ID is required for deleting a user" });
      }
      break;

    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
      break;
  }
};
