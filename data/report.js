import { report } from '../config/mongoCollections.js';
import { forum } from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';
import { validateIdField } from '../helpers.js';
import { getUserById } from "./user.js";

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
  const bodyLines = [];
  bodyLines.push('Reason: ' + reason);
  if (description) bodyLines.push('Description: ' + description);

  const doc = {
    dateTimeCreated: new Date(),
    reviewed: false,
    status: 'waiting',
    dateReviewedAt: null,
    forumOrLocation: 'forum',
    typeOfContent: 'post',
    userId: new ObjectId(reporterIdStr),
    contentId: new ObjectId(postId),
    locationOrForumId: new ObjectId(postId),
    reportReason: reason,
    reportDescription: description,
    body: bodyLines.join('\n'),
  };

  await reportCollection.insertOne(doc);
  return true;
};

export const getWaitingReportsForAdmin = async () => {
  const reportCollection = await report();
  return reportCollection.find({ status: 'waiting' }).map(async (reqEntry) => {
      reqEntry["username"] = (await getUserById(reqEntry["userId"].toString()))["username"]; // Give the front end usernames to render
      return reqEntry;
    }).sort({ dateTimeCreated: -1 }).toArray();
};

export const acceptForumPostReportAndDeletePost = async (reportId, adminUserId) => {
  reportId = await validateIdField(reportId);
  const adminIdStr = normalizeUserIdString(adminUserId);
  await validateIdField(adminIdStr);

  const reportCollection = await report();
  const r = await reportCollection.findOne({ _id: new ObjectId(reportId) });
  if (!r) throw new Error('Report not found');
  if (r.status !== 'waiting') throw new Error('Report already reviewed');
  if (r.forumOrLocation !== 'forum' || r.typeOfContent !== 'post') throw new Error('Unsupported report type');

  const postId = r.contentId.toString();
  let reason = '';
  if (r.reportReason) reason = String(r.reportReason);
  if (!reason) reason = 'violating rules';
  const shortReason = reason;
  const title = 'Post deleted by admin for: ' + shortReason;

  const forumCollection = await forum();
  await forumCollection.updateOne(
    { _id: new ObjectId(postId) },
    { $set: { isDeleted: true, deletedAt: new Date(), deletedByAdminUserId: new ObjectId(adminIdStr), deletedReasonShort: shortReason, title, body: title } },
  );

  await reportCollection.updateOne(
    { _id: new ObjectId(reportId) },
    { $set: { reviewed: true, status: 'accepted', dateReviewedAt: new Date(), reviewedByAdminUserId: new ObjectId(adminIdStr) } },
  );
  return true;
};

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
    { $set: { reviewed: true, status: 'rejected', dateReviewedAt: new Date(), reviewedByAdminUserId: new ObjectId(adminIdStr) } },
  );
  return true;
};

