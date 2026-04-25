import {Router} from 'express';
import { registerUser, getLoginToken, getUserById, addFavLocationToUserById, removeFavLocationToUserById } from '../data/user.js';
import {checkDupUsername, usernameExists, passwordMatchesHash, validateUsernameField, validatePasswordField, validateIdField} from '../helpers.js'
import {user} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authReverseRedirectMW, authRedirectMW, authMW } from './middleware.js';

import { body, check, param, validationResult } from 'express-validator'

const router = Router();



// GET /
router
  .route('/')
  .get(authRedirectMW, async (req, res) => {
    // code here for GET
    const userOb = await getUserById(req.user["id"]);
    res.render('index', {layout: 'main.handlebars', "loggedIn": req.user, title: 'Home', "username": userOb["username"]});
   });

// Give the login page in html
// GET /login
router
  .route('/login')
  .get(authReverseRedirectMW, async (req, res) => {
    //code here for GET
    res.render('login', {layout: 'main.handlebars', "loggedIn": req.user, title: 'Login'});
   })
  .post([
    body('username').notEmpty().withMessage("Enter a not empty username").escape().custom(async value => {
      value = await validateUsernameField(value);
      const username = await usernameExists(value);
      if (!username) {
          throw Error("Invalid credentials!");
      }
    }),
    body('password').notEmpty().withMessage("Enter a not empty password").custom(async value => {
      value = await validatePasswordField(value);
    })
  ],
  async (req, res) => {
    const errors = validationResult(req); // This will check for the username and password validation errors
    if (!errors.isEmpty()) return res.status(400).render('login', {layout: 'main.handlebars', "loggedIn": req.user, title: 'Login', error: 'Error registering user: ' + errors.array()[0]['msg'] });

    const { username, password } = req.body;
    
    try {
      await passwordMatchesHash(username, password);
    } catch (err) {
      return res.status(400).render('login', {layout: 'main.handlebars', "loggedIn": req.user, title: 'Login', error: 'Error logging in: ' + err.message});
    }

    // login and get token
    try {
      const token = await getLoginToken(username, password);

      req.session.token = token; // Using sessions
      return res.redirect('/');
    } catch (err) {
      return res.status(500).render('login', {layout: 'main.handlebars', "loggedIn": req.user, title: 'Login', error: 'Error logging in: ' + err.message});
    }
  });


// Front end will send a form for this post request, so the user can input a username and password
// POST /register
router
  .route('/register')
  .get(authReverseRedirectMW, async (req, res) => {
    //code here for GET
    res.render('register', {layout: 'main.handlebars', "loggedIn": req.user, title: 'Register'});
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
    if (!errors.isEmpty()) {
      return res.status(400).render('register', {layout: 'main.handlebars', "loggedIn": req.user, title: 'Register', error: 'Error registering user: ' + errors.array()[0]['msg'] });
    }
    const { username, password } = req.body; // Need to ensure username and password exist

    try {
      const user = await registerUser(username, password);

      // res.status(201).json({ message: 'User registered successfully' });
      res.status(201).render('register', {layout: 'main.handlebars', "loggedIn": req.user, title: 'Register', success: 'User registered successfully! Now go to login to login.'});
    } catch (err) {
      // res.status(500).json({ message: 'Error registering user', error: err.message });
      res.status(500).render('register', {layout: 'main.handlebars', "loggedIn": req.user, title: 'Register', error: 'Error registering user: ' + err.message});
    }
   });
  
   router.route('/user/:userId').get([authMW, check('userId').notEmpty().custom(async value => {
      value = await validateIdField(value);
    })
  ], async (req, res) => {
    // code here for GET
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0]['msg'] });
    
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
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0]['msg'] });
    
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
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0]['msg'] });
    
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
   
   router
  .route('/logout')
  .get(authRedirectMW, async (req, res) => {
    //code here for GET
    delete req.session.token;
    delete req.user;
    return res.render('logout', {layout: 'main.handlebars', "loggedIn": req.user, title: 'Logout',});
   })


export default router;