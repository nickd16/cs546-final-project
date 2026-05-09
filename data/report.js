import { report } from '../config/mongoCollections.js';
import { forum } from '../config/mongoCollections.js';
import { location } from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';
import { validateIdField } from '../helpers.js';
import { getUserById } from './user.js';

const normalizeUserIdString = (userId) => {
  if (userId && typeof userId === 'object' && typeof userId.toString === 'function') return userId.toString();
  return String(userId);
};

const normalizeString = (s) => {
  if (typeof s !== 'string') return '';
  return s.trim();
};

const isMissingTargetError = (err) => {
  const message = err && err.message ? String(err.message) : String(err || '');
  return message === 'Post not found' || message === 'Comment not found' || message === 'Location not found';
};

/** Same rules as location `buildDateDisplay` / forum `buildForumDateDisplay` — for admin report list only. */
const buildReportDateDisplay = (value) => {
  let dateTimeISO = '';
  let dateTimeLabel = '';
  if (value instanceof Date) {
    dateTimeISO = value.toISOString();
    dateTimeLabel = value.toLocaleString();
  } else if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      dateTimeISO = parsed.toISOString();
      dateTimeLabel = parsed.toLocaleString();
    } else {
      dateTimeLabel = String(value);
    }
  }
  return { dateTimeISO, dateTimeLabel };
};

export const createForumPostReport = async (reporterUserId, postId, reason, description) => {
  const reporterIdStr = normalizeUserIdString(reporterUserId);
  await validateIdField(reporterIdStr);
  postId = await validateIdField(postId);

  reason = normalizeString(reason);
  description = normalizeString(description);
  if (!reason) throw new Error('Error: Select a reason,');
  if (reason !== 'spam' && reason !== 'harassment' && reason !== 'hate' && reason !== 'violence' && reason !== 'other') {
    throw new Error('Invalid report reason');
  }
  if (reason === 'other' && !description) throw new Error('Error: Enter a description,');
  if (description.length > 2000) throw new Error('Description too long');

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');

  const reportCollection = await report();

  const doc = {
    dateTimeCreated: new Date(),
    status: 'waiting',
    dateReviewedAt: null,
    forumOrLocation: 'forum',
    typeOfContent: 'post',
    userId: new ObjectId(reporterIdStr),
    contentId: new ObjectId(postId),
    locationOrForumId: new ObjectId(postId),
    reportReason: reason,
    body: description,
  };

  await reportCollection.insertOne(doc);
  return true;
};

const findCommentInPost = (post, commentIdStr) => {
  const list = post.commentList || [];
  const cid = new ObjectId(commentIdStr);
  for (let i = 0; i < list.length; i++) {
    if (list[i]._id && list[i]._id.equals(cid)) return list[i];
  }
  return null;
};

const findCommentInLocation = (loc, commentIdStr) => {
  const list = loc.commentList || [];
  const cid = new ObjectId(commentIdStr);
  for (let i = 0; i < list.length; i++) {
    if (list[i]._id && list[i]._id.equals(cid)) return list[i];
  }
  return null;
};

export const createForumCommentReport = async (reporterUserId, postId, commentId, reason, description) => {
  const reporterIdStr = normalizeUserIdString(reporterUserId);
  await validateIdField(reporterIdStr);
  postId = await validateIdField(postId);
  commentId = await validateIdField(commentId);

  reason = normalizeString(reason);
  description = normalizeString(description);
  if (!reason) throw new Error('Error: Select a reason,');
  if (reason !== 'spam' && reason !== 'harassment' && reason !== 'hate' && reason !== 'violence' && reason !== 'other') {
    throw new Error('Invalid report reason');
  }
  if (reason === 'other' && !description) throw new Error('Error: Enter a description,');
  if (description.length > 2000) throw new Error('Description too long');

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');

  const comment = findCommentInPost(post, commentId);
  if (!comment) throw new Error('Comment not found');

  const reportCollection = await report();

  const doc = {
    dateTimeCreated: new Date(),
    status: 'waiting',
    dateReviewedAt: null,
    forumOrLocation: 'forum',
    typeOfContent: 'comment',
    userId: new ObjectId(reporterIdStr),
    contentId: new ObjectId(commentId),
    locationOrForumId: new ObjectId(postId),
    reportReason: reason,
    body: description,
  };

  await reportCollection.insertOne(doc);
  return true;
};

