const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config();
const port = process.env.PORT || 5000;

// middlewares 
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hf1udpd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const userCollection = client.db("UniFood").collection("users");
    const mealCollection = client.db("UniFood").collection("meals");
    const reviewCollection = client.db("UniFood").collection("reviews");

    /*-----------------------------------------------
                    Users Related APIs
    ------------------------------------------------*/
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const query = { email: newUser.email };
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send({ message: "User already existing", insertedId: null });
      }
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    })

    /*-----------------------------------------------
                    Meal Related APIs
    ------------------------------------------------*/
    app.get("/meals", async (req, res) => {
      const result = await mealCollection.find().toArray();
      res.send(result);
    })

    app.get("/meals/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await mealCollection.findOne(query);
      res.send(result);
    })

    /*-----------------------------------------------
                Reviews Related APIs
    ------------------------------------------------*/
    app.get("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { meal_id: id };
      const result = await reviewCollection.find(query).toArray();
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("UniFood is running");
})
app.listen(port, () => {
  console.log(`Unifood is running on port ${port}`);
})