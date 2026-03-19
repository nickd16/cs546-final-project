import forumRoutes from './forum.js';
import locationRoutes from './location.js';
import userRoutes from './user.js';

const constructorMethod = (app) => {
  app.use('/location', locationRoutes); // main location api
  app.use('/forum', forumRoutes); // additional user forum api
  app.use('/', userRoutes); // user login and authentication routes // maybe I can put this on the main route otherwise /user

  app.use('{*splat}', (req, res) => {
    res.status(404).json({error: 'Route Not found'});
  });
};

export default constructorMethod;