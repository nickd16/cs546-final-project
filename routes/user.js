import {Router} from 'express';
import { registerUser, getLoginToken } from '../data/user.js';
import {checkDupUsername, validateLoginUser, usernameExists, } from '../helpers.js'
import {user} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRedirectMW } from './middleware.js';

import { body, validationResult } from 'express-validator'

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
    body('username').notEmpty().escape().custom(async value => {
      const username = await usernameExists(value);
      if (!username) {
          throw Error("No username found!");
      }
    }),
    body('password').notEmpty().escape().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
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
      await checkDupUsername(value); // check duplicate username
    }),
    body('password').notEmpty().withMessage("Enter a not empty password").escape().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
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


export default router;