require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());


// ? start mongodb connection

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jdvna.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// !!___mongodb_Function

async function run() {
    try {
        // making collections of mongodb
        const db = client.db("lost_and_found_DB");
        const lostFoundCollection = db.collection("lost_found");
        // making collections of mongodb

        // ? save data in mongodb {received from client}(by insertOne) // ?
        app.post('/addItems', async (req, res) => {
            const lostFound = req.body;
            console.log('adding new lostFound', lostFound);
            const result = await lostFoundCollection.insertOne(lostFound);
            res.send(result);
        })

        // ? get all data from mongodb(by find({}).toArray();)___[allItems]
        app.get('/allItems', async (req, res) => {
            const result = await lostFoundCollection.find({}).toArray();
            res.send(result);
        })

        // ? get data using email [specific user thats why using params(by find)] from mongodb___{get_email}
        app.get('/myItems/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await lostFoundCollection.find(query).toArray();
            res.send(result);
        })

        // ? delete post from database for myItems [using id params ( by deleteOne)]____{delete_id}

        app.delete('/myItems/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await lostFoundCollection.deleteOne(query);
            res.send(result);
        })

        // ? update post from database for myItems [using id params ( by findOne)]____{update_id}
        // find single data for update
        app.get('/update/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await lostFoundCollection.findOne(query);
            res.send(result);
        })






        //    !!! need to delete last   {}___'
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        //    !!! need to delete last   {}___'
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);






// ? end mongodb connection



// routes or server endpoints & start {1st} server
app.get('/', (req, res) => {
    res.send('Hello from server site!')
})
app.listen(port, () => {
    console.log(`Lost and found listening on port ${port}`)
})