import {Router} from 'express';
import { registerUser } from '../data/user.js';
import {checkDupEmail, checkDupUsername} from '../helpers.js'
import {user} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRedirectMW } from './middleware.js';

import {fileURLToPath} from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));

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
    body('email').notEmpty().escape().isEmail().withMessage('Enter a valid email'), // body('username').notEmpty().escape(),
    body('password').notEmpty().escape().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
  ],
  async (req, res) => {
    const errors = validationResult(req); // This will check for the username, email, and password validation errors
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      // find user document
      const user = await user.findOne({ email: email });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      const token = jwt.sign({ id: user._id, role: user.role }, 'secretkeygoeshere', { expiresIn: '1h' }); // Replace secretkeygoeshere with a better solution
      res.status(200).json({ token, message: 'Logged in successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Error logging in', error: err.message });
    }
  });


// Front end will send a form for this post request, so the user can input a email and password
// POST /register
router
  .route('/register')
  .get(async (req, res) => {
    //code here for GET
    res.render('register', {layout: 'LR.handlebars'});
    // res.sendFile(path.join(__dirname, '/views/register.html'));
   }) 
  .post([
    body('username').notEmpty().withMessage("Enter a not empty username").escape(),
    body('email').notEmpty().withMessage("Enter a not empty email").escape().isEmail().withMessage('Enter a valid email'),
    body('password').notEmpty().withMessage("Enter a not empty password").escape().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
  ], async (req, res) => {
    //code here for POST
    const errors = validationResult(req); // This will check for the username, email, and password validation errors
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password } = req.body; // Need to ensure username, email and password exist

    try {
      // Check for duplicate emails
      await checkDupEmail(email);

      // Check for duplicate usernames
      await checkDupUsername(username);
    } catch (err) {
      return res.status(400).json({ message: 'Duplicate email or username', error: err.message });
    }
    

    try {
      // Really we can choose our pick of what hashing function we use I'm just using bcrypt for now
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await registerUser(username, email, hashedPassword);

      res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Error registering user', error: err.message });
    }
   });


export default router;