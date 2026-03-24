//here is where you'll set up your server as shown in lecture code.
import express from 'express';
import { engine } from 'express-handlebars';
const app = express();
import configRoutes from './routes/index.js';

app.use(express.json());
app.use(express.static("public"));

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

configRoutes(app);

app.listen(3000, () => {
  console.log("We've now got a server!");
  console.log('Your routes will be running on http://localhost:3000');
});