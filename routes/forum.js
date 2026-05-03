import { Router } from 'express';
import { authRedirectMW } from './middleware.js';
import {getAllPostsForDisplay, createPost, toggleLikePost, toggleDislikePost, deletePostByUser, addCommentToPost, toggleLikeComment, toggleDislikeComment, deleteCommentByUser, removeCommentSubtreeFromPost} from '../data/forum.js';
import { createForumPostReport, createForumCommentReport } from '../data/report.js';

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

const wantsJsonAjaxRequest = (req) => {
  const acc = req.get('Accept') || '';
  if (acc.includes('application/json')) return true;
  if (req.get('X-Requested-With') === 'XMLHttpRequest') return true;
  return false;
};

const forumListQueryHandler = async (req) => {
  let catagoryFilter = 'all';
  if (req.query.catagoryFilter) catagoryFilter = String(req.query.catagoryFilter).trim();
  let qText = '';
  if (req.query.q) qText = String(req.query.q).trim();
  let mine = false;
  if (req.query.mine) mine = true;
  const currentUserId = userIdFromSession(req);
  let onlyUserId = '';
  if (mine) onlyUserId = currentUserId;
  const posts = await getAllPostsForDisplay(catagoryFilter, qText, currentUserId, onlyUserId);
  const isAll = catagoryFilter === 'all';
  const isTennis = catagoryFilter === 'tennis';
  const isBasketball = catagoryFilter === 'basketball';
  const isHandball = catagoryFilter === 'handball';
  const isHiking = catagoryFilter === 'hiking';
  return { posts, catagoryFilter, qText, isAll, isTennis, isBasketball, isHandball, isHiking, mine };
};

router.get('/list-fragment', authRedirectMW, async (req, res) => {
  try {
    const { posts } = await forumListQueryHandler(req);
    return res.render('partials/forumPostsSection', { layout: false, posts });
  } catch (e) {
    return res.status(500).type('html').send('<p class="error">Could not load posts</p>');
  }
});

router.get('/', authRedirectMW, async (req, res) => {
  console.log('[forum router GET /] reached — rendering forum page');
  let catagoryFilter = 'all';
  let qText = '';
  let mine = false;
  let isAll = true;
  let isTennis = false;
  let isBasketball = false;
  let isHandball = false;
  let isHiking = false;
  try {
    const data = await forumListQueryHandler(req);
    catagoryFilter = data.catagoryFilter;
    qText = data.qText;
    mine = data.mine;
    isAll = data.isAll;
    isTennis = data.isTennis;
    isBasketball = data.isBasketball;
    isHandball = data.isHandball;
    isHiking = data.isHiking;
    const posts = data.posts;
    let error = null;
    if (req.query.error) error = String(req.query.error);
    res.render('forum', { layout: 'main.handlebars', title: "Forum", "loggedIn": req.user, posts, error, catagoryFilter, qText, isAll, isTennis, isBasketball, isHandball, isHiking, mine });
  } catch (e) {
    res.status(500).render('forum', { layout: 'main.handlebars', title: "Forum", "loggedIn": req.user, posts: [], error: errorTextFromCatch(e, 'Could not load forum'), catagoryFilter, qText, isAll, isTennis, isBasketball, isHandball, isHiking, mine });
  }
});

router.post('/:postId/comment/:commentId/like', authRedirectMW, async (req, res) => {
  try {
    await toggleLikeComment(req.params.postId, req.params.commentId, userIdFromSession(req));
    return res.redirect(303, '/forum');
  } catch (e) {
    return res.redirect(303, '/forum?error=' + encodeURIComponent(errorTextFromCatch(e, 'Could not update like')));
  }
});

router.post('/:postId/comment/:commentId/dislike', authRedirectMW, async (req, res) => {
  try {
    await toggleDislikeComment(req.params.postId, req.params.commentId, userIdFromSession(req));
    return res.redirect(303, '/forum');
  } catch (e) {
    return res.redirect(303, '/forum?error=' + encodeURIComponent(errorTextFromCatch(e, 'Could not update dislike')));
  }
});

router.post('/:postId/comment/:commentId/delete', authRedirectMW, async (req, res) => {
  try {
    await deleteCommentByUser(req.params.postId, req.params.commentId, userIdFromSession(req));
    return res.redirect(303, '/forum');
  } catch (e) {
    return res.redirect(303, '/forum?error=' + encodeURIComponent(errorTextFromCatch(e, 'Could not delete comment')));
  }
});

router.post('/:postId/comment/:commentId/report', authRedirectMW, async (req, res) => {
  try {
    const b = req.body || {};
    const { reason, description } = b;
    await createForumCommentReport(userIdFromSession(req), req.params.postId, req.params.commentId, reason, description);
    if (wantsJsonAjaxRequest(req)) {
      return res.json({ ok: true });
    }
    return res.redirect(303, '/forum');
  } catch (e) {
    const msg = errorTextFromCatch(e, 'Could not submit report');
    if (wantsJsonAjaxRequest(req)) {
      return res.status(400).json({ error: msg });
    }
    return res.redirect(303, '/forum?error=' + encodeURIComponent(msg));
  }
});

router.post('/:postId/comment', authRedirectMW, async (req, res) => {
  try {
    const b = req.body || {};
    let parentId = '';
    if (b.parentId) parentId = String(b.parentId).trim();
    const body = b.body;
    await addCommentToPost(req.params.postId, userIdFromSession(req), body, parentId);
    if (wantsJsonAjaxRequest(req)) {
      return res.json({ ok: true });
    }
    return res.redirect(303, '/forum');
  } catch (e) {
    const msg = errorTextFromCatch(e, 'Could not add comment');
    if (wantsJsonAjaxRequest(req)) {
      return res.status(400).json({ error: msg });
    }
    return res.redirect(303, '/forum?error=' + encodeURIComponent(msg));
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

router.post('/:postId/delete', authRedirectMW, async (req, res) => {
  try {
    await deletePostByUser(req.params.postId, userIdFromSession(req));
    return res.redirect(303, '/forum');
  } catch (e) {
    return res.redirect(303, '/forum?error=' + encodeURIComponent(errorTextFromCatch(e, 'Could not delete post')));
  }
});

router.post('/:postId/report', authRedirectMW, async (req, res) => {
  try {
    const b = req.body || {};
    const { reason, description } = b;
    await createForumPostReport(userIdFromSession(req), req.params.postId, reason, description);
    if (wantsJsonAjaxRequest(req)) {
      return res.json({ ok: true });
    }
    return res.redirect(303, '/forum');
  } catch (e) {
    const msg = errorTextFromCatch(e, 'Could not submit report');
    if (wantsJsonAjaxRequest(req)) {
      return res.status(400).json({ error: msg });
    }
    return res.redirect(303, '/forum?error=' + encodeURIComponent(msg));
  }
});

export const forumCreatePost = async (req, res) => {
  console.log('[forumCreatePost] reached — app.post(/forum) handler');
  let bodyKeys = req.body;
  if (req.body && typeof req.body === 'object') bodyKeys = Object.keys(req.body);
  console.log('[forumCreatePost] body keys=', bodyKeys);
  try {
    const { title, body, catagory } = req.body;
    await createPost(userIdFromSession(req), catagory, title, body);
    console.log('[forumCreatePost] createPost ok, redirect /forum');
    return res.redirect(303, '/forum');
  } catch (e) {
    let msg = String(e);
    if (e && e.message) msg = String(e.message);
    console.log('[forumCreatePost] error', msg);
    return res.redirect(303, '/forum?error=' + encodeURIComponent(errorTextFromCatch(e, 'Could not create post')));
  }
};

export default router;
