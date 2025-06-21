const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const pagesDirectory = path.join(__dirname, '../frontend/public');
const MONGODB_URI = 'mongodb+srv://sanjusingh2472:Outlaw7257@musiconnect.vfadfpo.mongodb.net/';

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(pagesDirectory));

MongoClient.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        console.log('Connected to MongoDB');
        const db = client.db('MusiConnect');
        const usersCollection = db.collection('UserData');

        // Serve HTML files dynamically
        const htmlFiles = fs.readdirSync(pagesDirectory).filter(file => file.endsWith('.html'));
        htmlFiles.forEach(file => {
            const pageName = path.parse(file).name;
            app.get(`/${pageName}`, (req, res) => {
                res.sendFile(path.join(pagesDirectory, `${file}`));
            });
        });

        app.get('/', (req, res) => {
            res.sendFile(path.join(pagesDirectory, 'signup.html'));
        });

        // Signup route
        app.post('/signup', async (req, res) => {
            const { firstName, lastName, email, password } = req.body;

            try {
                const existingUser = await usersCollection.findOne({ email });
                if (existingUser) {
                    return res.status(400).send('User already exists. Click back button to go to signup page.');
                }

                await usersCollection.insertOne({ firstName, lastName, email, password });
                console.log('User created successfully');
                res.send('<script>alert("Account Created Successfully"); window.location.href="/login.html";</script>');
            } catch (error) {
                console.error('Error occurred during signup:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        // Login route
        app.post('/login', async (req, res) => {
            const { email, password } = req.body;

            try {
                const user = await usersCollection.findOne({ email });

                if (user) {
                    if (user.password === password) {
                        res.cookie('user', email);
                        res.redirect('/homepage.html');
                    } else {
                        res.send('<script>alert("Incorrect credentials. Please try again."); window.location.href="/login.html";</script>');
                    }
                } else {
                    res.send('<script>alert("User Not Found. Please try again."); window.location.href="/login.html";</script>');
                }
            } catch (error) {
                console.error('Error occurred during login:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        // Profile route
        app.get('/profile', async (req, res) => {
            const userEmail = req.cookies.user;

            if (!userEmail) {
                return res.redirect('/login.html');
            }

            try {
                const user = await usersCollection.findOne({ email: userEmail });
                if (user) {
                    res.json(user);
                } else {
                    res.status(404).send('User not found');
                }
            } catch (error) {
                console.error('Error fetching user profile:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch(err => console.error('Failed to connect to MongoDB', err));