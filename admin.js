const { createClient }  = require('@supabase/supabase-js');

// Get dotenv, express, cors and path modules.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const jwt = require('jsonwebtoken');

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_TOKEN;

// Create a single supabase client for interacting with your database
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Get the set of error messages.
const message_JSON = require('./error_codes.json');
const messages = message_JSON.messages;

// Define the page size for pagination.
const PAGE_SIZE = 12;

// Get random message from the error messages.
function getRandomString(myArray) {
    const randomIndex = Math.floor(Math.random() * myArray.length);
    return myArray[randomIndex];
}

// Create an express app and make is use JSON
// and allow request from all sources.
const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// Middleware to parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to parse application/json (if you're sending JSON)
app.use(bodyParser.json());

// Disallow request the base root.
function disallowRoot(req, res, next) {
    if (req.originalUrl === '/') {
        return res.redirect('/page/1');  // Redirect to get page wise posts route
    }
    next();
}
app.use(disallowRoot);

// Use the public directory for the static files.
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // set true if using HTTPS
}));

// Process tags
function processTags(tags, post_id){

    tags.map(async (tag) => {

        // Check if tag exists
        const { data: existingTag, error } = await supabase
            .from('tags')
            .select('*')
            .match({ name: tag });

        if (error) {
            throw error;
        }

        let tagId;
        if (existingTag.length > 0) {

            tagId = existingTag[0].id;

        } else {

            // Create new tag
            const { data: newTag, error } = await supabase
                .from('tags')
                .insert([{ name: tag }])
                .select('*');

            if (error) {
              throw error;
            }

            tagId = newTag[0].id;
        }

        // Create post-tag relationship
        await supabase.from('post_tags').insert({ post_id: post_id, tag_id: tagId });
    });
}

// Slugify the title of the post.
function slugify(title) {
    return  title.toLowerCase()
            .replace(/[^\w\-]+/g, '-')  // Replace non-word and non-hyphen characters
            .replace(/\-\-+/g, '-')     // Replace multiple hyphens with a single hyphen
            .replace(/^-|-$/g, '');     // Remove leading and trailing hyphens
}

// Route to add post.
app.post('/add-post', async (req, res) => {
    try {

        // Get the post data to add from request.
        let postData = req.body;

        // Get the title of the post.
        const title = postData.title;

        // Create the slug of the title.
        const postSlug = slugify(title);

        // Separate tags from postData.
        const {tags, ...rest} = postData;

        // Update tags removed postData to filteredPostData.
        const filteredPostData = rest;

        // Add slug to the post details.
        filteredPostData.slug = postSlug;

        // Insert post to supabase DB and get the added post info.
        const { data, errorPost } = await supabase.from('posts').insert(filteredPostData).select();
        const post = data[0];

        // Show error is any error occurs.
        if (errorPost){
            throw errorPost;
        }

        // Process tags.
        processTags(tags, post.id);

        // Send the slug the data and successfully added message.
        return res.status(200).json({ message: 'Post added successfully!', id: postSlug });
    }

    // If any error the show 500 - Server fail.
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error adding post!' });
    }
});

// Route to update post.
app.post('/update-post', async (req, res) => {
    try {

        // Get the post data to add from request.
        let postData = req.body;

        const id = postData.id;
        delete postData.id;

        // Get the title of the post.
        const title = postData.title;

        // Create the slug of the title.
        const postSlug = slugify(title);

        // Separate tags from postData.
        const {tags, ...rest} = postData;

        // Update tags removed postData to filteredPostData.
        const filteredPostData = rest;

        // Add slug to the post details.
        filteredPostData.slug = postSlug;

        // Insert post to supabase DB and get the added post info.
        const { data, errorPost } = await supabase.from('posts')
                                                  .update(filteredPostData)
                                                  .eq('id', id)
                                                  .select();
        const post = data[0];

        // Show error is any error occurs.
        if (errorPost){
            throw error;
        }

        // Process tags.
        processTags(tags, post.id);

        // Send the slug the data and successfully added message.
        return res.status(200).json({ message: 'Post Updated successfully!', id: postSlug });
    }

    // If any error the show 500 - Server fail.
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error updating post!' });
    }
});

// Route to show add new post UI.
app.get('/new-post', async (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});