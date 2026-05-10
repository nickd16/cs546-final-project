import {Router} from 'express';
import {
  addLocationComment,
  addLocationRating,
  addLocationStatus,
  clearLocationStatusesByAdmin,
  createLocation,
  createOrJoinLocationTimeSlots,
  deleteLocationById,
  deleteLocationCommentByUser,
  toggleLikeLocationComment,
  toggleDislikeLocationComment,
  toggleLikeLocationRating,
  toggleDislikeLocationRating,
  deleteLocationRatingByUser,
  addLocationRatingReply,
  deleteLocationRatingReplyByUser,
  toggleLikeLocationRatingReply,
  toggleDislikeLocationRatingReply,
  deleteLocationStatusByUser,
  getFavoriteLocations,
  getLocationDetailsForDisplay,
  getNearbyLocationsForMap,
  toggleFavoriteLocationForUser,
  toggleJoinLocationTimeSlot,
  updateLocationById,
  voteOnLocationStatus
} from '../data/location.js';
import { createLocationCommentReport, createLocationPostReport, createLocationRatingReport, createLocationRatingReplyReport, createLocationStatusReport } from '../data/report.js';
import {authMW, authRedirectMW} from './middleware.js';
import { body, check, query, validationResult } from 'express-validator';
import { validateIdField } from '../helpers.js';

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

const locationTypes = ['all', 'basketball', 'handball', 'hiking', 'tennis'];

const locationValidationErrorText = (req) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;
  return errors.array()[0]['msg'];
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
      title: "Locations", 
      "loggedIn": req.user,
      mapLocationsJson: '[]',
      selectedLocationId,
      error,
      success
    });
  } catch (e) {
    res.status(500).render('location', {
      layout: 'main.handlebars',
      title: "Locations",
      "loggedIn": req.user,
      mapLocationsJson: '[]',
      selectedLocationId: '',
      error: errorTextFromCatch(e, 'Could not load locations'),
      success: null
    });
  }
});

router.get('/search/nearby', [authMW,
  query('latitude').notEmpty().withMessage('Latitude is required').custom(value => {
    const num = Number(value);
    if (Number.isNaN(num) || num < -90 || num > 90) throw Error('Latitude must be between -90 and 90');
    return true;
  }),
  query('longitude').notEmpty().withMessage('Longitude is required').custom(value => {
    const num = Number(value);
    if (Number.isNaN(num) || num < -180 || num > 180) throw Error('Longitude must be between -180 and 180');
    return true;
  }),
  query('radiusMiles').notEmpty().withMessage('Radius is required').custom(value => {
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) throw Error('Radius must be greater than 0');
    return true;
  }),
  query('locationTypeFilter').optional({values: 'falsy'}).custom(value => {
    const cleanValue = String(value).trim().toLowerCase();
    if (!locationTypes.includes(cleanValue)) throw Error('Location type filter is invalid');
    return true;
  }),
  query('q').optional({values: 'falsy'}).isString().withMessage('Search text must be a string')
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return res.status(400).json({error});
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

router.get('/favorites', authRedirectMW, async(req, res) => {
  try {
    const favoriteLocations = await getFavoriteLocations(userIdFromSession(req));

    return res.json(favoriteLocations);
  } catch (e) {
    return res.status(400).json({error: e});
  }
})

router.get('/:locationId', [authMW, check('locationId').notEmpty().custom(async value => {
  value = await validateIdField(value);
})], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return res.status(400).json({error});
    const locationDetails = await getLocationDetailsForDisplay(req.params.locationId, userIdFromSession(req));
    return res.json(locationDetails);
  } catch (e) {
    return res.status(400).json({error: errorTextFromCatch(e, 'Could not load location')});
  }
});

