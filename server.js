const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');
const { collection, query, orderBy, limit, startAfter } = require ('firebase-admin/firestore');

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const serviceAccount = {
							"type": "service_account",
							"project_id": process.env.PROJECT_ID,
							"private_key_id": process.env.PRIVATE_KEY_ID,
							"private_key": process.env.PRIVATE_KEY,
							"client_email": process.env.CLIENT_MAIL,
							"client_id": process.env.CLIENT_ID,
							"auth_uri": "https://accounts.google.com/o/oauth2/auth",
							"token_uri": "https://oauth2.googleapis.com/token",
							"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
							"client_x509_cert_url": process.env.CLIENT_X509_CERT_URL,
							"universe_domain": "googleapis.com"
						} 	//require('./serviceAccountKey.json');

const message_JSON = require('./error_codes.json');

const messages = message_JSON.messages;

const PAGE_SIZE = 9;

function getRandomString(myArray) {
  const randomIndex = Math.floor(Math.random() * myArray.length);
  return myArray[randomIndex];
}

function slugify(title) {
    return  title.toLowerCase()
                .replace(/[^\w\-]+/g, '-')  // Replace non-word and non-hyphen characters
                .replace(/\-\-+/g, '-')     // Replace multiple hyphens with a single hyphen
                .replace(/^-|-$/g, '');     // Remove leading and trailing hyphens
}

// Initialize Firebase
initializeApp({
  credential: cert(serviceAccount)
});

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore();

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// Get a specific post by ID
app.get('/post/:postSlug', async (req, res) => {
  try {
    const postSlug = req.params.postSlug;

    const docRef = db.collection('easyAccess').doc(postSlug);
    const docSnapshot = await docRef.get();

    if (!docSnapshot.exists) {
        let random_msg = getRandomString(messages);
        return res.status(404).json({ message: 'Post not found!', disp_msg: random_msg });
    }

    const easyData = docSnapshot.data();

    const postRef = db.collection('posts').doc(easyData.postID);
    const postSnapshot = await postRef.get();

    if (!postSnapshot.exists) {
        let random_msg = getRandomString(messages);
        return res.status(404).json({ message: 'Post not found!', disp_msg: random_msg });
    }

    const postData = postSnapshot.data();

    res.json(postData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error getting post!' });
  }
});


app.post('/add-post', async (req, res) => {
  try {
    const postData = req.body;

    const title = postData.title;

    const docRef = await db.collection('posts').add(postData);

    const postSlug = slugify(postData.title);
    const mainData = {
        postID: docRef.id,
        title: postData.title,
        author: postData.author,
        createdDate: postData.createDate,
        tags: postData.tags,
    };

    const indexStore = await db.collection("easyAccess").doc(postSlug).set(mainData);

    res.json({ message: 'Post added successfully!', id: postSlug });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding post!' });
  }
});


// Get the main page posts list.
app.get('/page/:page', async (req, res) => {

    try {
        const page = req.params.page;

        const lastOne = await db.collection('easyAccess').doc("sample-to-almost-final-testing").get();

        const allPostsSnapshot = await db.collection('easyAccess')
                                         .orderBy('createdDate', 'desc')
                                         .limit(PAGE_SIZE)
                                         .offset(PAGE_SIZE * (page - 1))
                                         .get();

        let allPosts = allPostsSnapshot.docs.map(doc => doc.data());

        const count = await db.collection("easyAccess")
                              .count()
                              .get()
							  
		let pageInfo = {
			currentPage: page,
			size: PAGE_SIZE,
			totalCount: count.data().count,
			fetchedCount: allPosts.length,
		}

        res.json({ message: `Fetched ${PAGE_SIZE} posts successfully!`, moreInfo: pageInfo, posts: allPosts });
    } catch(error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding post!' });
    }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
