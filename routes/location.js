import {Router} from 'express';
import { createLocation} from '../data/location.js';
import {location} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import { authMW } from './middleware.js';

import {fileURLToPath} from 'url'
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

const router = Router();

// HTML page
// GET /location/
router
  .route('/')
  .get(authMW, async (req, res) => {
    //code here for GET
    res.render('location');
    // res.sendFile(path.join(__dirname, '/views/location.html'));
   });


export default router;