router.post('/create', [authRedirectMW,
  body('locationType').notEmpty().withMessage('Location type is required').custom(value => {
    const cleanValue = String(value).trim().toLowerCase();
    if (!locationTypes.includes(cleanValue) || cleanValue === 'all') throw Error('Location type is invalid');
    return true;
  }),
  body('locationName').notEmpty().withMessage('Location name is required'),
  body('description').optional({values: 'falsy'}).isString().withMessage('Description must be a string'),
  body('address').optional({values: 'falsy'}).isString().withMessage('Address must be a string'),
  body('latitude').optional({values: 'falsy'}).custom(value => {
    const num = Number(value);
    if (Number.isNaN(num) || num < -90 || num > 90) throw Error('Latitude must be between -90 and 90');
    return true;
  }),
  body('longitude').optional({values: 'falsy'}).custom(value => {
    const num = Number(value);
    if (Number.isNaN(num) || num < -180 || num > 180) throw Error('Longitude must be between -180 and 180');
    return true;
  }),
  body('numCourts').optional({values: 'falsy'}).custom(value => {
    const num = Number(value);
    if (Number.isNaN(num) || !Number.isInteger(num) || num < 0) throw Error('Number of courts must be a non-negative whole number');
    return true;
  }),
  body('indoorOutdoor').optional({values: 'falsy'}).isString().withMessage('Indoor or outdoor must be a string'),
  body('tennisType').optional({values: 'falsy'}).isString().withMessage('Tennis type must be a string'),
  body('length').optional({values: 'falsy'}).isString().withMessage('Length must be a string'),
  body('difficulty').optional({values: 'falsy'}).isString().withMessage('Difficulty must be a string'),
  body('otherDetails').optional({values: 'falsy'}).isString().withMessage('Other details must be a string'),
  body('limitedAccess').optional({values: 'falsy'}).isString().withMessage('Limited access must be a string')
], async (req, res) => {
  if (!requireAdminLocationAction(req, res)) return;
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, '', error, '');
    const createdLocation = await createLocation(req.body);
    return locationPageRedirect(res, createdLocation._id.toString(), '', 'Location created');
  } catch (e) {
    return locationPageRedirect(res, '', errorTextFromCatch(e, 'Could not create location'), '');
  }
});

router.post('/:locationId/update', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  body('locationType').notEmpty().withMessage('Location type is required').custom(value => {
    const cleanValue = String(value).trim().toLowerCase();
    if (!locationTypes.includes(cleanValue) || cleanValue === 'all') throw Error('Location type is invalid');
    return true;
  }),
  body('locationName').notEmpty().withMessage('Location name is required'),
  body('description').optional({values: 'falsy'}).isString().withMessage('Description must be a string'),
  body('address').optional({values: 'falsy'}).isString().withMessage('Address must be a string'),
  body('latitude').optional({values: 'falsy'}).custom(value => {
    const num = Number(value);
    if (Number.isNaN(num) || num < -90 || num > 90) throw Error('Latitude must be between -90 and 90');
    return true;
  }),
  body('longitude').optional({values: 'falsy'}).custom(value => {
    const num = Number(value);
    if (Number.isNaN(num) || num < -180 || num > 180) throw Error('Longitude must be between -180 and 180');
    return true;
  }),
  body('numCourts').optional({values: 'falsy'}).custom(value => {
    const num = Number(value);
    if (Number.isNaN(num) || !Number.isInteger(num) || num < 0) throw Error('Number of courts must be a non-negative whole number');
    return true;
  }),
  body('indoorOutdoor').optional({values: 'falsy'}).isString().withMessage('Indoor or outdoor must be a string'),
  body('tennisType').optional({values: 'falsy'}).isString().withMessage('Tennis type must be a string'),
  body('length').optional({values: 'falsy'}).isString().withMessage('Length must be a string'),
  body('difficulty').optional({values: 'falsy'}).isString().withMessage('Difficulty must be a string'),
  body('otherDetails').optional({values: 'falsy'}).isString().withMessage('Other details must be a string'),
  body('limitedAccess').optional({values: 'falsy'}).isString().withMessage('Limited access must be a string')
], async (req, res) => {
  if (!requireAdminLocationAction(req, res)) return;
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await updateLocationById(req.params.locationId, req.body);
    return locationPageRedirect(res, req.params.locationId, '', 'Location updated');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update location'), '');
  }
});

router.post('/:locationId/delete', [authRedirectMW, check('locationId').notEmpty().custom(async value => {
  value = await validateIdField(value);
})], async (req, res) => {
  if (!requireAdminLocationAction(req, res)) return;
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await deleteLocationById(req.params.locationId);
    return locationPageRedirect(res, '', '', 'Location deleted');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not delete location'), '');
  }
});

router.post('/:locationId/favorite', [authRedirectMW, check('locationId').notEmpty().custom(async value => {
  value = await validateIdField(value);
})], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    const isFavorite = await toggleFavoriteLocationForUser(req.params.locationId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', isFavorite ? 'Location added to favorites' : 'Location removed from favorites');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update favorite'), '');
  }
});

router.post('/:locationId/rating/:ratingId/like', [authRedirectMW,
  check('locationId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  check('ratingId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await toggleLikeLocationRating(req.params.locationId, req.params.ratingId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', '');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update like'), '');
  }
});

router.post('/:locationId/rating/:ratingId/dislike', [authRedirectMW,
  check('locationId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  check('ratingId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await toggleDislikeLocationRating(req.params.locationId, req.params.ratingId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', '');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update dislike'), '');
  }
});

router.post('/:locationId/rating/:ratingId/delete', [authRedirectMW,
  check('locationId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  check('ratingId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await deleteLocationRatingByUser(req.params.locationId, req.params.ratingId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', 'Rating removed');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not remove rating'), '');
  }
});

