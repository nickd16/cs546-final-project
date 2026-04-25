//here is where you'll set up your server as shown in lecture code.
import express from 'express';
// import { engine } from 'express-handlebars';
// import { registerPartials } from 'express-handlebars';
import { create } from "express-handlebars";
import session from 'express-session';
import jwt from 'jsonwebtoken';
const app = express();
import configRoutes from './routes/index.js';

const rewriteUnsupportedBrowserMethods = (req, res, next) => {
  // If the user posts to the server with a property called _method, rewrite the request's method
  // To be that method; so if they post _method=PUT you can now allow browsers to POST to a route that gets
  // rewritten in this middleware to a PUT route
  if (req.body && req.body._method) {
    console.log('[rewrite _method]', req.path, 'was POST', String(req.body._method));
    req.method = req.body._method;
    delete req.body._method;
  }

  // let the next middleware run:
  next();
};

// const db = await dbConnection();
// await db.dropDatabase();

import dotenv from 'dotenv';
dotenv.config({"quiet": true});

app.use('/public', express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(rewriteUnsupportedBrowserMethods);
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use((req, res, next) => {
  res.locals.isAdmin = false;
  res.locals.userId = '';
  const token = req.session && req.session.token ? req.session.token : '';
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded && decoded.isAdmin) res.locals.isAdmin = true;
    if (decoded && decoded.id) res.locals.userId = String(decoded.id);
  } catch (e) {
    // ignore invalid token here; auth middleware handles redirects
  }
  next();
});

app.use((req, res, next) => {
  const p = req.path || '';
  if (p === '/forum' || p.indexOf('/forum/') === 0) {
    console.log('[FORUM DEBUG] incoming', req.method, 'originalUrl=', req.originalUrl, 'path=', req.path, 'url=', req.url);
  }
  next();
});
// registerPartials()

// helpers,
// "shared/templates/",
const hbs = create({
	partialsDir: [
		"views/partials/",
	],
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', './views');

configRoutes(app);

app.listen(3000, () => {
  console.log("We've now got a server!");
  console.log('Your routes will be running on http://localhost:3000');
});