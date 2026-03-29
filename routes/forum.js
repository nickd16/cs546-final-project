import {Router} from 'express';
import { authMW, authRedirectMW} from './middleware.js';
import { createPost } from '../data/forum.js';
import {forum} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';

const router = Router();

// HTML page
// GET /forum/
router
  .route('/')
  .get(authRedirectMW, async (req, res) => {
    //code here for GET
    res.render('forum');
    // res.sendFile(path.join(__dirname, '/views/forum.html'));
   });


export default router;