router.post('/:locationId/rating', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  body('score').notEmpty().withMessage('Rating score is required').custom(value => {
    const num = Number(value);
    if (Number.isNaN(num) || !Number.isInteger(num) || num < 1 || num > 5) throw Error('Rating score must be between 1 and 5');
    return true;
  }),
  body('review').notEmpty().withMessage('Review is required').isString().withMessage('Review must be a string')
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await addLocationRating(req.params.locationId, userIdFromSession(req), req.body.score, req.body.review);
    return locationPageRedirect(res, req.params.locationId, '', 'Rating saved');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not save rating'), '');
  }
});

router.post('/:locationId/comment', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  body('body').notEmpty().withMessage('Comment body is required').isString().withMessage('Comment body must be a string'),
  body('parentId').optional({values: 'falsy'}).custom(async value => {
    if (typeof value !== 'string') throw Error('Parent comment id must be a string');
    value = await validateIdField(value);
  })
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    let parentId = '';
    if (req.body.parentId) parentId = String(req.body.parentId).trim();
    await addLocationComment(req.params.locationId, userIdFromSession(req), req.body.body, parentId);
    return locationPageRedirect(res, req.params.locationId, '', 'Comment posted');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not post comment'), '');
  }
});

router.post('/:locationId/comment/:commentId/delete', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  check('commentId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  })
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await deleteLocationCommentByUser(req.params.locationId, req.params.commentId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', 'Comment removed');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not remove comment'), '');
  }
});

router.post('/:locationId/comment/:commentId/like', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  check('commentId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  })
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await toggleLikeLocationComment(req.params.locationId, req.params.commentId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', '');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update like'), '');
  }
});

router.post('/:locationId/comment/:commentId/dislike', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  check('commentId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  })
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await toggleDislikeLocationComment(req.params.locationId, req.params.commentId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', '');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update dislike'), '');
  }
});

router.post('/:locationId/report', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  body('reason').notEmpty().withMessage('Reason is required').isString().withMessage('Reason must be a string'),
  body('description').optional({values: 'falsy'}).isString().withMessage('Description must be a string')
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await createLocationPostReport(userIdFromSession(req), req.params.locationId, req.body.reason, req.body.description);
    return locationPageRedirect(res, req.params.locationId, '', 'Report submitted');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not submit report'), '');
  }
});

router.post('/:locationId/comment/:commentId/report', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  check('commentId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  body('reason').notEmpty().withMessage('Reason is required').isString().withMessage('Reason must be a string'),
  body('description').optional({values: 'falsy'}).isString().withMessage('Description must be a string')
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await createLocationCommentReport(userIdFromSession(req), req.params.locationId, req.params.commentId, req.body.reason, req.body.description);
    return locationPageRedirect(res, req.params.locationId, '', 'Report submitted');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not submit report'), '');
  }
});

router.post('/:locationId/rating/:ratingId/report', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  check('ratingId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  body('reason').notEmpty().withMessage('Reason is required').isString().withMessage('Reason must be a string'),
  body('description').optional({values: 'falsy'}).isString().withMessage('Description must be a string')
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await createLocationRatingReport(userIdFromSession(req), req.params.locationId, req.params.ratingId, req.body.reason, req.body.description);
    return locationPageRedirect(res, req.params.locationId, '', 'Report submitted');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not submit report'), '');
  }
});

router.post('/:locationId/rating/:ratingId/reply/:replyId/delete', [authRedirectMW,
  check('locationId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  check('ratingId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  check('replyId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await deleteLocationRatingReplyByUser(req.params.locationId, req.params.ratingId, req.params.replyId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', 'Reply removed');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not remove reply'), '');
  }
});

router.post('/:locationId/rating/:ratingId/reply/:replyId/like', [authRedirectMW,
  check('locationId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  check('ratingId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  check('replyId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await toggleLikeLocationRatingReply(req.params.locationId, req.params.ratingId, req.params.replyId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', '');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update like'), '');
  }
});

router.post('/:locationId/rating/:ratingId/reply/:replyId/dislike', [authRedirectMW,
  check('locationId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  check('ratingId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  check('replyId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await toggleDislikeLocationRatingReply(req.params.locationId, req.params.ratingId, req.params.replyId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', '');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update dislike'), '');
  }
});

