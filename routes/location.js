import {Router} from 'express';
import {
  addLocationComment,
  addLocationRating,
  addLocationStatus,
  clearLocationStatusesByAdmin,
  createLocation,
  createOrJoinLocationTimeSlots,
  deleteLocationById,
  deleteLocationCommentByAdmin,
  getLocationDetailsForDisplay,
  getNearbyLocationsForMap,
  toggleFavoriteLocationForUser,
  toggleJoinLocationTimeSlot,
  updateLocationById,
  voteOnLocationStatus
} from '../data/location.js';
import {authMW, authRedirectMW} from './middleware.js';

const router = Router();

const userIdFromSession = (req) => {
  let raw = '';
  if (req.user && req.user.id !== undefined && req.user.id !== null) raw = req.user.id;
  if (raw && typeof raw === 'object' && typeof raw.toString === 'function') return raw.toString();
  return String(raw || '');
};

const errorTextFromCatch = (e, fallback) => {
  if (e && e.message) return String(e.message);
  if (e) return String(e);
  return fallback;
};

const locationPageRedirect = (res, locationId, error, success) => {
  let url = '/location';
  const parts = [];
  if (locationId) parts.push('selectedLocationId=' + encodeURIComponent(locationId));
  if (error) parts.push('error=' + encodeURIComponent(error));
  if (success) parts.push('success=' + encodeURIComponent(success));
  if (parts.length) url += '?' + parts.join('&');
  return res.redirect(303, url);
};

const requireAdminLocationAction = (req, res) => {
  if (!req.user || !req.user.isAdmin) {
    locationPageRedirect(res, req.params.locationId || '', 'Admin access required', '');
    return false;
  }
  return true;
};

router.get('/', authRedirectMW, async (req, res) => {
  try {
    const selectedLocationId = req.query.selectedLocationId ? String(req.query.selectedLocationId) : '';
    let error = null;
    if (req.query.error) error = String(req.query.error);
    let success = null;
    if (req.query.success) success = String(req.query.success);

    res.render('location', {
      layout: 'main.handlebars',
      mapLocationsJson: '[]',
      selectedLocationId,
      error,
      success
    });
  } catch (e) {
    res.status(500).render('location', {
      layout: 'main.handlebars',
      mapLocationsJson: '[]',
      selectedLocationId: '',
      error: errorTextFromCatch(e, 'Could not load locations'),
      success: null
    });
  }
});

router.get('/search/nearby', authMW, async (req, res) => {
  try {
    const latitude = req.query.latitude;
    const longitude = req.query.longitude;
    const radiusMiles = req.query.radiusMiles;
    const locationTypeFilter = req.query.locationTypeFilter ? String(req.query.locationTypeFilter) : 'all';
    const q = req.query.q ? String(req.query.q) : '';
    const locations = await getNearbyLocationsForMap(latitude, longitude, radiusMiles, locationTypeFilter, q, userIdFromSession(req));
    return res.json(locations);
  } catch (e) {
    return res.status(400).json({error: errorTextFromCatch(e, 'Could not load nearby locations')});
  }
});

router.get('/:locationId', authMW, async (req, res) => {
  try {
    const locationDetails = await getLocationDetailsForDisplay(req.params.locationId, userIdFromSession(req));
    return res.json(locationDetails);
  } catch (e) {
    return res.status(400).json({error: errorTextFromCatch(e, 'Could not load location')});
  }
});

router.post('/create', authRedirectMW, async (req, res) => {
  if (!requireAdminLocationAction(req, res)) return;
  try {
    const createdLocation = await createLocation(req.body);
    return locationPageRedirect(res, createdLocation._id.toString(), '', 'Location created');
  } catch (e) {
    return locationPageRedirect(res, '', errorTextFromCatch(e, 'Could not create location'), '');
  }
});

router.post('/:locationId/update', authRedirectMW, async (req, res) => {
  if (!requireAdminLocationAction(req, res)) return;
  try {
    await updateLocationById(req.params.locationId, req.body);
    return locationPageRedirect(res, req.params.locationId, '', 'Location updated');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update location'), '');
  }
});

router.post('/:locationId/delete', authRedirectMW, async (req, res) => {
  if (!requireAdminLocationAction(req, res)) return;
  try {
    await deleteLocationById(req.params.locationId);
    return locationPageRedirect(res, '', '', 'Location deleted');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not delete location'), '');
  }
});

router.post('/:locationId/favorite', authRedirectMW, async (req, res) => {
  try {
    const isFavorite = await toggleFavoriteLocationForUser(req.params.locationId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', isFavorite ? 'Location added to favorites' : 'Location removed from favorites');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update favorite'), '');
  }
});

router.post('/:locationId/rating', authRedirectMW, async (req, res) => {
  try {
    await addLocationRating(req.params.locationId, userIdFromSession(req), req.body.score, req.body.review);
    return locationPageRedirect(res, req.params.locationId, '', 'Rating saved');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not save rating'), '');
  }
});

router.post('/:locationId/comment', authRedirectMW, async (req, res) => {
  try {
    await addLocationComment(req.params.locationId, userIdFromSession(req), req.body.body);
    return locationPageRedirect(res, req.params.locationId, '', 'Comment posted');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not post comment'), '');
  }
});

router.post('/:locationId/comment/:commentId/delete', authRedirectMW, async (req, res) => {
  if (!requireAdminLocationAction(req, res)) return;
  try {
    await deleteLocationCommentByAdmin(req.params.locationId, req.params.commentId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', 'Comment removed');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not remove comment'), '');
  }
});

router.post('/:locationId/status', authRedirectMW, async (req, res) => {
  try {
    await addLocationStatus(req.params.locationId, userIdFromSession(req), req.body.body);
    return locationPageRedirect(res, req.params.locationId, '', 'Status update posted');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not post status update'), '');
  }
});

router.post('/:locationId/status/:statusId/vote', authRedirectMW, async (req, res) => {
  try {
    await voteOnLocationStatus(req.params.locationId, req.params.statusId, userIdFromSession(req), req.body.voteType);
    return locationPageRedirect(res, req.params.locationId, '', 'Status vote saved');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not save status vote'), '');
  }
});

router.post('/:locationId/status/clear', authRedirectMW, async (req, res) => {
  if (!requireAdminLocationAction(req, res)) return;
  try {
    await clearLocationStatusesByAdmin(req.params.locationId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', 'Statuses cleared');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not clear statuses'), '');
  }
});

router.post('/:locationId/timeslots/range', authRedirectMW, async (req, res) => {
  try {
    await createOrJoinLocationTimeSlots(req.params.locationId, userIdFromSession(req), req.body.startDateTime, req.body.endDateTime);
    return locationPageRedirect(res, req.params.locationId, '', 'Time slots updated');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update time slots'), '');
  }
});

router.post('/:locationId/timeslot/:timeSlotId/toggle', authRedirectMW, async (req, res) => {
  try {
    await toggleJoinLocationTimeSlot(req.params.locationId, req.params.timeSlotId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', 'Time slot updated');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update time slot'), '');
  }
});

export default router;
