import { Router } from 'express';
import { authRedirectMW } from './middleware.js';
import { getWaitingReportsForAdmin, acceptForumPostReportAndDeletePost, rejectReport } from '../data/report.js';

const router = Router();

const userIdFromSession = (req) => {
  let raw = '';
  if (req.user && req.user.id !== undefined && req.user.id !== null) raw = req.user.id;
  if (raw && typeof raw === 'object' && typeof raw.toString === 'function') return raw.toString();
  return String(raw);
};

const requireAdminPage = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) return res.status(403).render('report', { layout: 'main.handlebars', postReports: [], commentReports: [], error: 'Admin access required' });
  next();
};

router.get('/', authRedirectMW, requireAdminPage, async (req, res) => {
  try {
    const reports = await getWaitingReportsForAdmin();
    const postReports = [];
    const commentReports = [];
    for (let i = 0; i < reports.length; i++) {
      const r = reports[i];
      if (r.typeOfContent === 'post') postReports.push(r);
      else if (r.typeOfContent === 'comment') commentReports.push(r);
    }
    res.render('report', { layout: 'main.handlebars', postReports, commentReports, error: null });
  } catch (e) {
    let msg = String(e);
    if (e && e.message) msg = String(e.message);
    res.status(500).render('report', { layout: 'main.handlebars', postReports: [], commentReports: [], error: msg });
  }
});

router.post('/:reportId/accept', authRedirectMW, requireAdminPage, async (req, res) => {
  try {
    await acceptForumPostReportAndDeletePost(req.params.reportId, userIdFromSession(req));
    return res.redirect(303, '/report');
  } catch (e) {
    let msg = String(e);
    if (e && e.message) msg = String(e.message);
    return res.redirect(303, '/report?error=' + encodeURIComponent(msg));
  }
});

router.post('/:reportId/reject', authRedirectMW, requireAdminPage, async (req, res) => {
  try {
    await rejectReport(req.params.reportId, userIdFromSession(req));
    return res.redirect(303, '/report');
  } catch (e) {
    let msg = String(e);
    if (e && e.message) msg = String(e.message);
    return res.redirect(303, '/report?error=' + encodeURIComponent(msg));
  }
});

export default router;

