const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();
app.use(cors());
app.use(express.json());
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose");

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Mongodb uri missing");
}
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const run = async () => {
  try {
    await client.connect();
    const db = client.db("wanderlust");
    const travelCollection = db.collection("travel");
    const bookingCollection = db.collection("booking");
    const JWKS = createRemoteJWKSet(
      new URL("http://localhost:3000/api/auth/jwks"),
    );
    const verifyToken = async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
          return res.status(401).send({ message: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];

        const { payload } = await jwtVerify(token, JWKS);

        req.user = payload;

        next();
      } catch (error) {
        console.error("JWT verification error:", error);
        return res.status(401).send({ message: "Invalid token" });
      }
    };
    app.post("/travel", verifyToken,async (req, res) => {
      try {
        const data = req.body;
        const result = await travelCollection.insertOne(data);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "failed to post data from form" });
      }
    });
    app.get("/travel", async (req, res) => {
      try {
        const cursor = travelCollection.find();
        const data = await cursor.toArray();
        res.send(data);
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .send({ message: "failed to get travel data from database" });
      }
    });
    app.get("/travel/:id",verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const data = await travelCollection.findOne(query);
        res.send(data);
      } catch (error) {
        console.error(error);
        res.status(500).send({ massage: "faied to get data by id " });
      }
    });
    app.post("/booking",verifyToken, async (req, res) => {
      try {
        const data = req.body;
        const result = await bookingCollection.insertOne(data);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "failed to send booking card data" });
      }
    });

    app.get("/booking/:email", verifyToken,async (req, res) => {
      try {
        const email = req.params.email;
        const filter = { userEmail: email };
        const result = await bookingCollection.find(filter).toArray();

        res.send(result);
      } catch (error) {
        console.error("booking data", error);
        res.status(500).send({ message: "failed to get booking card data" });
      }
    });
    app.patch("/travel/:id",verifyToken, async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      try {
        const data = req.body;
        const updateData = { $set: data };
        const updated = await travelCollection.updateOne(filter, updateData);
        res.send(updated);
      } catch (error) {
        res.status(500).send({ message: "failed to update" });
      }
    });
    app.delete("/travel/:id",verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const filter = { _id: new ObjectId(id) };
        const update = await travelCollection.deleteOne(filter);
        res.send(update);
      } catch (error) {
        res.status(500).send({ message: "failed to get deletedata" });
      }
    });
    app.delete("/booking/:id",verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const filter = { _id: new ObjectId(id) };
        const result = await bookingCollection.deleteOne(filter);
        res.send(result);
      } catch (error) {
        res.status(500).send({ massage: "failed to delete booking data" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("server deployment successfull and pinged done");
    app.listen(port, () => {
      console.log("server now ready ");
    });
  } finally {
    // await client .close()
  }
};
run().catch(console.dir);
app.get("/", async (req, res) => {
  res.send("server is ready for serving");
});
