import { Router } from 'express';
import { authRedirectMW } from './middleware.js';
import { getAllPostsForDisplay, createPost, toggleLikePost, toggleDislikePost } from '../data/forum.js';

const router = Router();

const userIdFromSession = (req) => {
  let raw = '';
  if (req.user && req.user.id !== undefined && req.user.id !== null) raw = req.user.id;
  if (raw && typeof raw === 'object' && typeof raw.toString === 'function') return raw.toString();
  return String(raw);
};

const errorTextFromCatch = (e, fallback) => {
  if (e && e.message) return String(e.message);
  if (e) return String(e);
  return fallback;
};

router.get('/', authRedirectMW, async (req, res) => {
  console.log('[forum router GET /] reached — rendering forum page');
  let catagoryFilter = 'all';
  if (req.query.catagoryFilter) catagoryFilter = String(req.query.catagoryFilter).trim();
  let qText = '';
  if (req.query.q) qText = String(req.query.q).trim();
  let isAll = catagoryFilter === 'all';
  let isTennis = catagoryFilter === 'tennis';
  let isBasketball = catagoryFilter === 'basketball';
  let isHandball = catagoryFilter === 'handball';
  let isHiking = catagoryFilter === 'hiking';
  try {
    const posts = await getAllPostsForDisplay(catagoryFilter, qText);
    let error = null;
    if (req.query.error) error = String(req.query.error);
    res.render('forum', { layout: 'main.handlebars', posts, error, catagoryFilter, qText, isAll, isTennis, isBasketball, isHandball, isHiking });
  } catch (e) {
    res.status(500).render('forum', { layout: 'main.handlebars', posts: [], error: errorTextFromCatch(e, 'Could not load forum'), catagoryFilter, qText, isAll, isTennis, isBasketball, isHandball, isHiking });
  }
});

router.post('/:postId/like', authRedirectMW, async (req, res) => {
  try {
    await toggleLikePost(req.params.postId, userIdFromSession(req));
    return res.redirect(303, '/forum');
  } catch (e) {
    return res.redirect(303, '/forum?error=' + encodeURIComponent(errorTextFromCatch(e, 'Could not update like')));
  }
});

router.post('/:postId/dislike', authRedirectMW, async (req, res) => {
  try {
    await toggleDislikePost(req.params.postId, userIdFromSession(req));
    return res.redirect(303, '/forum');
  } catch (e) {
    return res.redirect(303, '/forum?error=' + encodeURIComponent(errorTextFromCatch(e, 'Could not update dislike')));
  }
});

export const forumCreatePost = async (req, res) => {
  console.log('[forumCreatePost] reached — app.post(/forum) handler');
  console.log('[forumCreatePost] body keys=', req.body && typeof req.body === 'object' ? Object.keys(req.body) : req.body);
  try {
    const { title, body, catagory } = req.body;
    await createPost(userIdFromSession(req), catagory, title, body);
    console.log('[forumCreatePost] createPost ok, redirect /forum');
    return res.redirect(303, '/forum');
  } catch (e) {
    console.log('[forumCreatePost] error', e && e.message ? e.message : String(e));
    return res.redirect(303, '/forum?error=' + encodeURIComponent(errorTextFromCatch(e, 'Could not create post')));
  }
};

export default router;