<<<<<<< HEAD
export const getWaitingReportsForAdmin = async (adminUserId) => {
  const adminIdStr = normalizeUserIdString(adminUserId);
  await validateIdField(adminIdStr);
  const reportCollection = await report();
  const forumCollection = await forum();
  const locationCollection = await location();
=======
export const createLocationPostReport = async (reporterUserId, locationId, reason, description) => {
  const reporterIdStr = normalizeUserIdString(reporterUserId);
  await validateIdField(reporterIdStr);
  locationId = await validateIdField(locationId);

  reason = normalizeString(reason);
  description = normalizeString(description);
  if (!reason) throw new Error('Error: Select a reason,');
  if (reason !== 'spam' && reason !== 'harassment' && reason !== 'hate' && reason !== 'violence' && reason !== 'other') {
    throw new Error('Invalid report reason');
  }
  if (reason === 'other' && !description) throw new Error('Error: Enter a description,');
  if (description.length > 2000) throw new Error('Description too long');

  const { getLocationById } = await import('./location.js');
  await getLocationById(locationId);

  const reportCollection = await report();

  const doc = {
    dateTimeCreated: new Date(),
    status: 'waiting',
    dateReviewedAt: null,
    forumOrLocation: 'location',
    typeOfContent: 'post',
    userId: new ObjectId(reporterIdStr),
    contentId: new ObjectId(locationId),
    locationOrForumId: new ObjectId(locationId),
    reportReason: reason,
    body: description,
  };

  await reportCollection.insertOne(doc);
  return true;
};

export const createLocationCommentReport = async (reporterUserId, locationId, commentId, reason, description) => {
  const reporterIdStr = normalizeUserIdString(reporterUserId);
  await validateIdField(reporterIdStr);
  locationId = await validateIdField(locationId);
  commentId = await validateIdField(commentId);

  reason = normalizeString(reason);
  description = normalizeString(description);
  if (!reason) throw new Error('Error: Select a reason,');
  if (reason !== 'spam' && reason !== 'harassment' && reason !== 'hate' && reason !== 'violence' && reason !== 'other') {
    throw new Error('Invalid report reason');
  }
  if (reason === 'other' && !description) throw new Error('Error: Enter a description,');
  if (description.length > 2000) throw new Error('Description too long');

  const { getLocationById } = await import('./location.js');
  const loc = await getLocationById(locationId);
  const commentList = Array.isArray(loc.commentList) ? loc.commentList : [];
  const comment = commentList.find((entry) => entry && entry._id && entry._id.toString() === commentId);
  if (!comment) throw new Error('Comment not found');

  const reportCollection = await report();

  const doc = {
    dateTimeCreated: new Date(),
    status: 'waiting',
    dateReviewedAt: null,
    forumOrLocation: 'location',
    typeOfContent: 'comment',
    userId: new ObjectId(reporterIdStr),
    contentId: new ObjectId(commentId),
    locationOrForumId: new ObjectId(locationId),
    reportReason: reason,
    body: description,
  };

  await reportCollection.insertOne(doc);
  return true;
};

export const getWaitingReportsForAdmin = async () => {
  const reportCollection = await report();
  const forumCollection = await forum();
  const { getLocationById } = await import('./location.js');
>>>>>>> 25d9fca (feat: added reports to location page)
  const rows = await reportCollection.find({ status: 'waiting' }).sort({ dateTimeCreated: -1 }).toArray();
  let finalRows = [];
  for (let i = 0; i < rows.length; i++) {
    rows[i]._idStr = rows[i]._id.toString();
    const createdDisplay = buildReportDateDisplay(rows[i].dateTimeCreated);
    rows[i].dateTimeLabel = createdDisplay.dateTimeLabel;
    rows[i].dateTimeISO = createdDisplay.dateTimeISO;
    try {
      const u = await getUserById(rows[i].userId.toString());
      if (u && u.username) rows[i].username = u.username;
      else rows[i].username = 'Unknown';
    } catch (err) {
      rows[i].username = 'Unknown';
    }

    rows[i].reportedContentText = 'Reported content no longer available';
    rows[i].contentAreaLabel = rows[i].forumOrLocation === 'location' ? 'Location' : 'Forum';
    rows[i].contentTypeLabel = rows[i].typeOfContent === 'comment' ? 'Comment' : 'Post';
    rows[i].acceptLabel = rows[i].typeOfContent === 'comment'
      ? 'Accept and delete comment'
      : (rows[i].forumOrLocation === 'location' ? 'Accept and delete location' : 'Accept and delete post');
    try {
      if (rows[i].forumOrLocation === 'forum' && rows[i].typeOfContent === 'post' && rows[i].contentId) {
        const post = await forumCollection.findOne({ _id: new ObjectId(rows[i].contentId.toString()) });
        if (post) {
          const titleText = typeof post.title === 'string' ? post.title.trim() : '';
          const bodyText = typeof post.body === 'string' ? post.body.trim() : '';
          if (titleText && bodyText) rows[i].reportedContentText = titleText + '\n\n' + bodyText;
          else if (titleText) rows[i].reportedContentText = titleText;
          else if (bodyText) rows[i].reportedContentText = bodyText;
        }
<<<<<<< HEAD
      } else if (rows[i].typeOfContent === 'comment' && rows[i].locationOrForumId && rows[i].contentId) {
        if (rows[i].forumOrLocation === 'forum') {
          const post = await forumCollection.findOne({ _id: new ObjectId(rows[i].locationOrForumId.toString()) });
          if (post) {
            const comment = findCommentInPost(post, rows[i].contentId.toString());
            if (comment) {
              if (typeof comment.body === 'string' && comment.body.trim()) {
                rows[i].reportedContentText = comment.body.trim();
              }
            }
=======
      } else if (rows[i].forumOrLocation === 'forum' && rows[i].typeOfContent === 'comment' && rows[i].locationOrForumId && rows[i].contentId) {
        const post = await forumCollection.findOne({ _id: new ObjectId(rows[i].locationOrForumId.toString()) });
        if (post) {
          const comment = findCommentInPost(post, rows[i].contentId.toString());
          if (comment && typeof comment.body === 'string' && comment.body.trim()) {
            rows[i].reportedContentText = comment.body.trim();
>>>>>>> 25d9fca (feat: added reports to location page)
          }
          else {
            // does not exist, reject the report automatically
            await rejectReport(rows[i]._idStr, adminIdStr);
            continue;
          }
        } else if (rows[i].forumOrLocation === 'location') {
          const loc = await locationCollection.findOne({ _id: new ObjectId(rows[i].locationOrForumId.toString()) });
          if (loc) {
            const comment = findCommentInLocation(loc, rows[i].contentId.toString());
            if (comment) {
               if (typeof comment.body === 'string' && comment.body.trim()) {
                rows[i].reportedContentText = comment.body.trim();
              }
            }
          }
          else {
            // does not exist, reject the report 
            await rejectReport(rows[i]._idStr, adminIdStr);
            continue;
          }   
        }
      } else if (rows[i].forumOrLocation === 'location' && rows[i].typeOfContent === 'post' && rows[i].contentId) {
        const loc = await getLocationById(rows[i].contentId.toString());
        if (loc) {
          const nameText = typeof loc.locationName === 'string' ? loc.locationName.trim() : '';
          const addressText = typeof loc.address === 'string' ? loc.address.trim() : '';
          const descriptionText = typeof loc.description === 'string' ? loc.description.trim() : '';
          const locationText = [nameText, addressText, descriptionText].filter(Boolean).join('\n\n');
          if (locationText) rows[i].reportedContentText = locationText;
        }
      } else if (rows[i].forumOrLocation === 'location' && rows[i].typeOfContent === 'comment' && rows[i].locationOrForumId && rows[i].contentId) {
        const loc = await getLocationById(rows[i].locationOrForumId.toString());
        if (loc && Array.isArray(loc.commentList)) {
          const comment = loc.commentList.find((entry) => entry && entry._id && entry._id.toString() === rows[i].contentId.toString());
          if (comment && typeof comment.body === 'string' && comment.body.trim()) {
            rows[i].reportedContentText = comment.body.trim();
          }
        }
      }
      finalRows.push(rows[i]);
    } catch (err) {
      rows[i].reportedContentText = 'Reported content no longer available';
    }
  }
  return finalRows;
};

export const acceptReport = async (reportId, adminUserId) => {
  reportId = await validateIdField(reportId);
  const adminIdStr = normalizeUserIdString(adminUserId);
  await validateIdField(adminIdStr);

  const reportCollection = await report();
  const r = await reportCollection.findOne({ _id: new ObjectId(reportId) });
  if (!r) throw new Error('Report not found');
  if (r.status !== 'waiting') throw new Error('Report already reviewed');
  if (r.forumOrLocation !== 'forum' && r.forumOrLocation !== 'location') throw new Error('Unsupported report type');

  if (r.forumOrLocation === 'forum') {
    if (r.typeOfContent === 'post') {
      const postId = r.contentId.toString();
      const forumCollection = await forum();
      try {
        const del = await forumCollection.deleteOne({ _id: new ObjectId(postId) });
        if (del.deletedCount === 0) throw new Error('Post not found');
      } catch (err) {
        if (!isMissingTargetError(err)) throw err;
      }
    } else if (r.typeOfContent === 'comment') {
      if (!r.locationOrForumId) throw new Error('Report missing post id');
      if (!r.contentId) throw new Error('Report missing comment id');
      const postId = r.locationOrForumId.toString();
      const commentId = r.contentId.toString();
      const { removeCommentSubtreeFromPost } = await import('./forum.js');
      try {
        await removeCommentSubtreeFromPost(postId, commentId);
      } catch (err) {
        if (!isMissingTargetError(err)) throw err;
      }
    } else {
      throw new Error('Unsupported report type');
    }
  } else if (r.forumOrLocation === 'location') {
    if (r.typeOfContent === 'post') {
      const { deleteLocationById } = await import('./location.js');
      try {
        await deleteLocationById(r.contentId.toString());
      } catch (err) {
        if (!isMissingTargetError(err)) throw err;
      }
    } else if (r.typeOfContent === 'comment') {
      if (!r.locationOrForumId) throw new Error('Report missing location id');
      if (!r.contentId) throw new Error('Report missing comment id');
      const { deleteLocationCommentByUser } = await import('./location.js');
      try {
        await deleteLocationCommentByUser(r.locationOrForumId.toString(), r.contentId.toString(), adminIdStr);
      } catch (err) {
        if (!isMissingTargetError(err)) throw err;
      }
    } else {
      throw new Error('Unsupported report type');
    }
  } else {
    throw new Error('Unsupported report type');
  }

  await reportCollection.updateOne(
    { _id: new ObjectId(reportId) },
    { $set: { status: 'accepted', dateReviewedAt: new Date(), reviewedByAdminUserId: new ObjectId(adminIdStr) } },
  );
  return true;
};

export const acceptForumPostReportAndDeletePost = acceptReport;

export const rejectReport = async (reportId, adminUserId) => {
  reportId = await validateIdField(reportId);
  const adminIdStr = normalizeUserIdString(adminUserId);
  await validateIdField(adminIdStr);

  const reportCollection = await report();
  const r = await reportCollection.findOne({ _id: new ObjectId(reportId) });
  if (!r) throw new Error('Report not found');
  if (r.status !== 'waiting') throw new Error('Report already reviewed');

  await reportCollection.updateOne(
    { _id: new ObjectId(reportId) },
    { $set: { status: 'rejected', dateReviewedAt: new Date(), reviewedByAdminUserId: new ObjectId(adminIdStr) } },
  );
  return true;
};
