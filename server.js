const { createClient }  = require('@supabase/supabase-js');

// Get dotenv, express, cors and path modules.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

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

// Create an express app and make is use JSON
// and allow request from all sources.
const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// Disallow request the base root.
function disallowRoot(req, res, next) {
    if (req.originalUrl === '/') {
        res.redirect('/new-post');  // Redirect to add-post route
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
        
        const { data, error } = await supabase.from('posts').select('*, tags:tags(name), commensts:comments(*)').eq('slug', postSlug);
        
        // The the full post data.
        res.json(data[0]);
        
    } catch (error) {
        
    }
});

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
        res.json({ message: 'Post added successfully!', id: postSlug, error: '200' });
    }

    // If any error the show 500 - Server fail.
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding post!' });
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
        res.json({ message: 'Post Updated successfully!', id: postSlug, error: '200' });
    }

    // If any error the show 500 - Server fail.
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating post!' });
    }
});

// Get the main page posts list.
app.get('/page/:page', async (req, res) => {
    try {

        // Get the page number from request.
        const page = req.params.page;
        
        const firstPostIndex = PAGE_SIZE * (page - 1);
        
        let { data: pagePosts, count, error } = await supabase
            .from('posts')
            .select('*, tags:tags(name)', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(firstPostIndex, firstPostIndex + (PAGE_SIZE - 1))
         
        // Create an object containing the required info of the page that is loaded.
        let pageInfo = {
            currentPage: page,
            size: PAGE_SIZE,
            totalCount: count,
            fetchedCount: pagePosts ? pagePosts.length : 0,
        }
        
        // Send page info, and all the fetched posts as response.
        res.json({ message: `Fetched ${PAGE_SIZE} posts successfully!`, moreInfo: pageInfo, posts: pagePosts });
    }

    // If any error the show 500 - Server fail.
    catch(error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching posts!' });
    }
});

// Get posts tags.
app.get('/explore', async (req, res) => {
    try {
        const { data: tags, error } = await supabase.rpc('get_tags_with_post_count');
          
        // Send page info, and all the fetched posts as response.
        res.json({ message: `Fetched tags successfully!`, tags: tags });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching tags!' });
    }
});

// Get posts of specific tag.
app.get('/tag/:tag/:page?', async (req, res) => {
    try {
        
        // Get the tag name from request.
        const tag = req.params.tag;
        const page = req.params.page;

        let firstPostIndex = 0;
        if (page > 0){
            firstPostIndex = PAGE_SIZE * (page - 1);
        }
        
        const { data: tagPosts, count, error } = await supabase
            .from('posts')
            .select(`*, tags!inner(name)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(firstPostIndex, firstPostIndex + PAGE_SIZE)
            .eq('tags.name', tag);
            
        // Create an object containing the required info of the page that is loaded.
        let pageInfo = {
            currentPage: page,
            size: PAGE_SIZE,
            totalCount: count,
            fetchedCount: tagPosts ? tagPosts.length : 0,
        }
          
        // Send page info, and all the fetched posts as response.
        res.json({ message: `Fetched all posts of ${tag} successfully!`, moreInfo: pageInfo, posts: tagPosts });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching tags!' });
    }
});

// Route to show add new post UI.
app.get('/new-post', async (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add comments to the post.
app.post('/add-comment', async (req, res) => {
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
        
        // Insert post to supabase DB and get the added post info.
        const { data, errorPost } = await supabase.from('comments').insert(fullCommentData).select();
        const commentAdded = data[0];
        
        // Insert comment and post relation.
        await supabase.from('post_comments').insert({posts_id: postID, comments_id: commentAdded.uuid});
        
        // Show error is any error occurs.
        if (errorPost){
            throw errorPost;
        }

        // Send the slug the data and successfully added message.
        res.json({ message: 'Comment added successfully!', comment: commentAdded, error: '200' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching tags!' });
    }
})

// Route to search posts.
app.get('/search', async (req, res) => {
    try {
        const query = req.query.search;
        const tag = req.query.tag;
        const page = req.query.page || 1;
        
        const firstPostIndex = PAGE_SIZE * (page - 1);
        
        const { data, count, error } = await supabase
            .from('posts')
            .select('*, tags:tags(name)', { count: 'exact' })
            .ilike('title', `%${query}%`)
            .order('created_at', { ascending: false })
            .range(firstPostIndex, firstPostIndex + (PAGE_SIZE - 1))
         
        // Create an object containing the required info of the page that is loaded.
        let pageInfo = {
            currentPage: page,
            size: PAGE_SIZE,
            totalCount: count,
            fetchedCount: data.length,
        }
        
        res.json({ message: `Fetched ${count} search results`, moreInfo: pageInfo, posts: data})
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching posts!' });
    }
})

// Start the server.
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on port ${port}`));