import {Router} from 'express';
import { createLocation} from '../data/location.js';
import {location} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import { authMW, authRedirectMW} from './middleware.js';

const router = Router();

// HTML page
// GET /location/
router
  .route('/')
  .get(authRedirectMW, async (req, res) => {
    //code here for GET
    res.render('location');
    // res.sendFile(path.join(__dirname, '/views/location.html'));
   });


export default router;