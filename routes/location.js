import {Router} from 'express';
import { getAllLocationsForMap } from '../data/location.js';
import { authMW, authRedirectMW} from './middleware.js';

const router = Router();

// HTML page
// GET /location/
router
  .route('/')
  .get(authRedirectMW, async (req, res) => {
    try {
      const mapLocations = await getAllLocationsForMap('all', '');
      res.render('location', {
        layout: 'main.handlebars',
        mapLocationsJson: JSON.stringify(mapLocations)
      });
    } catch (e) {
      res.status(500).render('location', {
        layout: 'main.handlebars',
        mapLocationsJson: '[]',
        error: e && e.message ? e.message : String(e)
      });
    }
   });


export default router;
