import { report } from '../config/mongoCollections.js';
import { forum } from '../config/mongoCollections.js';
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

export const createForumPostReport = async (reporterUserId, postId, reason, description) => {
  const reporterIdStr = normalizeUserIdString(reporterUserId);
  await validateIdField(reporterIdStr);
  postId = await validateIdField(postId);

  reason = normalizeString(reason);
  description = normalizeString(description);
  if (!reason) throw new Error('Report reason is required');
  if (reason !== 'spam' && reason !== 'harassment' && reason !== 'hate' && reason !== 'violence' && reason !== 'other') {
    throw new Error('Invalid report reason');
  }
  if (reason === 'other' && !description) throw new Error('Description is required for "other"');
  if (description.length > 2000) throw new Error('Description too long');

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');
  if (post.isDeleted) throw new Error('Cannot report a deleted post');

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

export const createForumCommentReport = async (reporterUserId, postId, commentId, reason, description) => {
  const reporterIdStr = normalizeUserIdString(reporterUserId);
  await validateIdField(reporterIdStr);
  postId = await validateIdField(postId);
  commentId = await validateIdField(commentId);

  reason = normalizeString(reason);
  description = normalizeString(description);
  if (!reason) throw new Error('Report reason is required');
  if (reason !== 'spam' && reason !== 'harassment' && reason !== 'hate' && reason !== 'violence' && reason !== 'other') {
    throw new Error('Invalid report reason');
  }
  if (reason === 'other' && !description) throw new Error('Description is required for "other"');
  if (description.length > 2000) throw new Error('Description too long');

  const forumCollection = await forum();
  const post = await forumCollection.findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error('Post not found');
  if (post.isDeleted) throw new Error('Cannot report on a deleted post');

  const comment = findCommentInPost(post, commentId);
  if (!comment) throw new Error('Comment not found');
  if (comment.isDeleted) throw new Error('Cannot report a deleted comment');

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

export const getWaitingReportsForAdmin = async () => {
  const reportCollection = await report();
  const rows = await reportCollection.find({ status: 'waiting' }).sort({ dateTimeCreated: -1 }).toArray();
  for (let i = 0; i < rows.length; i++) {
    rows[i]._idStr = rows[i]._id.toString();
    try {
      const u = await getUserById(rows[i].userId.toString());
      if (u && u.username) rows[i].username = u.username;
      else rows[i].username = 'Unknown';
    } catch (err) {
      rows[i].username = 'Unknown';
    }
  }
  return rows;
};

export const acceptReport = async (reportId, adminUserId) => {
  reportId = await validateIdField(reportId);
  const adminIdStr = normalizeUserIdString(adminUserId);
  await validateIdField(adminIdStr);

  const reportCollection = await report();
  const r = await reportCollection.findOne({ _id: new ObjectId(reportId) });
  if (!r) throw new Error('Report not found');
  if (r.status !== 'waiting') throw new Error('Report already reviewed');
  if (r.forumOrLocation !== 'forum') throw new Error('Unsupported report type');

  if (r.typeOfContent === 'post') {
    const postId = r.contentId.toString();
    const forumCollection = await forum();
    const del = await forumCollection.deleteOne({ _id: new ObjectId(postId) });
    if (del.deletedCount === 0) throw new Error('Post not found');
  } else if (r.typeOfContent === 'comment') {
    if (!r.locationOrForumId) throw new Error('Report missing post id');
    if (!r.contentId) throw new Error('Report missing comment id');
    const postId = r.locationOrForumId.toString();
    const commentId = r.contentId.toString();
    const { removeCommentSubtreeFromPost } = await import('./forum.js');
    await removeCommentSubtreeFromPost(postId, commentId);
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
