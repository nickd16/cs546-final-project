import forumRoutes, { forumCreatePost } from './forum.js';
import locationRoutes from './location.js';
import reportRoutes from './report.js';
import userRoutes from './user.js';
import { authRedirectMW } from './middleware.js';
import {static as staticDir} from 'express';

const constructorMethod = (app) => {
  console.log('[routes] registering POST /forum (forumCreatePost), then USE /forum (forumRoutes)');
  app.use('/location', locationRoutes); // main location api
  app.post('/forum', authRedirectMW, forumCreatePost);
  app.use('/forum', forumRoutes);
  app.use('/report', reportRoutes);
  app.use('/', userRoutes); // user login and authentication routes // maybe I can put this on the main route otherwise /user
  app.use('/public', staticDir('public'));
  
  app.use('{*splat}', (req, res) => {
    console.log('[404 splat]', req.method, 'originalUrl=', req.originalUrl, 'path=', req.path, 'url=', req.url);
    res.status(404).json({error: 'Route Not found'});
    // res.status(404).render('error', {"error_text": "Route not found"});
  });
};

export default constructorMethod;