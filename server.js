const { createClient }  = require('@supabase/supabase-js');

// Get dotenv, express, cors and path modules.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

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
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Restrict to your frontend domain
}));

// Middleware to parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to parse application/json (if you're sending JSON)
app.use(bodyParser.json());

// Function to handle supabase error.
const handleSupabaseError = (error, res, message) => {
    console.error('Supabase error:', error);
    return res.status(500).json({ message, splMessage: getRandomString(messages), error });
}

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

// Get a specific post by post slug.
app.get('/post/:postSlug', async (req, res) => {
    try {

        // Get the page number from request.
        const postSlug = req.params.postSlug;

        if (postSlug.trim("") === "") {
            return res.status(500).json({message: "Slug cannot be empty!"});
        }

        const { data, error } = await supabase.from('posts').select('*, tags:tags(name), commensts:comments(*)').eq('slug', postSlug);

        if (error) {
            return handleSupabaseError(error, res, 'Error fetching post!');
        }

        // The the full post data.
        return res.status(200).json(data[0]);

    } catch (error) {
        return res.status(500).json({ message: 'Error fetching post!', splMessage: getRandomString(messages), error: error });
    }
});

// Get the main page posts list.
app.get('/page/:page', async (req, res) => {
    try {

        // Get the page number from request.
        const page = parseInt(req.params.page, 10) || 1;

        const firstPostIndex = PAGE_SIZE * (page - 1);

        let { data: pagePosts, count, error } = await supabase
            .from('posts')
            .select('*, tags:tags(name)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(firstPostIndex, firstPostIndex + (PAGE_SIZE - 1))

        if (error) {
            return handleSupabaseError(error, res, 'Error fetching post!');
        }

        // Create an object containing the required info of the page that is loaded.
        let pageInfo = {
            currentPage: page,
            size: PAGE_SIZE,
            totalCount: count,
            fetchedCount: pagePosts ? pagePosts.length : 0,
        }

        // Send page info, and all the fetched posts as response.
        return res.status(200).json({ message: `Fetched ${PAGE_SIZE} posts successfully!`, moreInfo: pageInfo, posts: pagePosts });
    }

    // If any error the show 500 - Server fail.
    catch(error) {
        return res.status(500).json({ message: 'Error fetching posts!', splMessage: getRandomString(messages), error: error });
    }
});

// Get posts tags.
app.get('/explore', async (req, res) => {
    try {
        const { data: tags, error } = await supabase.rpc('get_tags_with_post_count');

        if (error) {
            return handleSupabaseError(error, res, 'Error fetching post!');
        }

        // Send page info, and all the fetched posts as response.
        return res.status(200).json({ message: `Fetched tags successfully!`, tags: tags });

    } catch (error) {
        return res.status(500).json({ message: 'Error fetching tags!', splMessage: getRandomString(messages), error: error });
    }
});

// Get posts of specific tag.
app.get('/tag/:tag/:page?', async (req, res) => {
    try {

        // Get the tag name from request.
        const tag = req.params.tag;
        const page = parseInt(req.params.page, 10) || 1;

        let firstPostIndex = 0;
        if (page > 0){
            firstPostIndex = PAGE_SIZE * (page - 1);
        }

        if (tag.trim("") === "") {
            return res.status(500).json({message: "Tag is empty!"});
        }

        const { data: tagPosts, count, error } = await supabase
            .from('posts')
            .select(`*, tags!inner(name)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(firstPostIndex, firstPostIndex + PAGE_SIZE)
            .eq('tags.name', tag);

        if (error) {
            return handleSupabaseError(error, res, 'Error fetching post!');
        }

        // Create an object containing the required info of the page that is loaded.
        let pageInfo = {
            currentPage: page,
            size: PAGE_SIZE,
            totalCount: count,
            fetchedCount: tagPosts ? tagPosts.length : 0,
        }

        // Send page info, and all the fetched posts as response.
        return res.status(200).json({ message: `Fetched all posts of ${tag} successfully!`, moreInfo: pageInfo, posts: tagPosts });
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching tags!', splMessage: getRandomString(messages), error: error });
    }
});

// Add comments to the post.
app.post('/add-comment', async (req, res) => {

    function invalidComment(fullCommentData) {
        return (fullCommentData.name.trim() === "" || fullCommentData.comment.trim() === "");
    }

    function invalidPost(postid) {
        const { data, errorPost } = supabase.from('posts').select('id').eq('id', postid);

        if (errorPost) {
            return false;
        } else if (data) {
            return true;
        } else {
            return false;
        }
    }

    try {
        // Get the post data to add from request.
        let commentData = req.body;

        // Get the title of the post.
        const name = commentData.name;
        const comment = commentData.comment;
        const postID = commentData.postid;

        const fullCommentData = {
            name: name,
            comment: comment,
        }

        if (invalidComment(validateComment)) {
            return res.status(500).json({message: "Please enter proper 'Name' and 'Comment'!"});
        }

        if (invalidPost(postID)) {
            return res.status(500).json({message: "Invalid post!"});
        }

        // Insert post to supabase DB and get the added post info.
        const { data, errorPost } = await supabase.from('comments').insert(fullCommentData).select();
        const commentAdded = data[0];

        // Insert comment and post relation.
        await supabase.from('post_comments').insert({posts_id: postID, comments_id: commentAdded.uuid});

        // Show error is any error occurs.
        if (errorPost) {
            return handleSupabaseError(error, res, 'Error fetching post!');
        }

        // Send the slug the data and successfully added message.
        return res.status(200).json({ message: 'Comment added successfully!', comment: commentAdded });
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching tags!', splMessage: getRandomString(messages), error });
    }
})

// Route to search posts.
app.get('/search', async (req, res) => {
    try {
        const query = req.query.search;
        const page = req.query.page || 1;

        const firstPostIndex = PAGE_SIZE * (page - 1);

        if (query.trim("") === "") {
            return res.status(500).json({message: 'Query parameter cannot be empty!'});
        }

        const { data, count, error } = await supabase
            .from('posts')
            .select('*, tags:tags(name)', { count: 'exact' })
            .ilike('title', `%${query}%`)
            .order('created_at', { ascending: false })
            .range(firstPostIndex, firstPostIndex + (PAGE_SIZE - 1))

        if (error) {
            return handleSupabaseError(error, res, 'Error fetching post!');
        }

        // Create an object containing the required info of the page that is loaded.
        let pageInfo = {
            currentPage: page,
            size: PAGE_SIZE,
            totalCount: count,
            fetchedCount: data.length,
        }

        return res.status(200).json({ message: `Fetched ${count} search results`, moreInfo: pageInfo, posts: data})
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching posts!', splMessage: getRandomString(messages), error });
    }
})

// Start the server.
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));