router.post('/:locationId/rating/:ratingId/reply/:replyId/report', [authRedirectMW,
  check('locationId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  check('ratingId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  check('replyId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  body('reason').notEmpty().withMessage('Reason is required').isString().withMessage('Reason must be a string'),
  body('description').optional({values: 'falsy'}).isString().withMessage('Description must be a string'),
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await createLocationRatingReplyReport(
      userIdFromSession(req),
      req.params.locationId,
      req.params.ratingId,
      req.params.replyId,
      req.body.reason,
      req.body.description,
    );
    return locationPageRedirect(res, req.params.locationId, '', 'Report submitted');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not submit report'), '');
  }
});

router.post('/:locationId/rating/:ratingId/reply', [authRedirectMW,
  check('locationId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  check('ratingId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  body('body')
    .exists({values: 'falsy'})
    .withMessage('Reply body is required')
    .bail()
    .isString()
    .withMessage('Reply body must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Reply body is required'),
  body('parentId').optional({values: 'falsy'}).custom(async (value) => {
    if (value === undefined || value === null || value === '') return true;
    if (typeof value !== 'string') throw Error('Parent reply id must be a string');
    const t = value.trim();
    if (!t) return true;
    await validateIdField(t);
    return true;
  }),
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    let parentId = '';
    if (req.body.parentId !== undefined && req.body.parentId !== null) parentId = String(req.body.parentId).trim();
    await addLocationRatingReply(req.params.locationId, req.params.ratingId, userIdFromSession(req), req.body.body, parentId);
    return locationPageRedirect(res, req.params.locationId, '', 'Reply posted');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not post reply'), '');
  }
});

router.post('/:locationId/status/:statusId/report', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  check('statusId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  body('reason').notEmpty().withMessage('Reason is required').isString().withMessage('Reason must be a string'),
  body('description').optional({values: 'falsy'}).isString().withMessage('Description must be a string')
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await createLocationStatusReport(userIdFromSession(req), req.params.locationId, req.params.statusId, req.body.reason, req.body.description);
    return locationPageRedirect(res, req.params.locationId, '', 'Report submitted');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not submit report'), '');
  }
});

router.post('/:locationId/status', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  body('body').notEmpty().withMessage('Status update is required').isString().withMessage('Status update must be a string')
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await addLocationStatus(req.params.locationId, userIdFromSession(req), req.body.body);
    return locationPageRedirect(res, req.params.locationId, '', 'Status update posted');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not post status update'), '');
  }
});

router.post('/:locationId/status/:statusId/delete', [authRedirectMW,
  check('locationId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
  check('statusId').notEmpty().custom(async (value) => {
    await validateIdField(value);
  }),
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await deleteLocationStatusByUser(req.params.locationId, req.params.statusId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', 'Status update removed');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not remove status update'), '');
  }
});

router.post('/:locationId/status/:statusId/vote', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  check('statusId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  body('voteType').notEmpty().withMessage('Vote type is required').custom(value => {
    const cleanValue = String(value).trim();
    if (cleanValue !== 'agree' && cleanValue !== 'disagree') throw Error('Vote type is invalid');
    return true;
  })
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await voteOnLocationStatus(req.params.locationId, req.params.statusId, userIdFromSession(req), req.body.voteType);
    return locationPageRedirect(res, req.params.locationId, '', 'Status vote saved');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not save status vote'), '');
  }
});

router.post('/:locationId/status/clear', [authRedirectMW, check('locationId').notEmpty().custom(async value => {
  value = await validateIdField(value);
})], async (req, res) => {
  if (!requireAdminLocationAction(req, res)) return;
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await clearLocationStatusesByAdmin(req.params.locationId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', 'Statuses cleared');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not clear statuses'), '');
  }
});

router.post('/:locationId/timeslots/range', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  body('startDateTime').notEmpty().withMessage('Start date and time is required').isString().withMessage('Start date and time must be a string'),
  body('endDateTime').notEmpty().withMessage('End date and time is required').isString().withMessage('End date and time must be a string')
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await createOrJoinLocationTimeSlots(req.params.locationId, userIdFromSession(req), req.body.startDateTime, req.body.endDateTime);
    return locationPageRedirect(res, req.params.locationId, '', 'Time slots updated');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update time slots'), '');
  }
});

router.post('/:locationId/timeslot/:timeSlotId/toggle', [authRedirectMW,
  check('locationId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  }),
  check('timeSlotId').notEmpty().custom(async value => {
    value = await validateIdField(value);
  })
], async (req, res) => {
  try {
    const error = locationValidationErrorText(req);
    if (error) return locationPageRedirect(res, req.params.locationId, error, '');
    await toggleJoinLocationTimeSlot(req.params.locationId, req.params.timeSlotId, userIdFromSession(req));
    return locationPageRedirect(res, req.params.locationId, '', 'Time slot updated');
  } catch (e) {
    return locationPageRedirect(res, req.params.locationId, errorTextFromCatch(e, 'Could not update time slot'), '');
  }
});

export default router;
