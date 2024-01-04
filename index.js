const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const upcomingCollection = client.db("UniFood").collection("upcomingMeals");
    const reviewCollection = client.db("UniFood").collection("reviews");
    const packageCollection = client.db("UniFood").collection("packages");
    const requestCollection = client.db("UniFood").collection("request");


    // Custom middlewares
    // Token verify
    const verifyToken = async (req, res, next) => {
      const token = req.headers?.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).send({ message: "Unauthorized access" });
      }
      jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized access" });
        }
        req.decoded = decoded;
        next();
      })
    }

    // Admin verify
    const verifyAdmin = async (req, res, next) => {
      const tokenEmail = req.decoded.email;
      const query = { email: tokenEmail };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      next();
    }

    /*-----------------------------------------------
                    JWT Related APIs
    ------------------------------------------------*/
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: "1h" });
      res.send({ token });
    })


    /*-----------------------------------------------
                    Users Related APIs
    ------------------------------------------------*/
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    // Check isAdmin
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const tokenEmail = req.decoded.email;
      if (email !== tokenEmail) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    })

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

    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;
      const badge = req.body;
      const query = { email: email };
      const updatedDoc = {
        $set: { badge: badge.package_name }
      }
      const user = await userCollection.findOne(query);
      const currentBadge = user?.badge;
      if (currentBadge === badge.package_name) {
        return res.send({ message: "already purchase", modifiedCount: null })
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    })

    app.patch("/users/admin/:email", verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const updatedDoc = {
        $set: { role: "admin" }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    })

    /*-----------------------------------------------
                Meal Related APIs
    ------------------------------------------------*/
    app.get("/meals", async (req, res) => {
      const priceRange = req.query?.priceRange?.split("-");
      const category = req.query?.category;
      const searchValue = req.query?.searchValue;
      const query = {};
      // get meals by meal_title
      if (searchValue) {
        query.meal_title = { $regex: searchValue, $options: "i" };
      }
      // get meals by category
      if (category) {
        query.category = { $regex: category, $options: "i" };
      }
      // get meals between a price range
      if (priceRange) {
        if (priceRange[0]) {
          query.price = { $gte: parseFloat(priceRange[0]), $lte: parseFloat(priceRange[1]) }
        }
      }
      const result = await mealCollection.find(query).toArray();
      res.send(result);
    })

    app.get("/meals/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await mealCollection.findOne(query);
      res.send(result);
    })

    app.post("/meals", verifyToken, verifyAdmin, async (req, res) => {
      const newMeal = req.body;
      const result = await mealCollection.insertOne(newMeal);
      res.send(result);
    })

    app.patch("/meals/:id", async (req, res) => {
      const id = req.params.id;
      const increaseValue = req.body;
      const query = { _id: id };
      let updatedReviewField = {};
      if (increaseValue.value) {
        updatedReviewField = {
          $inc: { reviews: increaseValue.value },
        }
      }
      if (increaseValue.like !== undefined) {
        if (!increaseValue.like) {
          updatedReviewField = {
            $inc: { likes: 1 },
          }
        } else {
          updatedReviewField = {
            $inc: { likes: -1 },
          }
        }
      }
      const result = await mealCollection.updateOne(query, updatedReviewField);
      res.send(result);
    })

    /*-----------------------------------------------
                Upcoming Related APIs
    ------------------------------------------------*/
    app.post("/upcoming", verifyToken, verifyAdmin, async (req, res) => {
      const upcomingMeal = req.body;
      const result = await upcomingCollection.insertOne(upcomingMeal);
      res.send(result);
    })

    /*-----------------------------------------------
                Reviews Related APIs
    ------------------------------------------------*/
    app.get("/reviews", async (req, res) => {
      const email = req.query?.email;
      const query = { email: email };
      if (query.email) {
        const result = await reviewCollection.find(query).toArray();
        return res.send(result);
      }
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })


    app.get("/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { meal_id: id };
      const result = await reviewCollection.find(query).toArray();
      res.send(result)
    })

    app.get("/oneReview/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviewCollection.findOne(query);
      res.send(result);
    })

    app.put("/oneReview/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const review = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          user_name: review.user_name,
          user_image: review.user_image,
          email: review.email,
          meal_id: review.meal_id,
          meal_title: review.meal_title,
          opinion: review.opinion,
          rating: parseInt(review.rating),
        }
      }
      const result = await reviewCollection.updateOne(query, updatedDoc, options);
      res.send(result);
    })

    app.post("/reviews", async (req, res) => {
      const newReview = req.body;
      const result = await reviewCollection.insertOne(newReview);
      res.send(result);
    })

    app.delete("/reviews/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    })

    /*-----------------------------------------------
                Packages Related APIs
    ------------------------------------------------*/
    app.get("/packages", async (req, res) => {
      const result = await packageCollection.find().toArray();
      res.send(result);
    })

    app.get("/packages/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await packageCollection.findOne(query);
      res.send(result);
    })

    /*-----------------------------------------------
                Request Related APIs
    ------------------------------------------------*/
    app.get("/request", async (req, res) => {
      const email = req.query?.email;
      const query = { user_email: email };
      const result = await requestCollection.find(query).toArray();
      res.send(result);
    })

    app.post("/request", async (req, res) => {
      const requestedMeal = req.body;
      const result = await requestCollection.insertOne(requestedMeal);
      res.send(result);
    })

    app.delete("/request/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await requestCollection.deleteOne(query);
      res.send(result);
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