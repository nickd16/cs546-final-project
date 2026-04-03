import {Router} from 'express';
import { registerUser, getLoginToken, getUserById, addFavLocationToUserById, removeFavLocationToUserById } from '../data/user.js';
import {checkDupUsername, usernameExists, passwordMatchesHash, validateUsernameField, validatePasswordField, validateIdField} from '../helpers.js'
import {user} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRedirectMW, authMW } from './middleware.js';

import { body, check, param, validationResult } from 'express-validator'

const router = Router();



// GET /
router
  .route('/')
  .get(authRedirectMW, async (req, res) => {
    // code here for GET
    res.render('index');
    // res.sendFile(path.join(__dirname, '/views/index.html'));
   });

// Give the login page in html
// GET /login
router
  .route('/login')
  .get(async (req, res) => {
    //code here for GET
    res.render('login', {layout: 'LR.handlebars'});
    // res.sendFile(path.join(__dirname, '/views/login.html'));
   })
  .post([
    body('username').notEmpty().withMessage("Enter a not empty username").escape().custom(async value => {
      value = await validateUsernameField(value);
      const username = await usernameExists(value);
      if (!username) {
          throw Error("No username found!");
      }
    }),
    body('password').notEmpty().withMessage("Enter a not empty password").custom(async value => {
      value = await validatePasswordField(value);
    })
  ],
  async (req, res) => {
    const errors = validationResult(req); // This will check for the username and password validation errors
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;
    
    try {
      await passwordMatchesHash(username, password);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    // login and get token
    try {
      const token = await getLoginToken(username, password);

      // res.status(200).json({ token, message: 'Logged in successfully' });
      // res.send(token);
      // console.log(token);
      req.session.token = token; // Using sessions
      return res.redirect('/');
    } catch (err) {
      return res.status(500).json({ message: 'Error logging in', error: err.message });
    }
  });


// Front end will send a form for this post request, so the user can input a username and password
// POST /register
router
  .route('/register')
  .get(async (req, res) => {
    //code here for GET
    res.render('register', {layout: 'LR.handlebars'});
    // res.sendFile(path.join(__dirname, '/views/register.html'));
   }) 
  .post([
    body('username').notEmpty().withMessage("Enter a not empty username").escape().custom(async value => {
      value = await validateUsernameField(value);
      await checkDupUsername(value); // check duplicate username
    }),
    body('password').notEmpty().withMessage("Enter a not empty password").custom(async value => {
      value = await validatePasswordField(value);
    })
  ], async (req, res) => {
    //code here for POST
    // validation
    const errors = validationResult(req); // This will check for the username and password validation errors
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body; // Need to ensure username and password exist

    try {
      const user = await registerUser(username, password);

      res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Error registering user', error: err.message });
    }
   });
  
   router.route('/user/:userId').get([authMW, check('userId').notEmpty().custom(async value => {
      value = await validateIdField(value);
    })
  ], async (req, res) => {
    // code here for GET
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    let userId = req.params.userId;

    let user = {};
    try {
      user = await getUserById(userId); // Assuming the user doesn't contain the hashedPassword 
    } catch (e) {
      return res.status(400).json({"error" : e});
    }
    // Only publicly available infomation should be getable here unless we make a special self user route for getting private info
    // delete user["hashedPassword"]; // If they need this they need to be verified!
    if (req.user.id != userId) { // Only give the users favLocationIds to the user who it belongs to for client side map rendering
      delete user["favLocationIds"];
    }
    return res.status(200).json(user);
    
    // res.sendFile(path.join(__dirname, '/views/index.html'));
   });

   router.route('/user/:userId/favLocations/').post([authMW, check('userId').notEmpty().custom(async value => {
      value = await validateIdField(value);
    }), body("locationId").notEmpty().custom(async value => {
      value = await validateIdField(value);
    })
  ], async (req, res) => {
    // code here for GET
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    let userId = req.params.userId;
    let locationId = req.body.locationId;

    try {
      let userLocIds = await addFavLocationToUserById(userId, locationId);
    } catch (e) {
      return res.status(400).json({"error" : e});
    }
    

    if (req.user.id != userId) {
      return res.status(200).json(userLocIds);
    } else {
      return res.status(400).json({"error":"Not permitted to add to other users favorite locations list!"});
    }
   }).delete([authMW, check('userId').notEmpty().custom(async value => {
      value = await validateIdField(value);
    }), body("locationId").notEmpty().custom(async value => {
      value = await validateIdField(value);
    })
  ], async (req, res) => {
    // code here for GET
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    
    let userId = req.params.userId;
    let locationId = req.body.locationId;

    try {
      let userLocIds = await removeFavLocationToUserById(userId, locationId);
    } catch (e) {
      return res.status(400).json({"error" : e});
    }
    

    if (req.user.id != userId) {
      return res.status(200).json(userLocIds);
    } else {
      return res.status(400).json({"error":"Not permitted to remove ids from other users favorite locations list!"});
    }
   });


export default router;