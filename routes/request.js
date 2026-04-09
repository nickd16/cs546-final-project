import { Router } from 'express';
import { authRedirectMW } from './middleware.js';
import { acceptLocationRequest, getWaitingRequestsForAdmin, rejectLocationRequest } from '../data/request.js';

const router = Router();

const userIdFromSession = (req) => {
  let raw = '';
  if (req.user && req.user.id !== undefined && req.user.id !== null) raw = req.user.id;
  if (raw && typeof raw === 'object' && typeof raw.toString === 'function') return raw.toString();
  return String(raw);
};

const requireAdminPage = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) return res.status(403).render('request', { layout: 'main.handlebars', locationRequests: [], error: 'Admin access required' });
  next();
};

router.get('/', authRedirectMW, requireAdminPage, async (req, res) => {
  try {
    const requests = await getWaitingRequestsForAdmin();
    
    res.render('request', { layout: 'main.handlebars', locationRequests: requests, error: null });
  } catch (e) {
    let msg = String(e);
    if (e && e.message) msg = String(e.message);
    res.status(500).render('request', { layout: 'main.handlebars', locationRequests: [], error: msg });
  }
});

router.post('/:requestId/reject', authRedirectMW, requireAdminPage, async (req, res) => {
  try {
    await rejectLocationRequest(req.params.requestId, userIdFromSession(req));
    return res.redirect(303, '/request');
  } catch (e) {
    let msg = String(e);
    if (e && e.message) msg = String(e.message);
    return res.redirect(303, '/request?error=' + encodeURIComponent(msg));
  }
});

router.post('/:requestId/accept', authRedirectMW, requireAdminPage, async (req, res) => {
  try {
    await acceptLocationRequest(req.params.requestId, userIdFromSession(req));
    return res.redirect(303, '/request');
  } catch (e) {
    let msg = String(e);
    if (e && e.message) msg = String(e.message);
    return res.redirect(303, '/request?error=' + encodeURIComponent(msg));
  }
});


export default router;

