import {Router} from 'express';
import { authMW } from './middleware.js';
import { createPost } from '../data/forum.js';
import {forum} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import {fileURLToPath} from 'url'
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

const router = Router();

// HTML page
// GET /forum/
router
  .route('/')
  .get(authMW, async (req, res) => {
    //code here for GET
    res.sendFile(path.join(__dirname, '/views/forum.html'));
   });


export default router;