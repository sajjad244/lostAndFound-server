require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken'); //web token 
const cookieParser = require('cookie-parser') //jwt cookie parser
const app = express();
const port = process.env.PORT || 5000;

// jwt token which url will support
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionalSuccessStatus: 200,
}

// middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser()) //jwt cookie parser


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

// verifyToken
const verifyToken = (req, res, next) => {
    const token = req.cookies?.token
    if (!token) return res.status(401).send({ message: 'unauthorized access' })
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded
    })

    next()
}

// !!___mongodb_Function

async function run() {
    try {
        // making collections of mongodb
        const db = client.db("lost_and_found_DB");
        const lostFoundCollection = db.collection("lost_found");
        const recoveredCollection = db.collection("recovered");
        // making collections of mongodb

        // ! generate token for user jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '1h' });

            res.cookie('token', token, {
                // always same 
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            }).send({ success: true });


        })

        //! logout || clear cookie from browser
        app.get('/logout', async (req, res) => {
            res
                .clearCookie('token', {
                    maxAge: 0,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true })
        })


        // ? save data in mongodb {received from client}(by insertOne) // ?
        app.post('/addItems', async (req, res) => {
            const lostFound = req.body;
            const result = await lostFoundCollection.insertOne(lostFound);
            res.send(result);
        })

        // ? get all data from mongodb(by find({}).toArray();)___[allItems]
        app.get('/allItems', async (req, res) => {
            // search all data from mongodb for allData page
            const search = req.query.search || ""
            let query = {
                $or: [
                    { title: { $regex: search, $options: 'i' } }, // Search in title
                    { location: { $regex: search, $options: 'i' } } // Search in location
                ] // $options: 'i' for case insensitive search
            };

            // search all data from mongodb for allData page
            const result = await lostFoundCollection.find(query).toArray(); //emn kichu korle find e bosiye dibo
            res.send(result);
        })

        // ? get data using email [specific user thats why using params(by find)] from mongodb___{get_email}
        app.get('/myItems/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const decodedEmail = req.user?.email
            // console.log('email from token-->', decodedEmail)
            // console.log('email from params-->', email)
            if (decodedEmail !== email)
                return res.status(401).send({ message: 'unauthorized access' })
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
        // update single data specified by id {it will take 3 items id, updated data, options}
        // {update_id} !!! id,updated,options [post and put almost same just add this 3 extra items & specify the route and single data]

        app.put('/updateItem/:id', async (req, res) => {
            const id = req.params.id;
            const lostFound = req.body;
            const updated = {
                $set: lostFound
            }
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const result = await lostFoundCollection.updateOne(query, updated, options);
            res.send(result);
        })


        // ? save recovered data in mongodb {received from client}(by insertOne) // ?  (;_)
        // received from client
        app.post('/addRecovered', async (req, res) => {
            const recovered = req.body;
            const result = await recoveredCollection.insertOne(recovered);

            //! change the status of the item in the lostFoundCollection to "Recovered"
            const filter = { _id: new ObjectId(recovered.item._id) };
            const lostFoundUpdate = { $set: { status: "Recovered" } };
            const updateStatus = await lostFoundCollection.updateOne(filter, lostFoundUpdate);

            res.send(result);
        })

        // get data
        app.get('/allRecovered', async (req, res) => {
            const result = await recoveredCollection.find({}).toArray();
            res.send(result);
        })

        //  get data using email [specific user thats why using params(by find)] from mongodb___{get_email}
        app.get('/allRecovered/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const decodedEmail = req.user?.email
            // console.log('email from token-->', decodedEmail)
            // console.log('email from params-->', email)
            if (decodedEmail !== email)
                return res.status(401).send({ message: 'unauthorized access' })
            const result = await recoveredCollection.find(query).toArray();
            res.send(result);
        })

        // ? save recovered data in mongodb {received from client}(by insertOne) // ?  (;_)





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